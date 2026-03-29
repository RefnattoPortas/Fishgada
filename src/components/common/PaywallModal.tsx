'use client'

import { X, Crown, Zap, Map, FileBarChart, Download, Sparkles, CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
}

// ======================================================
// ESTRATÉGIA DE PRECIFICAÇÃO FISHGADA (Rebranding + Trial)
// ======================================================
const PLANS = {
  pro: {
    name: 'Pescador Pro',
    monthly: { id: 'price_PRO_MONTHLY', price: 15.00, label: 'R$ 15,00/mês', discount: undefined as string | undefined },
    annual: { id: 'price_PRO_ANNUAL', price: 35.00, label: 'R$ 35,00/ano', discount: '80% OFF' as string | undefined },
    plan: 'pro',
    badge: 'Melhor Valor'
  },
  partner: {
    name: 'Pesqueiro Parceiro',
    monthly: { id: 'price_PARTNER_MONTHLY', price: 50.00, label: 'R$ 50,00/mês', discount: undefined as string | undefined },
    annual: { id: 'price_PARTNER_ANNUAL', price: 99.00, label: 'R$ 99,00/ano', discount: '6 meses Grátis' as string | undefined },
    plan: 'partner',
    badge: 'Destaque'
  },
}

export default function PaywallModal({ isOpen, onClose, featureName }: PaywallModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'partner'>('pro')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')

  if (!isOpen) return null

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getSession()
      
      const session = data?.session
      
      if (!session || typeof session === 'string') {
        alert('Você precisa estar logado para assinar.')
        setLoading(false)
        return
      }

      const planData = PLANS[selectedPlan]
      const cycleData = billingCycle === 'monthly' ? planData.monthly : planData.annual

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            priceId: cycleData.id,
            plan: planData.plan,
          }),
        }
      )

      const dataJson = await response.json()

      if (dataJson.url) {
        window.location.href = dataJson.url
      } else {
        alert('Erro ao iniciar pagamento: ' + (dataJson.error || 'Tente novamente.'))
      }
    } catch (err: any) {
      console.error('Erro no checkout:', err)
      alert('Erro ao conectar com o gateway de pagamento.')
    } finally {
      setLoading(false)
    }
  }

  const currentPlan = PLANS[selectedPlan]
  const currentPrice = billingCycle === 'monthly' ? currentPlan.monthly : currentPlan.annual

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg glass-elevated border-2 border-accent/30 rounded-[40px] md:rounded-[60px] shadow-[0_0_120px_rgba(0,212,170,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Banner de Presente de Lançamento */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 py-3 text-center animate-pulse">
           <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.2em] flex items-center justify-center gap-2">
              🎁 PRESENTE DE LANÇAMENTO: Ganhe 3 meses de acesso TOTAL GRÁTIS!
           </p>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-14 right-6 md:top-18 md:right-10 text-gray-500 hover:text-white transition-colors z-30 bg-[#0a0f1a]/50 p-1 rounded-full border border-white/5"
        >
          <X size={24} />
        </button>

        {/* Scrollable Content */}
        <div className="p-8 md:p-12 pt-4 md:pt-6 text-center space-y-8 md:space-y-10 overflow-y-auto custom-scrollbar overflow-x-hidden">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
               <div className="w-24 h-24 rounded-[40%] bg-accent flex items-center justify-center text-dark shadow-2xl shadow-accent/40 animate-pulse">
                  <Crown size={48} />
               </div>
               <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center border-4 border-[#0a0f1a]">
                  <Sparkles size={14} className="text-white" />
               </div>
            </div>
            
            <div className="space-y-2">
               <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
                  A Elite do <span className="text-accent underline decoration-4 underline-offset-4">Fishgada</span>
               </h2>
               <p className="text-gray-400 font-medium">
                  Domine as águas com a maior plataforma de pesca do Brasil.
               </p>
            </div>
          </div>

          {/* Toggle de Faturamento */}
          <div className="flex justify-center">
            <div className="bg-white/5 p-1.5 rounded-3xl border border-white/5 flex gap-1">
               <button 
                 onClick={() => setBillingCycle('monthly')}
                 className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500'}`}
               >
                 Mensal
               </button>
               <button 
                 onClick={() => setBillingCycle('annual')}
                 className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${billingCycle === 'annual' ? 'bg-accent text-dark shadow-xl' : 'text-gray-500'}`}
               >
                 Anual
                 <div className="absolute -top-3 -right-2 px-2 py-0.5 bg-indigo-500 text-white text-[8px] rounded-full ring-2 ring-[#0a0f1a]">Melhor Escolha</div>
               </button>
            </div>
          </div>

          {/* Seleção de Plano */}
          <div className="grid grid-cols-2 gap-4">
            {(['pro', 'partner'] as const).map((key) => {
              const p = PLANS[key]
              const priceData = billingCycle === 'monthly' ? p.monthly : p.annual
              const active = selectedPlan === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`p-6 rounded-[32px] border-2 transition-all text-left relative overflow-hidden group ${
                    active 
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/20 shadow-2xl shadow-accent/10' 
                      : 'border-white/5 hover:border-white/10 glass'
                  }`}
                >
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${active ? 'text-accent' : 'text-gray-500'}`}>{p.name}</p>
                  <p className="text-2xl font-black text-white">{priceData.label.split('/')[0]}</p>
                  <p className="text-[10px] text-gray-500 font-bold">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</p>
                  
                  {billingCycle === 'annual' && priceData.discount && (
                    <div className="mt-3 inline-block px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black text-accent uppercase tracking-wider group-hover:bg-accent/10 transition-colors">
                      {priceData.discount}
                    </div>
                  )}

                  {active && <CheckCircle2 className="absolute top-4 right-4 text-accent" size={16} />}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
             {[
                { title: 'Heatmap de Atividade', desc: 'Veja onde as feras estão batendo agora.', icon: Zap },
                { title: 'Offline Pro Mode', desc: 'Acesse o mapa e registre capturas sem sinal.', icon: Download },
                { title: 'Relatórios Geográficos', desc: 'Métricas avançadas das melhores iscas p/ local.', icon: FileBarChart },
                { title: 'Vaga Prioritária', desc: '15min de vantagem em novos torneios.', icon: Map },
             ].map((feat) => (
                <div key={feat.title} className="flex gap-4 p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-accent/20 transition-all group">
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-accent group-hover:bg-accent/10 transition-colors">
                      <feat.icon size={20} />
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">{feat.title}</h4>
                      <p className="text-[11px] text-gray-500 font-medium">{feat.desc}</p>
                   </div>
                   <CheckCircle2 size={16} className="ml-auto text-accent opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                </div>
             ))}
          </div>

          <div className="pt-6 space-y-4">
             <button 
               onClick={handleCheckout}
               disabled={loading}
               className="w-full btn-primary py-6 text-sm font-black uppercase tracking-[0.4em] shadow-2xl shadow-accent/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal"
             >
               {loading ? (
                 <>
                   <Loader2 size={20} className="animate-spin" />
                   Conectando ao Gateway...
                 </>
               ) : (
                 <>Assinar {currentPlan.name} — {currentPrice.label.split('/')[0]}</>
               )}
             </button>
             <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
               Pagamento seguro via Stripe · Cancele quando quiser
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
