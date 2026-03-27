'use client'

import { useState, useEffect } from 'react'
import { Crown, Sparkles, Fish, X, CheckCircle2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface WelcomeOverlayProps {
  onClose: () => void
}

export default function WelcomeOverlay({ onClose }: WelcomeOverlayProps) {
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ is_first_login: false } as any)
          .eq('id', user.id)
      }
      onClose()
    } catch (err) {
      console.error('Erro ao marcar primeiro login:', err)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-2xl p-8 md:p-12 glass shadow-[0_0_100px_rgba(0,255,255,0.2)] rounded-[40px] border border-cyan-500/30 text-center overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/20 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full animate-pulse decoration-1000" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-2xl shadow-cyan-500/40 rotate-12">
            <Fish size={56} className="animate-bounce" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-tight">
              Opa! Que bom ter você no <span className="text-cyan-400">Fishgada</span>.
            </h1>
            <p className="text-xl text-gray-400 font-medium max-w-md mx-auto">
              Sua jornada para a elite da pesca esportiva começa agora.
            </p>
          </div>

          <div className="w-full p-6 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 my-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="text-cyan-400 animate-pulse" size={24} />
              <h2 className="text-2xl font-black text-white uppercase tracking-widest">Presente de Boas-Vindas</h2>
              <Sparkles className="text-cyan-400 animate-pulse" size={24} />
            </div>
            
            <p className="text-lg font-bold text-gray-300">
              Liberamos <span className="text-cyan-400 text-2xl">3 MESES DE CONTA PRO</span> para você experimentar tudo o que o Fishgada tem a oferecer!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
            {[
              { title: 'Radar de Iscas', desc: 'Descubra qual isca está batendo agora.' },
              { title: 'Mapas Offline', desc: 'Navegue sem sinal de internet.' },
              { title: 'Pontos Secretos', desc: 'Acesse os locais preservados.' },
              { title: 'Histórico Completo', desc: 'Analise suas métricas de pesca.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 items-start p-3 rounded-2xl bg-white/5 border border-white/5">
                <CheckCircle2 size={18} className="text-cyan-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">{item.title}</h4>
                  <p className="text-[10px] text-gray-500 font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleStart}
            disabled={loading}
            className="w-full mt-6 btn-primary py-6 text-lg font-black uppercase tracking-[0.4em] shadow-[0_0_50px_rgba(0,255,255,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 bg-cyan-500 hover:bg-cyan-400 text-dark"
          >
            {loading ? 'Preparando rede...' : 'Bora pescar!'}
          </button>
        </div>
      </div>
    </div>
  )
}
