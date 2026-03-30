'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Prevent showing banner multiple times across sessions if dismissed
    if (typeof window !== 'undefined' && localStorage.getItem('pwa_banner_dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Display if user is on mobile
      if (window.innerWidth <= 768) {
         setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa_banner_dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none">
      <div className="pointer-events-auto bg-[#0a0f1a]/95 backdrop-blur-xl border-t border-accent/30 rounded-t-3xl sm:rounded-3xl shadow-[0_-5px_30px_rgba(0,212,170,0.15)] flex flex-col p-5 gap-4 relative w-full mb-safe sm:mb-0">
        <button 
          onClick={handleDismiss} 
          className="absolute -top-3 right-4 w-8 h-8 rounded-full bg-dark text-gray-400 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          <X size={14} />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/20 rounded-2xl border border-accent/40 flex items-center justify-center shrink-0">
             <Download className="text-accent" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-black text-[14px] uppercase tracking-wider mb-1">Fishgada no Celular</h3>
            <p className="text-gray-400 text-[10px] leading-tight max-w-[200px]">Instale o Fishgada no seu celular para uma experiência completa.</p>
          </div>
        </div>

        <button 
          onClick={handleInstallClick}
          className="w-full bg-accent text-dark py-3 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_15px_rgba(0,212,170,0.3)]"
        >
          Instalar Agora
        </button>
      </div>
    </div>
  )
}
