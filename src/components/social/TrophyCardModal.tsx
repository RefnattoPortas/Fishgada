'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Download, Share2, Camera, MapPin, Fish, Scale, ShieldCheck, User, QrCode, Trophy } from 'lucide-react'
import { toPng } from 'html-to-image'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getRankByLevel } from '@/lib/utils/ranks'

interface TrophyCardModalProps {
  isOpen: boolean
  onClose: () => void
  spot: any
  userId: string
}

export default function TrophyCardModal({ isOpen, onClose, spot, userId }: TrophyCardModalProps) {
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [capture, setCapture] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [imageGenerated, setImageGenerated] = useState<string | null>(null)
  const [randomPhrase, setRandomPhrase] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && spot && userId) {
      fetchData()
    }
  }, [isOpen, spot, userId])

  const fetchData = async () => {
    setLoading(true)
    const supabase = getSupabaseClient()
    try {
      // Fetch latest capture
      const { data: captureData } = await supabase
        .from('captures')
        .select('*')
        .eq('spot_id', spot.id)
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .limit(1)
        .single()

      // Fetch user profile for rank
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setCapture(captureData)
      setProfile(profileData)

      if (profileData) {
        const level = (profileData as any).level || 1
        const rank = getRankByLevel(level)
        const phrase = rank.phrases[Math.floor(Math.random() * rank.phrases.length)]
        setRandomPhrase(phrase)
      }
    } catch (err) {
      console.error('Erro ao buscar dados do troféu:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateImage = async () => {
    if (!cardRef.current) return
    setIsGenerating(true)
    try {
      // Delay pequeno para garantir que o shimmer/loading apareça (UX)
      await new Promise(r => setTimeout(r, 800))
      
      if (!cardRef.current) throw new Error('Referência do card não encontrada')

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // 2 é mais estável que 3 em alguns browsers
        backgroundColor: '#0a0f1a',
        skipFonts: true, // Evita erros de carregamento de fontes externas que travam a geração
      })
      setImageGenerated(dataUrl)
    } catch (err: any) {
      console.error('Erro detalhado ao gerar imagem:', {
        message: err.message,
        stack: err.stack,
        err
      })
      alert('Não foi possível gerar a imagem. Verifique se a foto do peixe é válida ou tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShare = async () => {
    if (!imageGenerated) return

    try {
      const response = await fetch(imageGenerated)
      const blob = await response.blob()
      const file = new File([blob], `trofeu-fishgada-${new Date().getTime()}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Meu Troféu no Fishgada',
          text: `Confira minha captura em ${spot.title}! Registrado pelo @Fishgada`,
        })
      } else {
        downloadImage()
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err)
      downloadImage()
    }
  }

  const downloadImage = () => {
    if (!imageGenerated) return
    const link = document.createElement('a')
    link.download = `trofeu-fishgada-${new Date().getTime()}.png`
    link.href = imageGenerated
    link.click()
  }

  if (!isOpen) return null

  const userRank = profile ? getRankByLevel((profile as any).level || 1) : null

  return (
    <div className="fixed inset-0 z-[2030] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="max-w-lg w-full rounded-3xl overflow-hidden flex flex-col relative animate-fade-in">
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <div>
            <h3 className="font-black text-white text-xl uppercase tracking-tighter flex items-center gap-2">
              <TrophyIcon className="text-accent" /> Troféu Digital
            </h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Pronto para o Story</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col items-center gap-8">
          
          <div className="relative group shadow-[0_0_100px_rgba(0,212,170,0.15)] rounded-[32px] overflow-hidden border border-white/10" style={{ width: 320, height: 427 }}>
            <div 
              ref={cardRef}
              className="w-full h-full flex flex-col bg-[#060a12] overflow-hidden relative"
            >
              {/* Efeitos Dinâmicos de Fundo */}
              <div 
                className="absolute top-0 right-0 w-64 h-64 blur-[100px] z-0 rounded-full opacity-10 pointer-events-none" 
                style={{ backgroundColor: userRank?.color || 'var(--color-accent-primary)' }}
              />

              {/* BLOCO SUPERIOR (Cabeçalho do Pescador) */}
              <div className="p-5 flex items-center justify-between z-10 border-b border-white/5 bg-[#0a0f1a]/80 backdrop-blur-sm">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        ) : <User className="w-full h-full p-2 text-gray-500" />}
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{profile?.display_name || 'Mestre'}</span>
                        {userRank && (
                           <div className="flex items-center gap-1">
                              <div className="w-[1px] h-2.5 bg-white/20" />
                              <userRank.icon size={12} style={{ color: userRank.color }} />
                           </div>
                        )}
                     </div>
                 </div>
                 {capture?.is_trophy && (
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                       <Trophy size={14} className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    </div>
                 )}
              </div>
              
              {/* BLOCO CENTRAL (A FOTO DO PEIXE - 1:1) */}
              <div className="relative w-[320px] h-[320px] bg-black border-y border-white/10 overflow-hidden outline-none flex-shrink-0">
                 {capture?.photo_url ? (
                   <img src={capture.photo_url} className="w-full h-full object-cover" crossOrigin="anonymous" style={{ display: 'block' }} />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                     <Fish size={60} className="text-white/10 rotate-12" />
                     <p className="text-[10px] uppercase font-black tracking-widest text-white/30">Sem Foto</p>
                   </div>
                 )}
                 
                 {/* Selo e Pesca & Solta */}
                 <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent">
                    {capture?.was_released && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/90 rounded border border-green-400/30">
                        <ShieldCheck size={10} className="text-white" />
                        <span className="text-[7px] font-black text-white uppercase tracking-widest">Pesca & Solta</span>
                      </div>
                    )}
                    <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center gap-1.5 shadow-lg">
                       <Fish size={8} className="text-cyan-400" />
                       <span className="text-[7px] font-black tracking-widest text-white/90">FISHGADA</span>
                    </div>
                 </div>
              </div>

              {/* BLOCO INFERIOR (Metadados da Captura) - Compacto para 3:4 */}
              <div className="flex-1 p-4 z-10 flex flex-col justify-center bg-[#0a0f1a]">
                 
                 {/* Espécie, Peso e Local */}
                 <div className="flex justify-between items-center gap-2">
                    <div className="flex flex-col min-w-0">
                       <h2 className="text-sm font-black text-white uppercase tracking-tighter italic truncate leading-tight">
                         {capture?.species || 'Expedição'}
                       </h2>
                       <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin size={8} className="text-cyan-400" />
                          <span className="text-[7px] font-black text-white/50 uppercase tracking-[0.1em] truncate max-w-[120px]">{spot?.title}</span>
                          <div className="w-[1px] h-1.5 bg-white/10 mx-1" />
                          <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest">
                            {new Date(capture?.captured_at || new Date()).toLocaleDateString('pt-BR')}
                          </span>
                       </div>
                    </div>

                    {capture?.weight_kg && (
                      <div className="flex flex-col items-end flex-shrink-0">
                         <div className="flex items-baseline gap-0.5">
                            <span className="text-lg font-black text-cyan-400 leading-none">{capture.weight_kg}</span>
                            <span className="text-[8px] text-white/50 lowercase font-bold">kg</span>
                         </div>
                      </div>
                    )}

                    <div className="p-1 bg-white rounded flex-shrink-0 ml-1">
                        <QrCode size={16} className="text-dark" strokeWidth={2.5} />
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-[320px] space-y-4">
             {!imageGenerated ? (
               <button 
                 onClick={generateImage}
                 disabled={isGenerating || loading}
                 className="relative w-full py-5 rounded-[24px] bg-gradient-to-r from-accent to-accent-secondary flex items-center justify-center gap-3 font-black text-dark text-lg transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 group overflow-hidden"
               >
                 {isGenerating ? (
                   <>
                     <div className="shimmer absolute inset-0 bg-white/20" />
                     <span className="animate-pulse">Preparando seu troféu...</span>
                   </>
                 ) : (
                   <><Camera size={22} /> Gerar Meu Troféu</>
                 )}
               </button>
             ) : (
               <div className="flex flex-col gap-3 fade-in">
                 <button 
                   onClick={handleShare}
                   className="w-full py-5 rounded-[24px] bg-white text-[#0a0f1a] flex items-center justify-center gap-3 font-black text-lg transition-all hover:bg-gray-100 shadow-xl"
                 >
                   <Share2 size={22} /> Compartilhar Agora
                 </button>
                 <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={downloadImage}
                     className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center gap-2 font-bold text-sm"
                   >
                     <Download size={18} /> Salvar PNG
                   </button>
                   <button 
                     onClick={() => setImageGenerated(null)}
                     className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center gap-2 font-bold text-sm"
                   >
                     Refazer
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  )
}

function TrophyIcon({ className, size = 24 }: { className?: string, size?: number }) {
  return (
    <div className={`relative ${className}`}>
        <Trophy size={size} />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-ping" />
    </div>
  )
}
