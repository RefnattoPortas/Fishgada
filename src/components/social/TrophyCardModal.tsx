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
      const file = new File([blob], `trofeu-wikifish-${new Date().getTime()}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Meu Troféu no WikiFish',
          text: `Confira minha captura em ${spot.title}! Registrado pelo @WikiFish`,
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
    link.download = `trofeu-wikifish-${new Date().getTime()}.png`
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
          
          <div className="relative group shadow-[0_0_100px_rgba(0,212,170,0.15)] rounded-[32px] overflow-hidden border border-white/10" style={{ width: 320, height: 568 }}>
            <div 
              ref={cardRef}
              className="w-full h-full relative flex flex-col p-8 bg-[#0a0f1a] overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(10,15,26,0.1) 0%, rgba(10,15,26,0.95) 100%)' }}
            >
              {/* Background Image with optimized CORS handling */}
              <div className="absolute inset-0 -z-10 bg-slate-950">
                 {capture?.photo_url ? (
                   <img src={capture.photo_url} className="w-full h-full object-cover opacity-70" crossOrigin="anonymous" />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-br from-slate-900 to-[#0a0f1a] flex items-center justify-center">
                     <Fish size={140} className="text-white/[0.03] rotate-12" />
                   </div>
                 )}
              </div>

              {/* Watermark/Authority Tag */}
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-2.5 rounded-2xl self-start">
                 <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : <User className="w-full h-full p-2 text-gray-500" />}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-none mb-1">Pescador Autorizado</span>
                    <div className="flex items-center gap-1.5">
                       <span className="text-xs font-black text-white whitespace-nowrap">{profile?.display_name || 'Mestre'}</span>
                       {userRank && (
                         <div className="flex items-center gap-1">
                            <div className="w-[1px] h-2.5 bg-white/20" />
                            <userRank.icon size={10} style={{ color: userRank.color }} />
                            <span className="text-[9px] font-black uppercase" style={{ color: userRank.color }}>{userRank.title}</span>
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              {/* Central Trophy Title */}
              <div className="mt-12 space-y-3 text-center">
                <div className="inline-block px-3 py-1 bg-accent/20 border border-accent/20 rounded-full">
                   <p className="text-[10px] text-accent font-black uppercase tracking-[0.4em]">Troféu WikiFish</p>
                </div>
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-[0.9] italic">
                  {capture?.species || 'Expedição'}
                </h2>
                {capture?.weight_kg && (
                  <div className="inline-flex items-center gap-2 text-4xl font-black text-accent drop-shadow-xl">
                    <span>{capture.weight_kg}</span>
                    <span className="text-lg text-white/60 lowercase italic">kg</span>
                  </div>
                )}
              </div>

              {/* Effect Phrase */}
              <div className="mt-6 flex justify-center">
                <p className="max-w-[200px] text-center text-sm font-medium text-white/80 leading-relaxed italic opacity-90">
                  "{randomPhrase}"
                </p>
              </div>

              {/* Footer Context */}
              <div className="mt-auto flex items-end justify-between">
                 <div className="space-y-4">
                    {capture?.was_released && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-xl w-fit">
                        <ShieldCheck size={14} className="text-green-500 fill-green-500/10" />
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Pesca & Solta</span>
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2 text-white/90 mb-1">
                        <MapPin size={14} className="text-accent" />
                        <span className="text-xs font-black uppercase tracking-widest">{spot?.title}</span>
                      </div>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Registrado em {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                 </div>

                 {/* Simulated QR Code / Logo */}
                 <div className="flex flex-col items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-lg opacity-90">
                       <QrCode size={40} className="text-[#0a0f1a]" strokeWidth={2.5} />
                    </div>
                    <div className="flex items-center gap-1.5 opacity-50">
                       <div className="w-4 h-4 rounded bg-white flex items-center justify-center">
                          <Fish size={10} color="#000" />
                       </div>
                       <span className="text-[8px] font-black text-white tracking-widest">WIKIFISH</span>
                    </div>
                 </div>
              </div>

              {/* Dynamic Aura Effects */}
              <div 
                className="absolute -bottom-20 -left-20 w-64 h-64 blur-[100px] -z-10 rounded-full opacity-30" 
                style={{ backgroundColor: userRank?.color || 'var(--color-accent-primary)' }}
              />
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
