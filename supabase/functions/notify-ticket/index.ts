import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

serve(async (req) => {
  try {
    const { record } = await req.json()
    
    // Só notifica se for Alta ou Urgente
    if (record.priority === 'alta' || record.priority === 'urgente') {
      const { data, error } = await resend.emails.send({
        from: 'FishMap Suporte <onboarding@resend.dev>',
        to: ['renatinho@exemplo.com', 'thais@exemplo.com'], // O usuário deve trocar pelos emails reais
        subject: `🚨 PRIORIDADE ${record.priority.toUpperCase()}: ${record.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #ef4444;">Novo Ticket de Alta Prioridade</h2>
            <p>Um novo ticket foi aberto com prioridade máxima.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Assunto:</strong> ${record.subject}</p>
            <p><strong>Categoria:</strong> ${record.category}</p>
            <p><strong>Descrição:</strong></p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; font-style: italic;">
              ${record.description}
            </div>
            ${record.attachment_url ? `<p><a href="${record.attachment_url}">Ver Anexo</a></p>` : ''}
            <div style="margin-top: 30px;">
              <a href="https://fishmap.vercel.app/admin/tickets" style="background: #00d4aa; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Abrir Painel de Gestão
              </a>
            </div>
          </div>
        `,
      })
      
      if (error) throw error
      return new Response(JSON.stringify({ success: true, data }), { status: 200 })
    }

    return new Response(JSON.stringify({ message: "Notificação não enviada (prioridade baixa)" }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
