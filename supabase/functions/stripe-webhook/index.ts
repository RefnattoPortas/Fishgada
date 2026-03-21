import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  try {
    const body = await req.text();

    // 1. VALIDAR ASSINATURA DO WEBHOOK (segurança crítica)
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err: any) {
      console.error("⚠️ Assinatura do webhook inválida:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`✅ Evento recebido: ${event.type}`);

    // 2. PROCESSAR EVENTOS
    switch (event.type) {
      // ================================
      // CHECKOUT COMPLETADO COM SUCESSO
      // ================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan || "pro";
        const interval = session.metadata?.interval || "month";

        if (!userId) {
          console.error("❌ user_id não encontrado nos metadata da sessão");
          break;
        }

        console.log(`🎣 Processando pagamento para user: ${userId}, plano: ${plan}, intervalo: ${interval}`);

        // Determinar o tier baseado no plano
        const tier = plan === "partner" ? "partner" : "pro";

        // Calcular data de expiração baseada no intervalo
        const days = interval === "year" ? 366 : 31;
        const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        // Atualizar o perfil do usuário com o novo tier
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: tier,
            stripe_customer_id: session.customer as string,
          })
          .eq("id", userId);

        if (profileError) {
          console.error("❌ Erro ao atualizar perfil:", profileError);
        } else {
          console.log(`✅ Perfil atualizado para tier: ${tier}`);
        }

        // Criar/atualizar registro de assinatura
        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan: plan,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(), // +30 dias
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });

        if (subError) {
          console.error("❌ Erro ao criar assinatura:", subError);
        }

        // Se for plano Partner, ativar o pesqueiro
        if (plan === "partner") {
          console.log("🏢 Ativando pesqueiro do parceiro...");

          // Encontrar o pesqueiro vinculado ao usuário
          // O pesqueiro está vinculado via spot_id -> spots.user_id
          const { data: resorts, error: resortError } = await supabaseAdmin
            .from("fishing_resorts")
            .select("id, spot_id, spots!inner(user_id)")
            .eq("spots.user_id", userId);

          if (resortError) {
            console.error("❌ Erro ao buscar pesqueiro:", resortError);
          } else if (resorts && resorts.length > 0) {
            // Ativar todos os pesqueiros do usuário
            for (const resort of resorts) {
              const { error: activateError } = await supabaseAdmin
                .from("fishing_resorts")
                .update({
                  is_active: true,
                  is_partner: true,
                  active_until: new Date(
                    Date.now() + 365 * 24 * 60 * 60 * 1000
                  ).toISOString(), // +1 ano
                })
                .eq("id", resort.id);

              if (activateError) {
                console.error(`❌ Erro ao ativar resort ${resort.id}:`, activateError);
              } else {
                console.log(`✅ Pesqueiro ${resort.id} ativado até ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}`);
              }
            }
          } else {
            console.log("⚠️ Nenhum pesqueiro encontrado para este usuário");
          }
        }

        break;
      }

      // ================================
      // ASSINATURA CANCELADA
      // ================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log(`🔴 Cancelando assinatura do user: ${userId}`);

          // Rebaixar para free
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_tier: "free" })
            .eq("id", userId);

          // Atualizar status da assinatura
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          // Desativar pesqueiro se for partner
          const { data: resorts } = await supabaseAdmin
            .from("fishing_resorts")
            .select("id, spots!inner(user_id)")
            .eq("spots.user_id", userId);

          if (resorts) {
            for (const resort of resorts) {
              await supabaseAdmin
                .from("fishing_resorts")
                .update({ is_active: false, is_partner: false })
                .eq("id", resort.id);
            }
          }
        }
        break;
      }

      // ================================
      // PAGAMENTO FALHOU
      // ================================
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Buscar o user pelo stripe_customer_id
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", profile.id);
        }
        break;
      }

      default:
        console.log(`ℹ️ Evento não tratado: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("💥 Erro no webhook:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 500 });
  }
});
