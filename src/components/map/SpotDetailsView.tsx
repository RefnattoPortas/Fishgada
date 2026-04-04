'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  X, MapPin, Fish, Award, Lock, Users, Eye, Star, Share2, 
  Navigation, Trophy, Wind, Thermometer, Clock, Camera,
  TrendingUp, BarChart3, Bell, BellOff, User, Calendar,
  ArrowRight, Plus, Warehouse, Utensils, Wifi, Car, Phone, Anchor, Megaphone, ChevronRight, Heart, MessageSquare, Instagram
} from 'lucide-react'
import TrophyCardModal from '../social/TrophyCardModal'
import type { SpotMapView, Capture, Setup, Profile } from '@/types/database'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getSupabaseClient } from '@/lib/supabase/client'

interface SpotDetailsViewProps {
  spot: SpotMapView | null
  isOpen: boolean
  onClose: () => void
  onNewCapture?: (spotId: string) => void
  user: any
  onShowPaywall: (feature: string) => void
}

type CaptureWithData = Capture & {
  profiles?: Profile
  setups?: Setup[]
  likes_count?: number
  is_liked_by_user?: boolean
}

const LURE_LABELS: Record<string, { label: string; emoji: string }> = {
  topwater:     { label: 'Superfície',    emoji: '🦟' },
  mid_water:    { label: 'Meia-água',     emoji: '🐟' },
  bottom:       { label: 'Fundo',         emoji: '⚓' },
  jig:          { label: 'Jig',           emoji: '⚡' },
  soft_plastic: { label: 'Soft Plastic',  emoji: '🐛' },
  crankbait:    { label: 'Crankbait',     emoji: '🏃' },
  spinnerbait:  { label: 'Spinnerbait',   emoji: '✨' },
  natural_bait: { label: 'Isca Natural',  emoji: '🪱' },
  fly:          { label: 'Mosca',         emoji: '🪰' },
  other:        { label: 'Outro',         emoji: '🎣' },
}

const PERIOD_LABELS: Record<string, string> = {
  dawn: 'Alvorada',
  morning: 'Manhã',
  afternoon: 'Tarde',
  dusk: 'Entardecer',
  night: 'Noite'
}

