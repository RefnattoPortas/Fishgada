'use client'

import Sidebar from '@/components/layout/Sidebar'
import { BookOpen, Fish, Calendar, MapPin, History, Sparkles } from 'lucide-react'

export default function LogbookPage() {
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
        <div className="max-w-4xl mx-auto h-full flex flex-col justify-center items-center space-y-8 fade-in">
          
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full" />
            <div className="relative w-32 h-32 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center text-accent shadow-2xl">
              <BookOpen size={64} strokeWidth={1.5} />
            </div>
          </div>

          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-4xl font-black text-white tracking-tight uppercase italic">Diário de Pesca</h1>
            <p className="text-gray-400 font-bold text-sm tracking-wide">
              Em breve: Sua própria enciclopédia de pescarias. Guardaremos cada batida, cada isca e cada história vivida no WikiFish.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-8">
            {[
              { icon: History, label: 'Histórico Completo', desc: 'Revenda suas capturas com fotos e datas.' },
              { icon: MapPin, label: 'Mapa de Calor', desc: 'Descubra onde estão seus pontos mais produtivos.' },
              { icon: Sparkles, label: 'Estatísticas', desc: 'Analise seu aproveitamento por lua e maré.' },
            ].map((feature) => (
              <div key={feature.label} className="glass p-6 rounded-3xl border border-white/5 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mx-auto">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-white font-black text-xs uppercase tracking-widest">{feature.label}</h3>
                <p className="text-gray-500 text-[10px] leading-relaxed font-bold">{feature.desc}</p>
              </div>
            ))}
          </div>

          <button 
            disabled
            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black text-xs uppercase tracking-[0.3em] cursor-not-allowed"
          >
            Módulo em desenvolvimento
          </button>

        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>
    </div>
  )
}
