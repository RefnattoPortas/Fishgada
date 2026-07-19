'use client'

import { useState, useEffect } from 'react'
import { Compass, X, Fish, MapPin, Plus } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

interface MapOnboardingProps {
  onComplete: () => void
}

export default function MapOnboarding({ onComplete }: MapOnboardingProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const dismissed = localStorage.getItem('fishgada_map_onboarding_dismissed')
    if (dismissed === 'true') {
      setVisible(false)
      onComplete()
    }
  }, [onComplete])

  const handleDismiss = () => {
    localStorage.setItem('fishgada_map_onboarding_dismissed', 'true')
    setVisible(false)
    trackEvent('onboarding_completed')
    onComplete()
  }

  const handleSkip = () => {
    localStorage.setItem('fishgada_map_onboarding_dismissed', 'true')
    setVisible(false)
    trackEvent('onboarding_dismissed')
    onComplete()
  }

  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-[950] pointer-events-none"
      role="region"
      aria-label="Bem-vindo ao mapa"
    >
      {/* Overlay semi-transparente nas bordas */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Destaques visuais com setas */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div
          className="px-5 py-3 rounded-2xl shadow-2xl text-center"
          style={{
            background: 'rgba(15,24,41,0.95)',
            border: '1px solid rgba(0,212,170,0.3)',
            maxWidth: 320,
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Compass size={18} className="text-cyan-400" />
            <span className="text-sm font-black text-white tracking-tight">
              Explore o Mapa
            </span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Encontre locais de pesca, filtre por espécie e registre suas capturas.
          </p>

          {/* Hint points */}
          <div className="mt-3 space-y-1.5 text-left">
            <div className="flex items-start gap-2 text-[10px] text-gray-500">
              <span className="text-cyan-400 font-bold flex-shrink-0">1.</span>
              <span>Use os <strong className="text-white">filtros</strong> para encontrar o local ideal</span>
            </div>
            <div className="flex items-start gap-2 text-[10px] text-gray-500">
              <span className="text-cyan-400 font-bold flex-shrink-0">2.</span>
              <span>Toque nos <strong className="text-white">marcadores</strong> para ver detalhes</span>
            </div>
            <div className="flex items-start gap-2 text-[10px] text-gray-500">
              <span className="text-cyan-400 font-bold flex-shrink-0">3.</span>
              <span>Use o botão <strong className="text-white"><Fish size={10} className="inline" /> +</strong> para registrar capturas</span>
            </div>
            <div className="flex items-start gap-2 text-[10px] text-gray-500">
              <span className="text-cyan-400 font-bold flex-shrink-0">4.</span>
              <span>Toque em <strong className="text-white"><MapPin size={10} className="inline" /></strong> para adicionar pontos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Setas visuais apontando para controles */}
      <div className="absolute bottom-24 left-6 z-10 animate-bounce pointer-events-none">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Zoom</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 12L3 6h10L8 12z" fill="#00d4aa" />
          </svg>
        </div>
      </div>

      <div className="absolute bottom-24 right-24 z-10 animate-bounce pointer-events-none" style={{ animationDelay: '0.3s' }}>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest whitespace-nowrap">Captura +</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 12L3 6h10L8 12z" fill="#00d4aa" />
          </svg>
        </div>
      </div>

      <div className="absolute bottom-24 right-[76px] z-10 animate-bounce pointer-events-none" style={{ animationDelay: '0.6s' }}>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest whitespace-nowrap">Adicionar</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 12L3 6h10L8 12z" fill="#00d4aa" />
          </svg>
        </div>
      </div>

      {/* Botões */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-3 pointer-events-auto">
        <button
          onClick={handleSkip}
          className="px-5 py-2.5 rounded-xl text-[11px] font-bold text-gray-400 hover:text-white transition-colors"
          aria-label="Dispensar tutorial"
        >
          Pular
        </button>
        <button
          onClick={handleDismiss}
          className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
          style={{
            background: 'linear-gradient(135deg, #00d4aa, #00a88a)',
            color: '#000',
            boxShadow: '0 0 20px rgba(0,212,170,0.3)',
          }}
          aria-label="Entendi, começar a explorar"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
