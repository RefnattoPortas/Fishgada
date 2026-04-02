'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { User, Trophy, Fish, MapPin, Calendar, Star, TrendingUp, Award, Clock, Warehouse, Plus, ArrowRight, Megaphone, Utensils, MessageSquare, Scale, Ruler, ChevronRight, Image as ImageIcon, Info, Loader2, AlertCircle, Heart, Share2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getRankByLevel } from '@/lib/utils/ranks'
import NewResortForm from '@/components/map/NewResortForm'
import dynamic from 'next/dynamic'

const TrophyCardModal = dynamic(() => import('@/components/social/TrophyCardModal'), { ssr: false })

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    total_captures: 0,
    total_weight: 0,
    unique_species: 0,
    medals_count: 0
  })
  const [achievements, setAchievements] = useState<any[]>([])
  const [inscriptions, setInscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'business'>('general')
  const [isResortOwner, setIsResortOwner] = useState(false)
  const [showResortForm, setShowResortForm] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [followedResorts, setFollowedResorts] = useState<any[]>([])
  const [profileSubTab, setProfileSubTab] = useState<'mural' | 'captures' | 'fishdex' | 'inscriptions' | 'achievements'>('mural')
  const [userCaptures, setUserCaptures] = useState<any[]>([])
  const [species, setSpecies] = useState<any[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<any | null>(null)
  const [selectedSpotForTrophy, setSelectedSpotForTrophy] = useState<any>(null)
  const [visibleFeedCount, setVisibleFeedCount] = useState(4)
  const feedSentinelRef = useRef<HTMLDivElement>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    city: '',
    state: ''
  })

  // Infinite scroll observer for feed
  const loadMoreFeed = useCallback(() => {
    setVisibleFeedCount(prev => prev + 4)
  }, [])

  useEffect(() => {
    const sentinel = feedSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreFeed()
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMoreFeed, followedResorts, userCaptures])

  useEffect(() => {
    fetchProfileData()
    fetchFollowedResorts()
    fetchSpecies()
    
    // Check tab from URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'business') {
      setActiveTab('business')
    }
    if (params.get('subtab')) {
      setProfileSubTab(params.get('subtab') as any)
    }

    const handleOnline = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOnline)
    }
  }, [])

  useEffect(() => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        city: (profile as any).city || '',
        state: (profile as any).state || ''
      })
    }
  }, [profile])

  const fetchProfileData = async () => {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setUser(user)
      
      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Fetch Achievements
      const { data: userAch } = await supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', user.id)
      
      if (userAch) {
        setAchievements(userAch)
      }

      // Fetch Tournament Inscriptions
      const { data: userInscriptions } = await supabase
        .from('tournament_participants')
        .select(`
          id,
          created_at,
          tournaments(
            id,
            title,
            event_date,
            status,
            fishing_resorts(
              spots(title)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (userInscriptions) {
        setInscriptions(userInscriptions)
      }

      // Fetch Full Captures for Feed
      const { data: fullCaptures } = await supabase
        .from('captures')
        .select('*, spots(title)')
        .eq('user_id', user.id)
        .order('captured_at', { ascending: false })

      if (fullCaptures) {
        setUserCaptures(fullCaptures)
        const captureList = fullCaptures as any[]
        const uniqueSpecies = new Set(captureList.map((c: any) => c.species)).size
        const totalWeight = captureList.reduce((acc: number, c: any) => acc + (c.weight_kg || 0), 0)
        
        setStats({
          total_captures: fullCaptures.length,
          total_weight: Math.round(totalWeight * 10) / 10,
          unique_species: uniqueSpecies,
          medals_count: userAch?.length || 0
        })
      }
      // Check Resort Ownership
      const { data: resort } = await supabase
        .from('fishing_resorts')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
      setIsResortOwner(!!resort && resort.length > 0)
    }
    setLoading(false)
  }

  const fetchSpecies = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: speciesData } = await supabase
        .from('species')
        .select('*')
        .eq('is_active', true)
        
      const { data: capturesData } = await supabase
        .from('captures')
        .select('id, species, length_cm, weight_kg, captured_at, photo_url')
        .eq('user_id', user.id)

      if (speciesData) {
        const userCaptures = (capturesData || []) as any[]
        const mergedAlbum = speciesData.map((s: any) => {
          const myCatches = userCaptures.filter((c: any) => {
            const captName = c.species?.split(' (')[0].trim().toLowerCase();
            const specName = s.nome_comum?.split(' (')[0].trim().toLowerCase();
            return captName === specName;
          })
          
          const highlightId = typeof window !== 'undefined' ? localStorage.getItem(`album_highlight_${s.nome_comum}`) : null
          const highlightCatch = highlightId ? myCatches.find((c: any) => c.id === highlightId) : null
          const userPhoto = highlightCatch?.photo_url || myCatches.find((c: any) => c.photo_url)?.photo_url

          return {
            ...s,
            imagem_url: userPhoto || s.imagem_url,
            total_capturas: myCatches.length,
            maior_tamanho_capturado_cm: myCatches.length > 0 ? Math.max(...myCatches.map((c: any) => c.length_cm || 0)) : null,
            maior_peso_capturado_kg: myCatches.length > 0 ? Math.max(...myCatches.map((c: any) => c.weight_kg || 0)) : null,
          }
        })
        
        setSpecies(mergedAlbum.sort((a, b) => {
          if (a.total_capturas > 0 && b.total_capturas === 0) return -1;
          if (a.total_capturas === 0 && b.total_capturas > 0) return 1;
          return a.nome_comum.localeCompare(b.nome_comum);
        }))
      }
    } catch (e) {
      console.error('Erro ao buscar especies:', e)
    }
  }

  const fetchFollowedResorts = async () => {
    try {
      const ids = JSON.parse(localStorage.getItem('followed_spots') || '[]')
      if (ids.length === 0) {
        setFollowedResorts([])
        return
      }
      
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('spots_map_view')
        .select('*')
        .in('id', ids)
      
      if (error) throw error
      if (data) setFollowedResorts(data)
    } catch (e) {
      console.error('Erro ao buscar pesqueiros seguidos:', e)
    }
  }

  const handleUpdateProfile = async () => {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: editForm.display_name,
        bio: editForm.bio,
        city: editForm.city,
        state: editForm.state,
        updated_at: new Date().toISOString()
      } as never)
      .eq('id', user.id)

    if (error) {
      alert('Erro ao atualizar perfil: ' + error.message)
    } else {
      setIsEditing(false)
      fetchProfileData()
    }
  }

  if (loading) return null

  const userRank = profile ? getRankByLevel(profile.level || 1) : null
  
  const calculateXPProgress = () => {
    if (!profile) return 0
    const xp = profile.xp_points || 0
    if (xp <= 500) return (xp / 500) * 100
    if (xp <= 2000) return ((xp - 500) / 1500) * 100
    if (xp <= 5000) return ((xp - 2000) / 3000) * 100
    return 100
  }

  const getNextLevelXP = () => {
    if (!profile) return 500
    const xp = profile.xp_points || 0
    if (xp <= 500) return 500
    if (xp <= 2000) return 2000
    if (xp <= 5000) return 5000
    return xp
  }

  const xpProgress = calculateXPProgress()
  const nextXP = getNextLevelXP()

  const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-10 fade-in">
          
          {!user ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 glass-elevated rounded-[40px] p-12 border border-white/5">
              <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <User size={48} />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter italic">Perfil de Pescador</h2>
                <p className="text-gray-400 max-w-sm mx-auto uppercase text-xs font-bold tracking-widest leading-relaxed">
                  Faça login para ver suas estatísticas, conquistas e gerenciar seus pesqueiros.
                </p>
              </div>
              <a href="/login" className="btn-primary px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-accent/20">
                Acessar Minha Conta
              </a>
            </div>
          ) : (
            <>
          {/* Tab Navigation */}
          <div className="flex items-center gap-6 border-b border-white/5 pb-1">
             <button 
                onClick={() => setActiveTab('general')}
                className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'general' ? 'text-accent' : 'text-gray-500 hover:text-white'}`}
             >
                Visão Geral
                {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent shadow-[0_0_10px_rgba(0,212,170,0.8)]" />}
             </button>
             <button 
                onClick={() => setActiveTab('business')}
                className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'business' ? 'text-accent' : 'text-gray-500 hover:text-white'}`}
             >
                Meus Negócios
                {activeTab === 'business' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent shadow-[0_0_10px_rgba(0,212,170,0.8)]" />}
             </button>
          </div>

          {activeTab === 'general' ? (
            <>
              {/* Hero Profile Header */}
              <div className="relative glass-elevated rounded-[40px] p-8 md:p-12 border border-white/5 overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full -mr-32 -mt-32" />
                <div 
                  className="absolute bottom-0 left-0 w-64 h-64 blur-[100px] opacity-20 rounded-full" 
                  style={{ backgroundColor: userRank?.color }} 
                />

                <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  {/* Avatar */}
                  <div className="relative">
                    <div 
                      className="w-32 h-32 md:w-44 md:h-44 rounded-[48px] overflow-hidden p-1.5 shadow-2xl"
                      style={{ background: `linear-gradient(135deg, ${userRank?.color}, transparent)` }}
                    >
                      <div className="w-full h-full rounded-[42px] overflow-hidden bg-slate-900 border border-white/10">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : <User className="w-full h-full p-10 text-gray-500" />}
                      </div>
                    </div>
                    <div 
                      className="absolute -bottom-4 -right-4 w-12 h-12 md:w-16 md:h-16 rounded-3xl flex items-center justify-center border-4 border-[#0a0f1a] shadow-xl transform hover:scale-110 transition-transform"
                      style={{ backgroundColor: userRank?.color || '#333' }}
                    >
                      <span className="text-dark font-black text-xl md:text-2xl">L{profile?.level || 1}</span>
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full w-fit mx-auto md:mx-0">
                        {userRank && <userRank.icon size={16} style={{ color: userRank.color }} />}
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]" style={{ color: userRank?.color }}>
                          {userRank?.title}
                        </span>
                      </div>
                      
                      {!isEditing ? (
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-1.5 glass rounded-xl border border-white/10 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-gray-400"
                        >
                          Editar Perfil
                        </button>
                      ) : (
                        <div className="flex gap-2 mx-auto md:mx-0">
                          <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 glass rounded-xl border border-white/10 text-[10px] font-black uppercase text-gray-500">Cancelar</button>
                          <button onClick={handleUpdateProfile} className="px-4 py-1.5 bg-accent text-dark rounded-xl text-[10px] font-black uppercase shadow-lg shadow-accent/20">Salvar</button>
                        </div>
                      )}
                    </div>
                    
                    {!isEditing ? (
                      <>
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">
                          {profile?.display_name || 'Pescador'}
                        </h1>
                        <p className="text-accent font-bold text-xs flex items-center justify-center md:justify-start gap-1">
                          <MapPin size={12} /> {profile?.city || '---'}, {profile?.state || '---'}
                        </p>
                        <p className="text-gray-400 font-medium text-sm md:text-base max-w-xl">
                          {profile?.bio || 'Nenhuma biografia disponível ainda.'}
                        </p>
                      </>
                    ) : (
                      <div className="space-y-4 max-w-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Nome</label>
                              <input value={editForm.display_name} onChange={e => setEditForm({...editForm, display_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm text-white" />
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Cidade</label>
                                <input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm text-white" />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">UF</label>
                                <select 
                                  value={editForm.state} 
                                  onChange={e => setEditForm({...editForm, state: e.target.value})} 
                                  className="select w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm text-white"
                                >
                                  <option value="" className="text-black">UF</option>
                                  {BRAZILIAN_STATES.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
                                </select>
                              </div>
                           </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Bio</label>
                          <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm text-white resize-none" />
                        </div>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="pt-4 max-w-sm mx-auto md:mx-0">
                       <div className="flex justify-between items-end mb-2">
                         <span className="text-[10px] font-black text-accent uppercase tracking-widest">Progresso XP</span>
                         <span className="text-[10px] font-bold text-white/40">{profile?.xp_points} / {nextXP} XP</span>
                       </div>
                       <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-accent shadow-[0_0_15px_rgba(0,212,170,0.5)] transition-all duration-1000" style={{ width: `${xpProgress}%` }} />
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: 'Capturas', value: stats.total_captures, icon: Fish, color: '#00d4aa' },
                  { label: 'Peso Total (kg)', value: stats.total_weight, icon: TrendingUp, color: '#3b82f6' },
                  { label: 'Espécies Únicas', value: stats.unique_species, icon: Star, color: '#f59e0b' },
                  { label: 'Medalhas', value: stats.medals_count, icon: Award, color: '#ec4899' },
                ].map((stat) => (
                  <div key={stat.label} className="glass p-6 rounded-[28px] border border-white/5 space-y-3 hover:bg-white/[0.05] transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                      <stat.icon size={20} />
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-black text-white">{stat.value}</p>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sub-Tab Navigation - Centered and aligned with Mural Feed */}
              <div className="max-w-3xl mx-auto w-full flex justify-center md:justify-start">
                <div className="flex gap-2 p-1.5 glass-elevated rounded-2xl border border-white/5 w-full md:w-fit overflow-x-auto no-scrollbar">
                  {[
                    { id: 'mural', label: 'Feed / Mural', icon: Megaphone },
                    { id: 'captures', label: 'Minhas Capturas', icon: Fish },
                    { id: 'fishdex', label: 'Álbum / Espécies', icon: Star },
                    { id: 'inscriptions', label: 'Torneios', icon: Trophy },
                    { id: 'achievements', label: 'Medalhas', icon: Award },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setProfileSubTab(tab.id as any)}
                      className={`py-2.5 px-5 md:px-6 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2.5 flex-1 md:flex-none whitespace-nowrap ${
                        profileSubTab === tab.id 
                          ? 'bg-accent text-dark shadow-lg shadow-accent/20' 
                          : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <tab.icon size={profileSubTab === tab.id ? 16 : 14} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Sub-Tab Content */}
              <div className="fade-in pt-4">
                {profileSubTab === 'mural' && (
                  <div className="max-w-3xl mx-auto space-y-8">
                    {(followedResorts.length > 0 || userCaptures.length > 0) ? (
                      <>
                        <div className="grid grid-cols-1 gap-8">
                          {/* Feed Items (Merged & Sorted) — Paginated */}
                          {[
                            ...followedResorts.map(r => ({ type: 'resort', date: r.created_at, data: r })),
                            ...userCaptures.map(c => ({ type: 'capture', date: c.captured_at, data: c })),
                          ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, visibleFeedCount).map((item, idx) => (
                            item.type === 'resort' ? (
                              <div key={`resort-${item.data.id}-${idx}`} className="relative glass-elevated rounded-[40px] border border-white/5 overflow-hidden flex flex-col group hover:border-accent/20 transition-all shadow-2xl">
                                {/* Card Header (Pesqueiro Info) */}
                                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                                   <div className="flex items-center gap-4">
                                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center p-2.5 shadow-inner">
                                         {item.data.photo_url ? (
                                           <img src={item.data.photo_url} className="w-full h-full object-cover rounded-lg" />
                                         ) : <Warehouse size={24} className="text-accent" />}
                                      </div>
                                      <div>
                                        <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">{item.data.title}</h4>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                           <span className="flex items-center gap-1"><MapPin size={10} className="text-accent"/> {item.data.water_type === 'river' ? 'Rio' : 'Lagos'}</span>
                                           {item.data.is_resort_partner && <span className="text-purple-400">◆ Parceiro Oficial</span>}
                                        </div>
                                      </div>
                                   </div>
                                   {item.data.resort_active_highlight && (
                                     <div className="hidden md:flex flex-col items-end">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">O que está batendo?</span>
                                        <span className="text-xs font-black text-amber-400 uppercase bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                                          🔥 {item.data.resort_active_highlight}
                                        </span>
                                     </div>
                                   )}
                                </div>

                                {/* Main Content Area (Notice Board) */}
                                <div className="p-8 space-y-6 relative">
                                   {/* Mural Box */}
                                   {item.data.resort_notice_board ? (
                                     <div className="relative">
                                        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-accent/30 rounded-full" />
                                        <p className="text-lg md:text-xl text-gray-200 font-medium leading-relaxed italic pl-6">
                                          "{item.data.resort_notice_board}"
                                        </p>
                                     </div>
                                   ) : (
                                     <div className="py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Nenhum aviso no momento</p>
                                     </div>
                                   )}

                                   {/* Infrastructure Shortcuts */}
                                   <div className="flex flex-wrap gap-3 pt-2">
                                      {item.data.resort_infrastructure?.restaurante && (
                                        <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                                          <Utensils size={14} className="text-accent" /> Restaurante
                                        </div>
                                      )}
                                      {item.data.resort_infrastructure?.pousada && (
                                        <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                                          <Warehouse size={14} className="text-accent" /> Hospedagem
                                        </div>
                                      )}
                                   </div>
                                </div>

                                {/* Card Footer (Actions) */}
                                <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                                   <div className="flex gap-6">
                                      <button className="flex items-center gap-2 group transition-all">
                                         <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-rose-500/10 group-hover:text-rose-500 transition-all text-gray-500">
                                           <Heart size={18} />
                                         </div>
                                         <span className="text-xs font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{item.data.likes_count || 0}</span>
                                      </button>
                                      <button className="flex items-center gap-2 group transition-all">
                                         <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:text-cyan-500 transition-all text-gray-500">
                                           <MessageSquare size={18} />
                                         </div>
                                         <span className="text-xs font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{item.data.comments_count || 0}</span>
                                      </button>
                                   </div>
                                   <a 
                                      href={`/radar?selectSpot=${item.data.id}`} 
                                      className="px-6 py-2.5 bg-accent/10 border border-accent/20 text-accent rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-dark transition-all flex items-center gap-2 group"
                                   >
                                      Ver no Mapa <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                   </a>
                                </div>
                              </div>
                            ) : (
                              <div key={`capture-${item.data.id}-${idx}`} className="relative glass-elevated rounded-[40px] border border-white/5 overflow-hidden flex flex-col hover:border-accent/20 transition-all shadow-2xl">
                                 {/* Capture Header (User & Spot) */}
                                 <div className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                          <Fish size={20} />
                                       </div>
                                       <div>
                                          <h4 className="text-sm font-black text-white uppercase tracking-wider">{item.data.species}</h4>
                                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                             <MapPin size={10} /> {item.data.spots?.title || 'Pesqueiro Parceiro'} • {new Date(item.data.captured_at).toLocaleDateString('pt-BR')}
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex gap-2">
                                       {item.data.is_trophy && <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-1 rounded-lg text-[8px] font-black uppercase">🏆 Troféu</span>}
                                       {item.data.was_released && <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-1 rounded-lg text-[8px] font-black uppercase">♻️ Solto</span>}
                                    </div>
                                 </div>

                                 {/* Capture Photo */}
                                 {item.data.photo_url ? (
                                    <div className="px-6">
                                       <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 group">
                                          <img src={item.data.photo_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                          <div className="absolute bottom-6 left-6 flex gap-4">
                                             {item.data.weight_kg && (
                                                <div className="flex flex-col">
                                                   <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1"><Scale size={12} /> Peso</span>
                                                   <span className="text-xl font-black text-white italic">{item.data.weight_kg}kg</span>
                                                </div>
                                             )}
                                             {item.data.length_cm && (
                                                <div className="flex flex-col border-l border-white/20 pl-4">
                                                   <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1"><Ruler size={12} /> Compr.</span>
                                                   <span className="text-xl font-black text-white italic">{item.data.length_cm}cm</span>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 ) : (
                                   <div className="px-6">
                                      <div className="h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5">
                                         <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Captura sem foto registrada 🎣</span>
                                      </div>
                                   </div>
                                 )}

                                 {/* Capture Notes & Social */}
                                 <div className="px-8 pb-8 pt-4 space-y-6">
                                    {item.data.notes && (
                                       <p className="text-sm text-gray-400 font-medium leading-relaxed italic border-l-2 border-accent/30 pl-4 bg-accent/5 py-3 rounded-r-2xl">
                                          "{item.data.notes}"
                                       </p>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                       <div className="flex gap-6">
                                          <button className="flex items-center gap-2 group transition-all">
                                             <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-rose-500/10 group-hover:text-rose-500 transition-all text-gray-500">
                                               <Heart size={18} />
                                             </div>
                                             <span className="text-xs font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{item.data.likes_count || 0}</span>
                                          </button>
                                          <button className="flex items-center gap-2 group transition-all">
                                             <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:text-cyan-500 transition-all text-gray-500">
                                               <MessageSquare size={18} />
                                             </div>
                                             <span className="text-xs font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{item.data.comments_count || 0}</span>
                                          </button>
                                       </div>
                                       <button className="text-gray-500 hover:text-white transition-colors">
                                          <Share2 size={18} />
                                       </button>
                                    </div>
                                 </div>
                                 {item.data.notes && (
                                    <div className="p-6 pt-4">
                                       <p className="text-sm text-gray-400 font-medium italic leading-relaxed">
                                          "{item.data.notes}"
                                       </p>
                                    </div>
                                 )}

                                 {/* Footer (Actions) */}
                                 <div className="px-6 py-4 flex items-center justify-between border-t border-white/5 bg-white/2">
                                    <div className="flex items-center gap-6">
                                       <button className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
                                          <Star size={16} className="group-hover:text-amber-400 transition-colors" />
                                          <span className="text-[10px] font-black">Curtir</span>
                                       </button>
                                       <button className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
                                          <MessageSquare size={16} />
                                          <span className="text-[10px] font-black">Comentar</span>
                                       </button>
                                    </div>
                                    <button className="text-gray-600 hover:text-white transition-colors">
                                       <Plus size={16} />
                                    </button>
                                 </div>
                              </div>
                            )
                          ))}
                        </div>

                        {/* Sentinel for infinite scroll */}
                        {visibleFeedCount < (followedResorts.length + userCaptures.length) && (
                          <div ref={feedSentinelRef} className="flex items-center justify-center py-10">
                            <div className="flex items-center gap-3 text-gray-500">
                              <Loader2 size={20} className="animate-spin text-accent" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Carregando mais...</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
                        <Megaphone size={48} className="text-gray-700 mx-auto mb-6 opacity-50" />
                        <h3 className="text-white font-black uppercase tracking-tighter text-xl mb-2 italic">Seu Mural está vazio</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto">Siga pesqueiros parceiros no mapa para receber avisos e promoções em tempo real.</p>
                      </div>
                    )}
                  </div>
                )}

                {profileSubTab === 'captures' && (
                  <div className="max-w-5xl mx-auto pb-10">
                    {userCaptures.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userCaptures.map((capture) => (
                          <div key={capture.id} className="glass-elevated group rounded-3xl overflow-hidden border border-white/5 hover:border-accent/30 transition-all hover:shadow-[0_0_30px_rgba(0,212,170,0.1)] flex flex-col">
                            <div className="h-44 relative bg-[#060a12] overflow-hidden flex-shrink-0">
                                {capture.is_trophy && (
                                  <div className="absolute top-3 left-3 z-10 bg-amber-500 text-black text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg flex items-center gap-1">
                                    <Trophy size={10} /> Troféu
                                  </div>
                                )}
                                {capture.photo_url ? (
                                  <img src={capture.photo_url} alt={capture.species} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                                    <Fish size={40} className="rotate-12" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent opacity-90" />
                                <div className="absolute bottom-3 left-4 right-4 text-white">
                                  <h3 className="font-black text-base truncate tracking-tight">{capture.species}</h3>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div className="bg-white/5 rounded-xl p-2 flex items-center gap-2 border border-white/5">
                                     <Scale size={13} className="text-accent" />
                                     <div className="flex flex-col">
                                       <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest leading-none">Peso</span>
                                       <span className="text-xs font-bold text-white mt-0.5">{capture.weight_kg || 0} kg</span>
                                     </div>
                                  </div>
                                  <div className="bg-white/5 rounded-xl p-2 flex items-center gap-2 border border-white/5">
                                    <Calendar size={13} className="text-accent" />
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest leading-none">Data</span>
                                      <span className="text-xs font-bold text-white mt-0.5">
                                        {new Date(capture.captured_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-gray-400 mt-1">
                                  <MapPin size={13} className="text-accent/70 mt-0.5 flex-shrink-0" />
                                  <span className="text-[10px] font-semibold leading-relaxed line-clamp-1">{capture.spots?.title || 'Pesqueiro'}</span>
                                </div>
                                <div className="mt-auto pt-2 flex flex-col gap-2">
                                   <button 
                                     onClick={() => setSelectedSpotForTrophy(capture.spots)}
                                     className="w-full py-2.5 bg-white/5 hover:bg-accent text-white hover:text-dark rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                   >
                                     <Trophy size={13} /> Gerar Troféu
                                   </button>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
                        <Fish size={48} className="text-gray-700 mx-auto mb-6 opacity-50" />
                        <h3 className="text-white font-black uppercase tracking-tighter text-xl mb-2 italic">Sem Capturas</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Suas fisgadas registradas no mapa aparecerão detalhadamente aqui.</p>
                      </div>
                    )}
                  </div>
                )}

                {profileSubTab === 'fishdex' && (
                  <div className="max-w-6xl mx-auto space-y-8 pb-10">
                     <div className="bg-gradient-to-r from-accent/20 to-brand/10 p-6 rounded-3xl border border-accent/20 relative overflow-hidden">
                        <div className="relative z-10 flex flex-col gap-2">
                           <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">Álbum de Espécies 📖</h2>
                           <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-xl">
                              Descubra todos os peixes do catálogo. Capture espécies diferentes para preencher seu álbum e ganhar medalhas exclusivas.
                              <span className="block mt-1.5 text-accent font-black">{species.filter(s => s.total_capturas > 0).length} / {species.length} Descobertos</span>
                           </p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {species.map(s => {
                          const isCaught = s.total_capturas > 0
                          return (
                            <div 
                              key={s.id}
                              onClick={() => setSelectedSpecies(s)}
                              className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-[1.02] border-2 group ${
                                isCaught ? 'border-accent/40 bg-accent/5' : 'border-white/5 bg-gray-900/50 grayscale opacity-40 hover:opacity-100'
                              }`}
                            >
                               <div className="absolute inset-x-0 top-6 bottom-[35%] flex items-center justify-center p-6">
                                  <img 
                                    src={s.imagem_url || 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'} 
                                    className={`max-w-full max-h-full object-contain ${isCaught ? 'drop-shadow-[0_0_15px_rgba(0,183,168,0.4)]' : 'contrast-0 brightness-0'}`} 
                                  />
                               </div>
                               <div className="absolute bottom-0 inset-x-0 p-4 pt-10 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end">
                                  <h3 className={`font-black uppercase text-xs tracking-tight ${isCaught ? 'text-white' : 'text-zinc-600'}`}>{s.nome_comum}</h3>
                                  <p className={`text-[8px] font-mono mt-0.5 ${isCaught ? 'text-accent' : 'text-zinc-700'}`}>{s.nome_cientifico}</p>
                                </div>
                               {isCaught && (
                                 <div className="absolute top-3 right-3 bg-accent text-dark px-2 rounded-full text-[9px] font-black z-20 shadow-lg">
                                    {s.total_capturas}x
                                 </div>
                               )}
                            </div>
                          )
                        })}
                     </div>
                  </div>
                )}

                {profileSubTab === 'inscriptions' && (
                  <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
                    <div className="space-y-4">
                      {inscriptions.length > 0 ? inscriptions.map((insc: any) => (
                        <div key={insc.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                           <div>
                              <p className="text-white font-bold text-sm">{insc.tournaments?.title}</p>
                              <p className="text-[10px] text-gray-500 uppercase font-black"><MapPin size={10} className="inline mr-1" /> {insc.tournaments?.fishing_resorts?.spots?.title || 'Local Oficial'}</p>
                           </div>
                           <div className="text-right">
                              <span className={`badge ${insc.tournaments?.status === 'open' ? 'badge-accent' : 'badge-gray'} text-[8px] mb-1`}>{insc.tournaments?.status === 'open' ? 'ABERTO' : 'ENCERRADO'}</span>
                              <p className="text-[10px] text-accent font-black">{new Date(insc.tournaments?.event_date).toLocaleDateString('pt-BR')}</p>
                           </div>
                        </div>
                      )) : (
                        <div className="py-20 text-center">
                          <Trophy size={32} className="text-gray-700 mx-auto mb-4" />
                          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Nenhuma inscrição em torneios</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {profileSubTab === 'achievements' && (
                  <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                       {achievements.length > 0 ? achievements.map((ua: any) => (
                          <div key={ua.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                                  {ua.achievements.icon_name === 'Fish' && <Fish size={18} />}
                                  {ua.achievements.icon_name === 'Trophy' && <Trophy size={18} />}
                                  {ua.achievements.icon_name === 'MapPin' && <MapPin size={18} />}
                               </div>
                               <div>
                                  <p className="text-white font-bold text-sm">{ua.achievements.name}</p>
                                  <p className="text-[10px] text-gray-500 uppercase font-black">{ua.achievements.description}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-accent font-black">{new Date(ua.earned_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                       )) : (
                        <div className="py-20 text-center">
                          <Award size={32} className="text-gray-700 mx-auto mb-4" />
                          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Nenhuma medalha conquistada</p>
                        </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-8 fade-in">
               <div className="glass p-10 rounded-[40px] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                     <div className="w-24 h-24 md:w-32 md:h-32 rounded-[32px] bg-accent/10 flex items-center justify-center text-accent"><Warehouse size={48} /></div>
                     <div className="flex-1 text-center md:text-left space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter">Gestão de Pesqueiros</h2>
                        <p className="text-gray-400 max-w-xl">Transforme seu pesqueiro em um ponto oficial e gerencie eventos, torneios e anúncios em tempo real.</p>
                        {!isResortOwner ? (
                           <button onClick={() => setShowResortForm(true)} className="btn-primary" style={{ padding: '12px 24px', borderRadius: 16 }}><Plus size={20} /> Cadastrar Pesqueiro</button>
                        ) : (
                           <a href="/resort-admin" className="btn-primary" style={{ padding: '12px 24px', borderRadius: 16 }}>Painel Administrativo <ArrowRight size={18} className="ml-2" /></a>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </>
      )}

        </div>
      </main>

      {showResortForm && (
         <NewResortForm 
            userId={user?.id}
            isOnline={isOnline}
            onClose={() => setShowResortForm(false)}
            onSuccess={() => { setShowResortForm(false); fetchProfileData(); }}
         />
      )}

      {/* MODAL FICHA TÉCNICA (Fishdex) */}
      {selectedSpecies && (
        <div 
          className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm fade-in p-4"
          onClick={() => setSelectedSpecies(null)}
        >
          <div 
            className="w-full max-w-lg bg-[#0a0f1a] sm:rounded-[40px] rounded-t-[40px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className={`relative h-48 bg-gradient-to-br ${selectedSpecies.total_capturas > 0 ? 'from-accent/20 to-[#0a0f1a]' : 'from-gray-900 to-[#0a0f1a]'} p-8 flex flex-col justify-between overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full -mr-20 -mt-20" />
              <div className="flex justify-between items-start relative z-10">
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white flex items-center gap-2 border border-white/10 uppercase tracking-widest">
                  <MapPin size={12} className="text-accent" /> {selectedSpecies.habitat}
                </div>
              </div>
              <div className="absolute bottom-[-10%] inset-x-0 flex justify-center pointer-events-none">
                <img 
                  src={selectedSpecies.imagem_url} 
                  className={`h-40 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] ${selectedSpecies.total_capturas > 0 ? '' : 'brightness-0 opacity-20'}`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar">
              <div className="text-center">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{selectedSpecies.nome_comum}</h2>
                <p className="text-xs font-mono text-accent mt-2 uppercase tracking-widest">{selectedSpecies.nome_cientifico}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white/5 p-5 rounded-[28px] border border-accent/20 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-accent font-black text-[10px] uppercase tracking-widest"><Info size={14} /> Dica do Pro</div>
                  <p className="text-sm text-gray-300 leading-relaxed italic">&quot;{selectedSpecies.dica_pro}&quot;</p>
                  {selectedSpecies.isca_favorita && (
                    <div className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5 self-start">
                      🎣 Iscas: <span className="text-white">{selectedSpecies.isca_favorita}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-1 group">
                     <Trophy size={16} className="text-amber-500 mb-1" />
                     <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Recorde I.G.F.A</span>
                     <span className="text-sm font-black text-white">{selectedSpecies.peso_recorde_kg}kg</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-1">
                     <Scale size={16} className="text-red-500 mb-1" />
                     <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Tamanho Mínimo</span>
                     <span className="text-sm font-black text-white">{selectedSpecies.tamanho_minimo_cm || '--'}cm</span>
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedSpecies(null)} className="btn-secondary w-full py-4 mt-4 font-black uppercase tracking-widest text-[10px]">Fechar Ficha</button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Trophy Card Modal */}
      {selectedSpotForTrophy && user && (
        <TrophyCardModal
          isOpen={true}
          onClose={() => setSelectedSpotForTrophy(null)}
          spot={selectedSpotForTrophy}
          userId={user.id}
        />
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; margin: 2px 0; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,212,170,0.5); border-radius: 10px; border: 3px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,212,170,0.8); border: 3px solid transparent; background-clip: padding-box; }
        .custom-scrollbar { scrollbar-width: auto; scrollbar-color: rgba(0,212,170,0.5) rgba(255,255,255,0.05); }
      `}</style>
    </div>
  )
}
