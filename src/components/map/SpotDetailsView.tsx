'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  X, MapPin, Fish, Award, Lock, Users, Eye, Star, Share2, 
  Navigation, Trophy, Wind, Thermometer, Clock, Camera,
  TrendingUp, BarChart3, Bell, BellOff, User, Calendar,
  ArrowRight, Plus, Warehouse, Utensils, Wifi, Car, Phone, Anchor, Megaphone, ChevronRight
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null)
    })
  }, [])

  const supabase = getSupabaseClient()

  useEffect(() => {
    if (spot && isOpen) {
      fetchSpotData()
    }
  }, [spot, isOpen])

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
          setups(*)
        `)
        .eq('spot_id', spot.id)
        .order('captured_at', { ascending: false })

      if (error) throw error
      setCaptures((data as any) || [])
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

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[1100] bg-black/80 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Main View Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-[1200] w-full max-w-[480px] glass-elevated shadow-2xl transition-transform duration-500 ease-out border-l border-white/10 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Section */}
        <div className="relative h-64 flex-shrink-0">
          <img 
            src={spot.photo_url || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1000'} 
            className="w-full h-full object-cover"
            alt={spot.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-green px-3 py-1 text-[10px] uppercase font-bold tracking-wider">
                {spot.is_resort ? 'Pesqueiro' : (spot.water_type || 'Ponto')}
              </span>
              {spot.is_resort_partner && (
                <span className="badge badge-amber px-3 py-1 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Parceiro
                </span>
              )}
              <span className="badge badge-blue px-3 py-1 text-[10px] uppercase font-bold tracking-wider">
                {spot.privacy_level}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">{spot.title}</h1>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <MapPin size={14} className="text-accent" />
                <span>Localização Protegida</span>
              </div>
              <button 
                onClick={handleOpenMaps}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
              >
                <Navigation size={14} /> Como Chegar
              </button>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex border-b border-white/5 bg-white/[0.02]">
          <button 
            onClick={() => setIsFollowing(!isFollowing)}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all ${
              isFollowing ? 'text-accent' : 'text-gray-400 hover:text-white'
            }`}
          >
            {isFollowing ? <Bell size={18} fill="currentColor" /> : <BellOff size={18} />}
            {isFollowing ? 'Seguindo Local' : 'Seguir Ponto'}
          </button>
          <div className="w-[1px] bg-white/5" />
          <button 
            onClick={() => setShowTrophyModal(true)}
            className="flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-all"
          >
            <Share2 size={18} /> Compartilhar
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="px-6 mt-6">
          <div className="flex gap-4 p-1 rounded-xl bg-white/5 border border-white/10">
            {[
              { id: 'insights', label: 'Insights', icon: BarChart3 },
              { id: 'feed', label: 'Feed', icon: Camera },
              { id: 'ranking', label: 'Ranking', icon: Trophy },
              ...(spot.is_resort ? [{ id: 'infra', label: 'Infra', icon: Warehouse }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-accent text-dark shadow-lg shadow-accent/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 custom-scrollbar">
          
          {/* TAB: INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-8 fade-in relative min-h-[400px]">
              
              {/* Paywall Overlay for Free Users */}
              {(!user || user?.profile?.subscription_tier === 'free') && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-8 bg-[#0a0f1a]/60 backdrop-blur-md rounded-3xl border border-white/5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-dark shadow-xl mb-6 animate-pulse">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Relatório de Iscas Bloqueado</h3>
                  <p className="text-sm text-gray-400 mb-8 max-w-[240px]">
                    Assine o plano <span className="text-accent font-bold">PRO</span> para ver quais iscas estão matando a pau neste ponto.
                  </p>
                  <button 
                    onClick={() => onShowPaywall('Relatório de Iscas')}
                    className="btn-primary py-4 px-8 text-xs font-black uppercase tracking-widest shadow-2xl shadow-accent/20"
                  >
                    Liberar Insights Pro
                  </button>
                </div>
              )}

              <div className={`${(!user || user?.profile?.subscription_tier === 'free') ? 'opacity-20 pointer-events-none filter blur-sm' : ''} space-y-8`}>
                {/* KPIs de Eficiência */}
                <section>
                  <h3 className="form-section-title mb-4">
                    <TrendingUp size={14} /> Dashboard de Eficiência
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="card p-4 flex flex-col items-center justify-center bg-accent/5 border-accent/20">
                      <span className="label text-[10px] text-accent">Isca Fatal</span>
                      <span className="text-xl font-bold mt-1">
                        {stats?.topLures[0]?.emoji} {stats?.topLures[0]?.label || '---'}
                      </span>
                    </div>
                    <div className="card p-4 flex flex-col items-center justify-center">
                      <span className="label text-[10px]">Melhor Período</span>
                      <span className="text-xl font-bold mt-1 flex items-center gap-2">
                        <Clock size={16} className="text-amber-400" />
                        {stats?.bestPeriod ? PERIOD_LABELS[stats.bestPeriod[0]] : '---'}
                      </span>
                    </div>
                  </div>

                  {/* Status Ativo (Pesqueiro) */}
                  {spot.is_resort && spot.resort_active_highlight && (
                    <div className="glass p-5 rounded-2xl border-accent/30 bg-accent/5 mb-6 animate-pulse">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                            <Fish size={20} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">Atividade da Semana</p>
                            <p className="text-sm font-bold text-white">{spot.resort_active_highlight}</p>
                         </div>
                      </div>
                    </div>
                  )}

                  {/* O que está batendo */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                       As 3 mais vitoriosas
                    </h4>
                    {stats?.topLures.map((lure, idx) => (
                      <div key={lure.type} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{lure.emoji}</span> {lure.label}
                          </span>
                          <span className="text-accent">{lure.percent}% de sucesso</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent rounded-full animate-grow"
                            style={{ width: `${lure.percent}%`, animationDelay: `${idx * 150}ms` }}
                          />
                        </div>
                      </div>
                    ))}
                    {(!stats || stats.topLures.length === 0) && (
                      <p className="text-xs text-center text-gray-500 py-4 italic">Dados insuficientes para este ponto.</p>
                    )}
                  </div>
                </section>

                {/* Capturas por Período */}
                <section>
                  <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                    <BarChart3 size={14} /> Fluxo de Capturas por Período
                  </h4>
                  <div className="grid grid-cols-5 gap-2 items-end h-32 pt-4">
                    {stats?.periodStats.map((p, idx) => (
                      <div key={p.label} className="group relative flex flex-col items-center h-full">
                        <div className="absolute -top-6 text-[10px] font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.count}
                        </div>
                        <div className="flex-1 w-full bg-white/5 rounded-t-md relative overflow-hidden flex flex-col justify-end">
                          <div 
                            className="w-full bg-gradient-to-t from-accent/80 to-accent rounded-t-md transition-all duration-700 hover:brightness-125"
                            style={{ height: `${p.percent}%`, transitionDelay: `${idx * 100}ms` }}
                          />
                        </div>
                        <span className="text-[9px] mt-2 text-gray-500 font-bold truncate w-full text-center">
                          {p.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* TAB: FEED (Galeria) */}
          {activeTab === 'feed' && (
            <div className="grid grid-cols-2 gap-3 fade-in">
              {captures.filter(c => c.photo_url).map((cap) => (
                <div key={cap.id} className="card overflow-hidden group">
                  <div className="relative aspect-square">
                    <img src={cap.photo_url!} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={cap.species} />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] font-bold text-white truncate capitalize">{cap.species}</p>
                      <p className="text-[9px] text-accent font-bold">
                        {cap.weight_kg ? `${cap.weight_kg}kg` : ''} 
                        {cap.weight_kg && cap.length_cm ? ' · ' : ''}
                        {cap.length_cm ? `${cap.length_cm}cm` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {captures.filter(c => c.photo_url).length === 0 && (
                <div className="col-span-2 py-20 text-center">
                  <Camera size={40} className="mx-auto text-gray-700 mb-4" />
                  <p className="text-gray-500 text-sm italic">Nenhuma foto registrada neste local.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: RANKING */}
          {activeTab === 'ranking' && (
            <div className="space-y-6 fade-in">
              {/* Rei do Ponto */}
              <div className="card p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30 relative overflow-hidden">
                <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-500/10 rotate-12" />
                <h4 className="text-amber-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                   Rei do Ponto
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
                        <span className="text-sm font-bold text-accent capitalize">
                          {stats.kingCapture.species}
                        </span>
                        <span className="text-xs text-gray-400">
                           recorde: <strong className="text-white">{stats.kingCapture.weight_kg}kg</strong>
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
                <h4 className="text-sm font-bold text-gray-400 mb-4 px-2">Top 5 Recentemente</h4>
                <div className="space-y-3">
                  {captures.slice(0, 5).map((cap, i) => (
                    <div key={cap.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="w-6 text-sm font-black text-gray-600">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white truncate">{cap.profiles?.display_name || 'Anônimo'}</p>
                        <p className="text-[10px] text-gray-500 capitalize">
                          {cap.species} · {format(new Date(cap.captured_at), "dd MMM 'de' yy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-accent">{cap.weight_kg || '?'}<span className="text-[10px] ml-0.5">kg</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: INFRAESTRUTURA (Exclusiva Pesqueiros) */}
          {activeTab === 'infra' && spot.is_resort && (
            <div className="space-y-8 fade-in">
              <section>
                <h3 className="form-section-title mb-4">
                  <Warehouse size={14} /> Comodidades e Serviços
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'restaurante', label: 'Restaurante', icon: Utensils },
                    { key: 'banheiros', label: 'Banheiros', icon: Warehouse },
                    { key: 'wi_fi', label: 'Wi-Fi', icon: Wifi },
                    { key: 'pousada', label: 'Pousada', icon: Warehouse },
                    { key: 'aluguel_equipamento', label: 'Aluguel Equip.', icon: Anchor },
                    { key: 'estacionamento', label: 'Estacionamento', icon: Car },
                  ].map((item) => {
                    const infra = (spot.resort_infrastructure as any) || {}
                    const available = infra[item.key]
                    return (
                      <div key={item.key} className={`card p-4 flex items-center gap-3 ${available ? 'bg-accent/5 border-accent/20' : 'opacity-40 grayscale'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${available ? 'bg-accent/10 text-accent' : 'bg-white/5 text-gray-500'}`}>
                          <item.icon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{item.label}</p>
                          <p className="text-[10px] uppercase font-black">{available ? 'Disponível' : 'Não possui'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="glass p-6 rounded-2xl border border-white/5 space-y-4">
                 <h4 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                   <Clock size={14} className="text-accent" /> Informações de Visita
                 </h4>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-start text-sm">
                       <span className="text-gray-400">Horário:</span>
                       <span className="text-white font-bold text-right max-w-[200px]">{spot.opening_hours || 'Consulte o local'}</span>
                    </div>
                    {spot.resort_prices && (
                      <div className="space-y-2 border-t border-white/5 pt-3 mt-1">
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tabela de Preços</p>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Entrada (Base):</span>
                            <span className="text-accent font-black">R$ {(spot.resort_prices as any)?.entry || '--'}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Quilo do Peixe:</span>
                            <span className="text-white font-bold">R$ {(spot.resort_prices as any)?.kg || '--'}</span>
                         </div>
                      </div>
                    )}
                 </div>
                 {spot.phone && (
                   <button 
                    onClick={() => window.open(`tel:${spot.phone}`)}
                    className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
                   >
                      <Phone size={14} /> Ligar para Reservas
                   </button>
                 )}
              </section>

              {/* Mural de Avisos */}
              {spot.resort_notice_board && (
                <section className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl relative overflow-hidden">
                   <Megaphone size={40} className="absolute -right-4 -bottom-4 text-amber-500/10 rotate-12" />
                   <h4 className="text-amber-500 font-black text-[10px] uppercase tracking-[0.2em] mb-3">Mural de Avisos</h4>
                   <p className="text-white font-medium text-sm leading-relaxed">
                     "{spot.resort_notice_board}"
                   </p>
                </section>
              )}

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
    </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
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
