'use client'

import { useState } from 'react'
import { 
  Map, Fish, Shield, Zap, 
  Smartphone, Database, Users, ArrowRight,
  CheckCircle2, Store, Sparkles, Instagram,
  Play, Smartphone as Mobile
} from 'lucide-react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const [leadForm, setLeadForm] = useState({ name: '', resortName: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await (supabase
        .from('resort_leads' as any) as any)
        .insert([{
          owner_name: leadForm.name,
          resort_name: leadForm.resortName,
          phone: leadForm.phone,
          status: 'new'
        }])
      if (!error) setSent(true)
    } catch (err) {
      console.error('Erro ao enviar lead:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Header */}
      <nav className="fixed top-0 w-full z-[1000] bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center">
             <img src="/images/logo.png" alt="Fishgada" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-black italic tracking-tighter">
            FISH<span className="text-cyan-400">GADA</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest">Funcionalidades</a>
          <a href="#pricing" className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest">Planos</a>
          <a href="#leads" className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest">Para Pesqueiros</a>
        </div>

        <button 
          onClick={onEnterApp}
          className="bg-cyan-500 hover:bg-cyan-400 text-dark px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,212,170,0.3)] transition-all active:scale-95"
        >
          Entrar no App
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 flex flex-col items-center text-center overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
          <div className="absolute top-20 left-0 w-64 h-64 bg-cyan-500 blur-[120px] rounded-full" />
          <div className="absolute top-40 right-0 w-64 h-64 bg-orange-500 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0a0f1a]/80 backdrop-blur-xl border border-cyan-500/50 shadow-[0_0_30px_rgba(0,255,255,0.2)] mb-8 relative overflow-hidden group animate-bounce-slow">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="text-xl">🎁</span>
            <p className="text-[10px] md:text-sm font-black text-white uppercase tracking-[0.2em]">
              <span className="text-cyan-400">Presente de Lançamento:</span> Ganhe 3 meses de acesso TOTAL GRÁTIS!
            </p>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8">
            A Elite da <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-gradient-x">Pesca Esportiva</span>
          </h1>
          
          <p className="max-w-xl mx-auto text-gray-400 text-lg md:text-xl font-medium mb-12">
            O primeiro ecossistema digital que conecta pescadores, pesqueiros e a emoção da captura em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onEnterApp}
              className="w-full sm:w-auto px-10 py-5 bg-cyan-500 hover:bg-cyan-400 text-[#0a0f1a] font-black uppercase tracking-[0.2em] rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(0,212,170,0.4)] flex items-center justify-center gap-3"
            >
              Começar Agora <ArrowRight size={20} />
            </button>
            <Link href="/login" className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3">
              Já sou membro
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 md:px-12 bg-[#0a0f1a]">
        <div className="max-w-6xl mx-auto text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">Tecnologia pro seu Radar</h2>
          <div className="h-1 w-24 bg-cyan-500 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: Map, color: 'text-cyan-400', title: 'Mapa Interativo', desc: 'Pontos públicos, comunitários e exclusivos com detalhes de estrutura.' },
            { icon: Zap, color: 'text-orange-500', title: 'Ação em Tempo Real', desc: 'Saiba o que está batendo e onde, através dos destaques dos pesqueiros.' },
            { icon: Shield, color: 'text-blue-500', title: 'Preservação', desc: 'Incentivo ao Pesque e Solte com rankings de verificação por imagem.' },
            { icon: Database, color: 'text-purple-500', title: 'Modo Offline', desc: 'Sincronização inteligente: pesque com ou sem sinal de internet.' },
          ].map((feature, i) => (
            <div key={i} className="bg-white/5 p-8 rounded-[32px] border border-white/5 hover:border-cyan-500/30 transition-all hover:translate-y-[-8px] group">
              <div className={`w-14 h-14 rounded-2xl bg-[#0F172A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                <feature.icon size={28} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-3">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 md:px-12 bg-[#0F172A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">Escolha seu Nível</h2>
            <p className="text-gray-500 uppercase tracking-widest text-xs font-black">Planos de Assinatura</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Pescador */}
            <div className="bg-white/5 p-10 rounded-[40px] border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Fish size={100} className="text-cyan-400" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-2">Pescador Pro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-gray-400 text-lg">R$</span>
                <span className="text-5xl font-black italic">15</span>
                <span className="text-gray-500">/mês</span>
              </div>
              <ul className="space-y-4 mb-10">
                {['Radar de Capturas em tempo real', 'Mapas Offline ilimitados', 'Acesso a Pontos Comunitários', 'Badges e Ranking Exclusivo'].map(li => (
                  <li key={li} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 size={18} className="text-cyan-400 flex-shrink-0" /> {li}
                  </li>
                ))}
              </ul>
              <button onClick={onEnterApp} className="w-full py-4 border border-white/10 hover:border-cyan-400 hover:bg-cyan-500 hover:text-[#0a0f1a] transition-all rounded-2xl font-black uppercase tracking-widest text-xs translate-z-0">
                Assinar Pro
              </button>
            </div>

            {/* Pesqueiro */}
            <div className="bg-white/5 p-10 rounded-[40px] border border-orange-500/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Store size={100} className="text-orange-500" />
              </div>
              <div className="absolute top-6 left-6 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-orange-500/40 px-3 py-1 rounded-full">Negócios</div>
              <h3 className="text-2xl font-black uppercase mb-2 mt-8 text-orange-500">Pesqueiro Parceiro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-gray-400 text-lg">R$</span>
                <span className="text-5xl font-black italic">50</span>
                <span className="text-gray-500">/mês</span>
              </div>
              <ul className="space-y-4 mb-10">
                {['Painel Adm do Pesqueiro', 'Botão "Destaque do Dia"', 'Gestão de Mural (Avisos)', 'Fundo Personalizado e Fotos', 'Rankings Locais Exclusivos'].map(li => (
                  <li key={li} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 size={18} className="text-orange-500 flex-shrink-0" /> {li}
                  </li>
                ))}
              </ul>
              <a href="#leads" className="block w-full text-center py-4 bg-orange-500 text-[#0a0f1a] hover:bg-orange-400 transition-all rounded-2xl font-black uppercase tracking-widest text-xs">
                Cadastrar Pesqueiro
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture */}
      <section id="leads" className="py-24 px-6 md:px-12 bg-[#0a0f1a] relative">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
           <div>
              <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-6 leading-[0.9]">
                Seja um Pesqueiro <br />
                <span className="text-orange-500">Destaque</span>
              </h2>
              <p className="text-gray-400 text-lg font-medium leading-relaxed mb-8">
                Divulgue seu estabelecimento para milhares de pescadores. Mostre o que está saindo em tempo real e crie autoridade com seu próprio mural e rankings.
              </p>
           </div>

           <div className="bg-white/5 p-10 rounded-[40px] border border-white/10 shadow-2xl">
              {sent ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-cyan-400" size={40} />
                  </div>
                  <h3 className="text-2xl font-black uppercase mb-2">Solicitação Enviada!</h3>
                  <p className="text-gray-400 font-medium">Nossa equipe entrará em contato em breve.</p>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleLeadSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2 mb-2 block">Nome do Responsável</label>
                      <input 
                        className="w-full bg-[#0F172A] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                        placeholder="Ex: João da Silva"
                        required
                        value={leadForm.name}
                        onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2 mb-2 block">Nome do Pesqueiro</label>
                      <input 
                        className="w-full bg-[#0F172A] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                        placeholder="Ex: Pesqueiro do Lago Azul"
                        required
                        value={leadForm.resortName}
                        onChange={e => setLeadForm(f => ({ ...f, resortName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2 mb-2 block">WhatsApp de Contato</label>
                      <input 
                        className="w-full bg-[#0F172A] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                        placeholder="(00) 00000-0000"
                        required
                        value={leadForm.phone}
                        onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-orange-500 hover:bg-orange-400 text-[#0a0f1a] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all text-sm"
                  >
                    {loading ? 'Enviando...' : 'Quero ser Parceiro'}
                  </button>
                </form>
              )}
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 md:px-12 border-t border-white/5 bg-[#0a0f1a]">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <div className="flex flex-col items-center gap-6 mb-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center">
                 <img src="/images/logo.png" alt="Fishgada" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-black italic tracking-tighter">
                FISH<span className="text-cyan-400">GADA</span>
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 mb-12">
            <Link href="/termos" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-cyan-400 transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-cyan-400 transition-colors">Política de Privacidade</Link>
            <Link href="/responsabilidade" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-cyan-400 transition-colors">Termo de Responsabilidade</Link>
            <a href="mailto:contato@fishgada.com.br" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-cyan-400 transition-colors">Suporte</a>
          </div>

          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-[0.3em]">
            © 2026 Fishgada — A Elite da Pesca Esportiva. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
