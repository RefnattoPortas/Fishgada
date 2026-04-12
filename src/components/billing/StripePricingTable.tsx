'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { CheckCircle2, Zap, Store, Loader2, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_1TL9Bp8iUeqXANSvGTTJZrap';
const PARTNER_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER || 'price_1TL9En8iUeqXANSv16GIRBIT';

const plans = [
  {
    id: 'pro',
    name: 'Fishgada Pro',
    priceId: PRO_PRICE_ID,
    price: 'R$ 29,90',
    period: '/ano',
    description: 'Para o pescador que quer levar sua pesca ao próximo nível.',
    icon: Zap,
    color: 'from-cyan-500 to-blue-600',
    borderColor: 'border-cyan-500/30',
    glowColor: 'shadow-cyan-500/20',
    features: [
      'Spots ilimitados no mapa',
      'Registro de capturas avançado',
      'Análise de clima e condições em tempo real',
      'Álbum de espécies completo',
      'Sem anúncios',
      'Acesso antecipado a novas features',
    ],
  },
  {
    id: 'partner',
    name: 'Pesqueiro Parceiro',
    priceId: PARTNER_PRICE_ID,
    price: 'R$ 49,90',
    period: '/ano',
    description: 'Para pesqueiros que querem visibilidade e novos clientes.',
    icon: Store,
    color: 'from-amber-400 to-orange-500',
    borderColor: 'border-amber-500/30',
    glowColor: 'shadow-amber-500/20',
    badge: 'Mais Popular',
    features: [
      'Tudo do plano Pro',
      'Perfil de Pesqueiro destacado no mapa',
      'Painel de gestão do estabelecimento',
      'Cadastro de torneios e eventos',
      'Quadro de avisos para pescadores',
      'Fotos e galeria do pesqueiro',
      'Relatório de visitantes mensais',
    ],
  },
];

export default function StripePricingTable() {
  const [user, setUser] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleCheckout = async (priceId: string, planId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoadingPlan(planId);
    setError(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar sessão de pagamento.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setLoadingPlan(null);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Trial badge */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <Star size={14} className="text-emerald-400" />
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
            45 dias grátis em qualquer plano
          </span>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col p-5 text-left rounded-2xl border bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/8 hover:scale-[1.02] ${plan.borderColor} shadow-xl ${plan.glowColor}`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max whitespace-nowrap z-10">
                  <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-full shadow-lg">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.color} bg-opacity-20 flex-shrink-0`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <h3 className="text-white font-black text-base leading-tight">{plan.name}</h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-5">
                <span className={`text-2xl sm:text-3xl font-black whitespace-nowrap bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                  {plan.price}
                </span>
                <span className="text-slate-500 text-xs font-medium whitespace-nowrap">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-left">
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-xs leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleCheckout(plan.priceId, plan.id)}
                disabled={!!loadingPlan}
                className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider text-white transition-all duration-300 bg-gradient-to-r ${plan.color} hover:opacity-90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Começar Grátis →'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-slate-600 text-xs">
        Cancele quando quiser • Pagamento seguro via Stripe • Sem cobrança nos primeiros 45 dias
      </p>
    </div>
  );
}
