'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Fish, MapPin, Scale, Calendar, Trophy, Image as ImageIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Carregamento dinâmico do Modal para não pesar o bundle inicial
const TrophyCardModal = dynamic(() => import('@/components/social/TrophyCardModal'), { ssr: false })

export default function CapturesPage() {
  const [captures, setCaptures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedSpotForTrophy, setSelectedSpotForTrophy] = useState<any>(null)

  useEffect(() => {
    const fetchCaptures = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      setUser(user)

      if (user) {
        // Busca as capturas do usuário com os dados do spot populados
        const { data, error } = await supabase
          .from('captures')
          .select(`
            *,
            spots (
              id,
              title,
              water_type
            )
          `)
          .eq('user_id', user.id)
          .order('captured_at', { ascending: false })

        if (!error && data) {
          setCaptures(data)
        }
      }
      setLoading(false)
    }

    fetchCaptures()
  }, [])

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative">
        <div className="max-w-6xl mx-auto space-y-10 fade-in">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mobile-header-padding">
            <div>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 mb-4 border border-cyan-500/20 shadow-[0_0_20px_rgba(0,255,255,0.1)] group transition-all hover:bg-cyan-500/20">
                <Fish className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight uppercase">Minhas Capturas</h1>
              <p className="text-gray-400 mt-2 font-medium">O seu diário fotográfico de glórias no Fishgada.</p>
            </div>
            
            <div className="glass px-6 py-4 rounded-3xl border border-white/5 shadow-2xl flex items-center gap-6">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total</span>
                <p className="text-3xl font-black text-white">{captures.length}</p>
              </div>
              <div className="w-[1px] h-10 bg-white/10" />
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Troféus</span>
                <p className="text-3xl font-black text-amber-500">{captures.filter(c => c.is_trophy).length}</p>
              </div>
            </div>
          </header>

          {/* Estado de Carregamento */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 size={40} className="text-cyan-400 animate-spin" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Pescando informações...</p>
            </div>
          )}

          {/* Deslogado */}
          {!loading && !user && (
            <div className="py-24 text-center glass-elevated rounded-[40px] px-6">
              <Fish size={60} className="mx-auto text-gray-700 mb-6" />
              <h2 className="text-2xl font-black text-white mb-2">Faça Login</h2>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto">Você precisa estar conectado para visualizar seu álbum de capturas.</p>
              <Link href="/login" className="btn-primary inline-flex px-10 py-4 uppercase tracking-widest text-xs">
                Entrar no Sistema
              </Link>
            </div>
          )}

          {/* Vazio */}
          {!loading && user && captures.length === 0 && (
            <div className="py-24 text-center border-2 border-dashed border-white/10 rounded-[40px] px-6 bg-white/[0.02]">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <ImageIcon size={30} className="text-gray-600" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">A caixa térmica está vazia!</h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">Nenhuma captura registrada ainda. Volte ao mapa e adicione sua primeira fisgada do dia.</p>
              <Link href="/" className="btn-primary inline-flex px-8 py-4 uppercase tracking-widest text-xs bg-cyan-500 hover:bg-cyan-400 text-dark">
                Ir para o Mapa
              </Link>
            </div>
          )}

          {/* Grid de Capturas */}
          {!loading && user && captures.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {captures.map((capture) => (
                <div key={capture.id} className="glass-elevated group rounded-3xl overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.1)] flex flex-col">
                  
                  {/* Imagem Placeholder ou Foto */}
                  <div className="h-48 relative bg-[#060a12] overflow-hidden flex-shrink-0">
                    {capture.is_trophy && (
                      <div className="absolute top-3 left-3 z-10 bg-amber-500 text-black text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg flex items-center gap-1">
                        <Trophy size={10} /> Troféu
                      </div>
                    )}
                    {capture.photo_url ? (
                      <img src={capture.photo_url} alt={capture.species} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                        <Fish size={48} className="rotate-12" />
                      </div>
                    )}
                    
                    {/* Overlay Degradê */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent opacity-90" />
                    
                    {/* Título Sob a Imagem */}
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <h3 className="font-black text-lg truncate tracking-tight">{capture.species}</h3>
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="p-4 flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {capture.weight_kg && (
                        <div className="bg-white/5 rounded-xl p-2.5 flex items-center gap-2 border border-white/5">
                           <Scale size={14} className="text-cyan-400" />
                           <div className="flex flex-col">
                             <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Peso</span>
                             <span className="text-sm font-bold text-white leading-none mt-0.5">{capture.weight_kg} kg</span>
                           </div>
                        </div>
                      )}
                      
                      <div className="bg-white/5 rounded-xl p-2.5 flex items-center gap-2 border border-white/5">
                        <Calendar size={14} className="text-cyan-400" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Data</span>
                          <span className="text-sm font-bold text-white leading-none mt-0.5">
                            {new Date(capture.captured_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {capture.spots && (
                      <div className="flex items-start gap-2 text-gray-400 mt-2">
                        <MapPin size={14} className="text-cyan-400/70 mt-0.5 flex-shrink-0" />
                        <span className="text-xs font-semibold leading-relaxed line-clamp-2">{capture.spots.title}</span>
                      </div>
                    )}

                    <div className="mt-auto pt-2 flex flex-col gap-2">
                       <button 
                         onClick={() => setSelectedSpotForTrophy(capture.spots)}
                         className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2"
                       >
                         <Trophy size={14} className="text-amber-500" />
                         Gerar Cartão Digital
                       </button>

                       {capture.photo_url && (
                         <button 
                           onClick={() => {
                             localStorage.setItem(`album_highlight_${capture.species}`, capture.id)
                             alert('Esta foto será exibida no seu álbum!')
                           }}
                           className="w-full py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-accent/20"
                         >
                           <ImageIcon size={12} />
                           Usar no Álbum
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Troféu Digital Modal */}
      {selectedSpotForTrophy && user && (
        <TrophyCardModal
          isOpen={true}
          onClose={() => setSelectedSpotForTrophy(null)}
          spot={selectedSpotForTrophy}
          userId={user.id}
        />
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>
    </div>
  )
}