export default function SpotDetailsView({
  spot,
  isOpen,
  onClose,
  onNewCapture,
  user,
  onShowPaywall
}: SpotDetailsViewProps) {
  const [captures, setCaptures] = useState<CaptureWithData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState<'insights' | 'feed' | 'ranking' | 'infra'>('insights')
  const [showTrophyModal, setShowTrophyModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedViewerPhoto, setSelectedViewerPhoto] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null)
    })
  }, [])

  const supabase = getSupabaseClient()

  useEffect(() => {
    if (spot && isOpen) {
      fetchSpotData()
      
      // Load follow state for this specific spot
      try {
        const followed = JSON.parse(localStorage.getItem('followed_spots') || '[]')
        setIsFollowing(followed.includes(spot.id))
      } catch (e) {
        setIsFollowing(false)
      }

      // Se for um pesqueiro, a aba Infra é a prioridade
      if (spot.is_resort) {
        setActiveTab('infra')
      } else {
        setActiveTab('insights')
      }
    }
  }, [spot?.id, isOpen])

  const fetchSpotData = async () => {
    if (!spot) return
    setIsLoading(true)
    try {
      // Busca capturas com profiles e setups
      const { data, error } = await supabase
        .from('captures')
        .select(`
          *,
          profiles(*),
          setups(*),
          interactions(type, user_id)
        `)
        .eq('spot_id', spot.id)
        .order('captured_at', { ascending: false })

      if (error) throw error
      
      const hydratedData = (data as any[]).map(cap => ({
        ...cap,
        likes_count: cap.interactions?.filter((i: any) => i.type === 'like').length || 0,
        is_liked_by_user: cap.interactions?.some((i: any) => i.type === 'like' && i.user_id === user?.id)
      }))

      setCaptures(hydratedData)
    } catch (err: any) {
      console.error('Erro ao buscar detalhes do ponto:', err.message || err)
      if (err.details) console.error('Detalhes:', err.details)
      if (err.hint) console.error('Dica:', err.hint)
    } finally {
      setIsLoading(false)
    }
  }

  // Cálculos de Insights
  const stats = useMemo(() => {
    if (captures.length === 0) return null

    // 1. Iscas mais vitoriosas
    const lureCounts: Record<string, number> = {}
    captures.forEach(c => {
      c.setups?.forEach(s => {
        if (s.lure_type) {
          lureCounts[s.lure_type] = (lureCounts[s.lure_type] || 0) + 1
        }
      })
    })

    const topLures = Object.entries(lureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => ({
        type,
        count,
        percent: Math.round((count / captures.length) * 100),
        ...LURE_LABELS[type]
      }))

    // 2. Melhor Período
    const periodCounts: Record<string, number> = {}
    captures.forEach(c => {
      const period = c.time_of_day || 'morning'
      periodCounts[period] = (periodCounts[period] || 0) + 1
    })

    const bestPeriod = Object.entries(periodCounts)
      .sort((a, b) => b[1] - a[1])[0]

    // 3. Rei do Ponto (Maior peixe com peso registrado)
    const kingCapture = [...captures]
      .filter(c => c.weight_kg !== null && c.weight_kg !== undefined)
      .sort((a, b) => (b.weight_kg || 0) - (a.weight_kg || 0))[0]

    // 4. Capturas por período (KPIs)
    const totalByPeriod = captures.length
    const periodStats = Object.entries(PERIOD_LABELS).map(([key, label]) => ({
      label,
      count: periodCounts[key] || 0,
      percent: totalByPeriod > 0 ? Math.round(((periodCounts[key] || 0) / totalByPeriod) * 100) : 0
    }))

    return { topLures, bestPeriod, kingCapture, periodStats }
  }, [captures])

  if (!spot) return null

  const handleOpenMaps = () => {
    const coords = spot.exact_lat ? `${spot.exact_lat},${spot.exact_lng}` : `${spot.display_lat},${spot.display_lng}`
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords}`, '_blank')
  }

  const toggleFollow = () => {
    if (!spot) return
    try {
      const followed = JSON.parse(localStorage.getItem('followed_spots') || '[]')
      if (isFollowing) {
        const newFollowed = followed.filter((id: string) => id !== spot.id)
        localStorage.setItem('followed_spots', JSON.stringify(newFollowed))
        setIsFollowing(false)
      } else {
        followed.push(spot.id)
        localStorage.setItem('followed_spots', JSON.stringify(Array.from(new Set(followed))))
        setIsFollowing(true)
      }
    } catch (e) {
      console.error('Error toggling follow status', e)
    }
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[1100] bg-black/80 transition-opacity"
          onClick={onClose}
        />
      )}

      <div 
        className={`fixed inset-y-0 right-0 z-[1200] w-full max-w-[480px] glass-elevated shadow-2xl transition-transform duration-500 ease-out border-l border-white/10 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto w-full pb-32 custom-scrollbar">
          <div className="relative h-64 md:h-80 flex-shrink-0 bg-dark overflow-hidden group">
          {spot.is_resort && (spot as any).resort_photos && (spot as any).resort_photos.length > 0 ? (
            <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {(spot as any).resort_photos.map((url: string, i: number) => (
                <div key={i} className="min-w-full h-full snap-center relative">
                  <img src={url} className="w-full h-full object-cover" alt={`${spot.title} ${i+1}`} />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-10 md:hidden">
                     {(spot as any).resort_photos.map((_: any, dotIdx: number) => (
                       <div key={dotIdx} className={`w-1.5 h-1.5 rounded-full ${i === dotIdx ? 'bg-accent' : 'bg-white/30'}`} />
                     ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <img 
              src={spot.photo_url || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1000'} 
              className="w-full h-full object-cover"
              alt={spot.title}
            />
          )}

          {spot.is_resort && (spot as any).resort_photos?.length > 1 && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="text-white/50 text-xs font-bold bg-black/40 px-2 py-1 rounded-full">Arraste para ver mais</div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-[#0a0f1a]/40 pointer-events-none" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full glass-elevated border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110 active:scale-95 shadow-lg z-[1201]"
          >
            <X size={20} className="text-white" />
          </button>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-green px-3 py-1 text-[10px] uppercase font-bold tracking-wider">
                {spot.is_resort ? 'Pesqueiro Oficial' : (spot.water_type || 'Ponto de Pesca')}
              </span>
              {spot.is_resort_partner && (
                <span className="badge badge-amber px-3 py-1 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Parceiro Fundador
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2 leading-none">{spot.title}</h1>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin size={14} className="text-accent" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Localização Protegida</span>
              </div>
              <button 
                onClick={handleOpenMaps}
                className="btn-primary py-3 px-6 text-[10px] font-black flex items-center gap-2 shadow-xl shadow-accent/20"
              >
                <Navigation size={14} /> COMO CHEGAR
              </button>
            </div>
          </div>
        </div>

        <div className="flex border-b border-white/5 bg-white/[0.02]">
          <button 
            onClick={toggleFollow}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
              isFollowing ? 'text-accent' : 'text-gray-400 hover:text-white'
            }`}
          >
            {isFollowing ? <Bell size={18} fill="currentColor" /> : <BellOff size={18} />}
            {isFollowing ? 'Seguindo Local' : 'Seguir Ponto'}
          </button>
          <div className="w-[1px] bg-white/5" />
          <button 
            onClick={() => setShowTrophyModal(true)}
            className="flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
          >
            <Share2 size={18} /> Compartilhar
          </button>
        </div>

        <div className="px-6 mt-6">
          <div className="flex gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto scrollbar-hide">
            {[
              ...(spot.is_resort ? [{ id: 'infra', label: 'Infra', icon: Warehouse }] : []),
              { id: 'insights', label: 'Insights', icon: BarChart3 },
              { id: 'feed', label: 'Feed', icon: Camera },
              { id: 'ranking', label: 'Ranking', icon: Trophy }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-shrink-0 flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-accent text-dark shadow-lg shadow-accent/20' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-8">
          
          {activeTab === 'insights' && (
            <div className="space-y-8 fade-in relative min-h-[400px]">
              
              {(!user || user?.profile?.subscription_tier === 'free') && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-8 bg-[#0a0f1a]/80 backdrop-blur-md rounded-3xl border border-white/5 mx-[-12px]">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-dark shadow-xl mb-6">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Relatório VIP Bloqueado</h3>
                  <p className="text-xs text-gray-400 mb-8 max-w-[240px] uppercase font-bold tracking-widest">
                    Assine o plano <span className="text-accent">PRO</span> para ver iscas detalhadas e horários de pico.
                  </p>
                  <button 
                    onClick={() => onShowPaywall('Relatório de Iscas')}
                    className="btn-primary py-4 px-8 text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-accent/20"
                  >
                    Ativar Modo Fishgada PRO
                  </button>
                </div>
              )}

              <div className={`${(!user || user?.profile?.subscription_tier === 'free') ? 'opacity-20 pointer-events-none filter blur-md' : ''} space-y-8`}>
                <section>
                  <h3 className="form-section-title mb-6">
                    <TrendingUp size={14} /> Dashboard de Eficiência
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="glass p-5 flex flex-col items-center justify-center bg-accent/5 border-accent/20 rounded-3xl">
                      <span className="text-[9px] font-black text-accent uppercase tracking-widest mb-2">Isca Fatal</span>
                      <span className="text-lg font-black text-white">
                        {stats?.topLures[0]?.emoji} {stats?.topLures[0]?.label || '---'}
                      </span>
                    </div>
                    <div className="glass p-5 flex flex-col items-center justify-center rounded-3xl">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Melhor Período</span>
                      <span className="text-lg font-black text-white flex items-center gap-2">
                        <Clock size={16} className="text-amber-400" />
                        {stats?.bestPeriod ? PERIOD_LABELS[stats.bestPeriod[0]] : '---'}
                      </span>
                    </div>
                  </div>

                  {spot.is_resort && spot.resort_active_highlight && (
                    <div className="glass p-6 rounded-3xl border-accent/30 bg-accent/5 mb-8">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent shadow-inner">
                            <Fish size={24} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-1">Status em Tempo Real</p>
                            <p className="text-base font-bold text-white italic">"{spot.resort_active_highlight}"</p>
                         </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                       Iscas mais vitoriosas aqui
                    </h4>
                    {stats?.topLures.map((lure, idx) => (
                      <div key={lure.type} className="space-y-3">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                          <span className="flex items-center gap-2 text-gray-300">
                            <span className="text-lg">{lure.emoji}</span> {lure.label}
                          </span>
                          <span className="text-accent">{lure.percent}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent rounded-full shadow-[0_0_10px_rgba(0,212,170,0.4)]"
                            style={{ width: `${lure.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'feed' && (
            <div className="grid grid-cols-2 gap-4 fade-in">
              {captures.filter(c => c.photo_url).map((cap) => (
                <div 
                  key={cap.id} 
                  className="glass-elevated rounded-[24px] overflow-hidden group relative aspect-[4/5] cursor-pointer"
                  onClick={() => setSelectedViewerPhoto(cap.photo_url!)}
                >
                  <img src={cap.photo_url!} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={cap.species} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); }}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full glass-elevated border border-white/10 flex items-center justify-center transition-all ${cap.is_liked_by_user ? 'bg-rose-500/20 text-rose-500' : 'text-white/60'}`}
                  >
                    <Heart size={18} fill={cap.is_liked_by_user ? 'currentColor' : 'none'} />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                     <p className="text-xs font-black text-white truncate uppercase tracking-tighter italic">{cap.species}</p>
                     <div className="flex justify-between items-center mt-1">
                        <p className="text-[10px] text-accent font-black uppercase">
                          {cap.weight_kg ? `${cap.weight_kg}kg` : '--'}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] font-black text-white/50">
                          <Heart size={10} /> {cap.likes_count || 0}
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: RANKING */}
          {activeTab === 'ranking' && (
            <div className="space-y-6 fade-in">
              {/* Rei do Ponto */}
              <div className="glass-elevated p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 rounded-3xl relative overflow-hidden shadow-xl">
                <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-500/10 rotate-12" />
                <h4 className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                   👑 Rei do Ponto
                </h4>
                
                {stats?.kingCapture ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500 p-1 flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-amber-500/20 flex items-center justify-center overflow-hidden">
                        {stats.kingCapture.profiles?.avatar_url ? (
                          <img src={stats.kingCapture.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <User size={30} className="text-amber-500" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{stats.kingCapture.profiles?.display_name || 'Mestre Pescador'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-black text-accent uppercase italic">
                          {stats.kingCapture.species}
                        </span>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                           {stats.kingCapture.weight_kg}kg
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhum rei coroado ainda.</p>
                )}
              </div>

              {/* Top 5 Recente */}
              <div>
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 px-2">Top 5 Recentemente</h4>
                <div className="space-y-3">
                  {captures.slice(0, 5).map((cap, i) => (
                    <div key={cap.id} className="flex items-center gap-3 p-4 rounded-[20px] bg-white/[0.03] border border-white/5 hover:border-accent/20 transition-all">
                      <span className="w-6 text-xs font-black text-gray-600">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{cap.profiles?.display_name || 'Anônimo'}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                          {cap.species} · {format(new Date(cap.captured_at), "dd MMM 'de' yy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-accent">{cap.weight_kg || '---'}<span className="text-[10px] ml-0.5">kg</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: INFRAESTRUTURA (Exclusiva Pesqueiros) */}
          {activeTab === 'infra' && spot.is_resort && (
            <div className="space-y-10 fade-in">
              
              {(spot as any).resort_photos && (spot as any).resort_photos.length > 0 && (
                <section>
                  <h3 className="form-section-title mb-4">
                    <Camera size={14} /> Galeria do Local
                  </h3>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
                     {(spot as any).resort_photos.map((url: string, i: number) => (
                       <div key={i} className="min-w-[280px] h-48 rounded-[32px] overflow-hidden glass-elevated border border-white/10 snap-center shadow-xl group">
                          <img 
                            src={url} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer" 
                            alt={`Ambiente ${i+1}`}
                            onClick={() => setSelectedViewerPhoto(url)} 
                          />
                       </div>
                     ))}
                  </div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-3 text-center">Arraste para o lado para explorar • Clique para ampliar</p>
                </section>
              )}

              <section>
                <h3 className="form-section-title mb-6">
                  <Warehouse size={14} /> Comodidades e Serviços
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'restaurante', label: 'Restaurante', icon: Utensils },
                    { key: 'banheiros', label: 'Banheiros', icon: Warehouse },
                    { key: 'wi_fi', label: 'Free Wi-Fi', icon: Wifi },
                    { key: 'pousada', label: 'Hospedagem', icon: Warehouse },
                    { key: 'aluguel_equipamento', label: 'Aluguel Equip.', icon: Anchor },
                    { key: 'estacionamento', label: 'Estacionamento', icon: Car },
                  ].map((item) => {
                    const infra = (spot as any).resort_infrastructure || {}
                    const available = infra[item.key]
                    return (
                      <div key={item.key} className={`glass-elevated p-5 flex items-center gap-4 rounded-3xl border transition-all ${available ? 'border-accent/30 bg-accent/[0.02]' : 'opacity-30 border-white/5'}`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${available ? 'bg-accent/10 text-accent' : 'bg-white/5 text-gray-500'}`}>
                          <item.icon size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-tight">{item.label}</p>
                          <p className="text-[9px] uppercase font-black text-gray-500">{available ? 'Ativo' : 'N/A'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="glass-elevated p-8 rounded-[40px] border border-white/5 space-y-6 bg-white/[0.02]">
                   <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                     <Clock size={16} className="text-accent" /> Horários de Funcionamento
                   </h4>
                   <div className="space-y-4">
                      {spot.opening_hours?.split(' | ').map((part, i) => {
                        const [day, hours] = part.split(': ')
                        const isWeekend = day.toLowerCase().includes('sáb') || day.toLowerCase().includes('dom')
                        const isHoliday = day.toLowerCase().includes('feriado')
                        
                        return (
                          <div key={i} className="flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full ${isHoliday ? 'bg-amber-500 animate-pulse' : isWeekend ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                              <span className={`text-[11px] font-black uppercase tracking-wider ${isHoliday ? 'text-amber-500' : isWeekend ? 'text-gray-300' : 'text-gray-500'}`}>
                                {day}
                              </span>
                            </div>
                            <span className="text-xs font-black text-white italic group-hover:text-accent transition-colors">{hours}</span>
                          </div>
                        )
                      }) || (
                        <div className="py-6 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Consulte o local via telefone</p>
                        </div>
                      )}
                   </div>
                </section>

                <section className="glass-elevated p-8 rounded-[40px] border border-white/5 space-y-6 bg-white/[0.02] flex flex-col justify-between">
                   <h4 className="text-accent font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                     <TrendingUp size={16} /> Preços Base
                   </h4>
                   <div className="space-y-5 flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Entrada / Diária</span>
                        <span className="text-xl font-black text-white italic">R$ {(spot.resort_prices as any)?.entry || '--'}</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Pesca Esportiva</span>
                        <span className="text-xl font-black text-white italic">R$ {(spot.resort_prices as any)?.fishing || '--'}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Preço do Quilo</span>
                        <span className="text-xl font-black text-accent italic">R$ {(spot.resort_prices as any)?.kg || '--'}</span>
                      </div>
                   </div>
                </section>
              </div>

              {/* Mural de Avisos */}
              {spot.resort_notice_board && (
                <section className="bg-amber-500/10 border border-amber-500/30 p-8 rounded-[32px] relative overflow-hidden group">
                   <Megaphone size={40} className="absolute -right-4 -bottom-4 text-amber-500/10 rotate-12 group-hover:scale-110 transition-transform" />
                   <h4 className="text-amber-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Megaphone size={14} /> Comunicados Importantes
                   </h4>
                   <p className="text-white font-medium text-sm leading-relaxed relative z-10">
                     "{spot.resort_notice_board}"
                   </p>
                </section>
              )}

              {/* Módulo de Contato Profissional */}
              <section className="space-y-4">
                <h3 className="form-section-title mb-4 flex items-center gap-2">
                  <Phone size={14} /> Canais de Contato e Reservas
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {spot.phone && (
                    <div className="glass-elevated p-6 rounded-[32px] flex items-center justify-between group bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent shadow-inner group-hover:scale-110 transition-transform">
                          <Phone size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Fale Conosco</p>
                          <p className="text-base font-black text-white italic tracking-tight">{spot.phone}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open(`tel:${spot.phone?.replace(/\D/g, '')}`)}
                        className="px-6 py-3 bg-accent text-dark font-black text-[10px] rounded-2xl uppercase tracking-widest shadow-xl shadow-accent/10 hover:scale-105 active:scale-95 transition-all"
                      >
                        Ligar Agora
                      </button>
                    </div>
                  )}

                  {/* WhatsApp de Reservas */}
                  <button 
                    onClick={() => {
                        const cleanZap = (spot as any).resort_infrastructure?.whatsapp?.replace(/\D/g, '') || spot.phone?.replace(/\D/g, '')
                        window.open(`https://wa.me/55${cleanZap}`, '_blank')
                    }}
                    className="w-full flex items-center justify-between p-6 rounded-[36px] bg-[#25D366]/5 border border-[#25D366]/20 hover:bg-[#25D366]/10 transition-all group shadow-2xl relative overflow-hidden"
                  >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <MessageSquare size={80} className="-mr-10 -mt-10 rotate-12" />
                      </div>
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-[#25D366] text-dark flex items-center justify-center shadow-[0_0_30px_rgba(37,211,102,0.4)] group-hover:scale-110 transition-transform">
                          <MessageSquare size={26} fill="currentColor" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-base font-black text-white uppercase tracking-tighter italic">WhatsApp Oficial</h4>
                          <p className="text-[10px] font-bold text-[#25D366] uppercase tracking-[0.2em]">Falar com Reservas</p>
                        </div>
                      </div>
                      <ChevronRight size={24} className="text-[#25D366] group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
                
                {/* Redes Sociais e Outros */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      const handle = (spot as any).resort_infrastructure?.instagram || spot.instagram?.replace('@', '')
                      if (handle) window.open(`https://instagram.com/${handle}`, '_blank')
                    }}
                    className="flex flex-col items-center gap-4 p-8 rounded-[40px] glass-elevated border border-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all" />
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 transition-all group-hover:scale-110 shadow-lg">
                       <Instagram size={28} />
                    </div>
                    <div className="text-center">
                       <span className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1 group-hover:text-white">Instagram</span>
                       <span className="text-[9px] font-black text-rose-500/80 uppercase">Ver Perfil</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      const email = (spot as any).resort_infrastructure?.email || spot.website
                      if (email) window.open(`mailto:${email}`, '_blank')
                    }}
                    className="flex flex-col items-center gap-4 p-8 rounded-[40px] glass-elevated border border-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 transition-all group-hover:scale-110 shadow-lg">
                       <Calendar size={28} />
                    </div>
                    <div className="text-center">
                       <span className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1 group-hover:text-white">E-mail</span>
                       <span className="text-[9px] font-black text-blue-400/80 uppercase">Contatar</span>
                    </div>
                  </button>
                </div>
              </section>

              {/* Tournament CTA */}
              {spot.open_tournaments_count > 0 && (
                <button 
                  onClick={() => window.location.href = '/tournaments'}
                  className="w-full glass-elevated border-accent/20 p-5 rounded-2xl flex items-center justify-between group hover:border-accent transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent text-dark flex items-center justify-center">
                      <Trophy size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-accent uppercase">Torneio Ativo</p>
                      <p className="text-sm font-bold">{spot.open_tournaments_count} evento(s) disponível(is)</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-500 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </button>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Floating Action Button - New Capture */}
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <button 
            onClick={() => onNewCapture?.(spot.id)}
            className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-3 glow-green shadow-xl"
          >
            <Plus size={20} fill="#000" /> Registrar Minha Captura Aqui
          </button>
        </div>

      {spot && userId && (
        <TrophyCardModal 
          isOpen={showTrophyModal}
          onClose={() => setShowTrophyModal(false)}
          spot={spot}
          userId={userId}
        />
      )}

      {/* Full Screen Photo Viewer (Lightbox) */}
      {selectedViewerPhoto && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/95 flex flex-col items-center justify-center p-4 md:p-10 fade-in"
          onClick={() => setSelectedViewerPhoto(null)}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 rounded-full glass-elevated flex items-center justify-center text-white hover:bg-white/10 transition-all z-[2001]"
            onClick={() => setSelectedViewerPhoto(null)}
          >
            <X size={24} />
          </button>
          
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img 
              src={selectedViewerPhoto} 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-scale-up" 
              alt="Visualização"
              onClick={(e) => e.stopPropagation()} 
            />
            {/* Visual cues */}
            <div className="absolute inset-x-0 -bottom-12 flex justify-center">
               <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Toque fora para fechar</p>
            </div>
          </div>
        </div>
      )}
    </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-accent-primary);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes grow {
          from { width: 0; }
        }
        .animate-grow {
          animation: grow 1s ease-out forwards;
        }
      `}</style>
    </>
  )
}
