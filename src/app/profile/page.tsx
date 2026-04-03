'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { 
  User, Trophy, Fish, MapPin, Calendar, Star, TrendingUp, Award, 
  Clock, Warehouse, Plus, ArrowRight, Megaphone, Utensils, MessageSquare, 
  Scale, Ruler, ChevronRight, Image as ImageIcon, Info, Loader2, 
  AlertCircle, Heart, Share2, Users, UserPlus, UserMinus, Search, Building, ShieldOff
} from 'lucide-react'
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
  const [profileSubTab, setProfileSubTab] = useState<'mural' | 'captures' | 'fishdex' | 'inscriptions' | 'achievements' | 'social'>('mural')
  const [userCaptures, setUserCaptures] = useState<any[]>([])
  const [friendsCaptures, setFriendsCaptures] = useState<any[]>([])
  const [species, setSpecies] = useState<any[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<any | null>(null)
  const [selectedSpotForTrophy, setSelectedSpotForTrophy] = useState<any>(null)
  const [visibleFeedCount, setVisibleFeedCount] = useState(4)
  const feedSentinelRef = useRef<HTMLDivElement>(null)

  // Social States
  const [socialSearch, setSocialSearch] = useState('')
  const [friends, setFriends] = useState<any[]>([])
  const [followingResorts, setFollowingResorts] = useState<any[]>([])
  const [foundUsers, setFoundUsers] = useState<any[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

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
    fetchFollowedResortPosts()
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
    const supabase = getSupabaseClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setUser(user)
      
      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      setProfile(profileData)

      // Fetch Achievements
      const { data: userAch } = await supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', user.id)
      
      if (userAch) setAchievements(userAch)

      // Fetch Social Data (Follows & Friends)
      const { data: followsData } = await supabase
        .from('follows')
        .select('*, followed:following_id(*)')
        .eq('follower_id', user.id)
      if (followsData) setFriends(followsData)

      const { data: resortFollowsData } = await supabase
        .from('resort_follows')
        .select('*, fishing_resorts(*, spots(title))')
        .eq('user_id', user.id)
      if (resortFollowsData) setFollowingResorts(resortFollowsData)

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
      
      if (userInscriptions) setInscriptions(userInscriptions)

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

        // Fetch Friends Feed
        if (followsData && followsData.length > 0) {
          const followingIds = followsData.map((f: any) => f.following_id)
          const { data: fCaptures } = await supabase
            .from('captures')
            .select('*, spots(title), profiles:user_id(username, display_name, avatar_url, level), interactions(type, user_id)')
            .in('user_id', followingIds)
            .order('captured_at', { ascending: false })
            .limit(20)
          if (fCaptures) setFriendsCaptures(fCaptures)
        }
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

  // Social Actions
  const handleSearchUsers = async () => {
    if (!socialSearch.trim()) return
    setSearchingUsers(true)
    const supabase = getSupabaseClient() as any
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${socialSearch}%,username.ilike.%${socialSearch}%`)
      .limit(10)
    if (data) setFoundUsers((data as any[]).filter(u => u.id !== user?.id))
    setSearchingUsers(false)
  }

  const toggleFollowUser = async (followedId: string, isFollowing: boolean) => {
    if (!user) return
    const supabase = getSupabaseClient() as any
    if (isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: followedId })
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: followedId })
    }
    fetchProfileData()
  }

  const unfollowSpot = async (resortId: string) => {
    if (!user) return
    const supabase = getSupabaseClient() as any
    await supabase.from('resort_follows').delete().match({ user_id: user.id, resort_id: resortId })
    fetchProfileData()
  }

  const handleLike = async (itemId: string) => {
    if (!user) return
    
    // Optimistic UI Update
    let isLiking = true
    
    const updateFeedList = (list: any[]) => list.map(c => {
      if (c.id === itemId) {
        const hasLiked = c.interactions?.some((i: any) => i.user_id === user.id && i.type === 'like')
        isLiking = !hasLiked
        
        let newInteractions = c.interactions || []
        if (isLiking) {
          newInteractions = [...newInteractions, { user_id: user.id, type: 'like' }]
        } else {
          newInteractions = newInteractions.filter((i: any) => !(i.user_id === user.id && i.type === 'like'))
        }
        
        return {
          ...c,
          likes_count: Math.max(0, (c.likes_count || 0) + (isLiking ? 1 : -1)),
          interactions: newInteractions
        }
      }
      return c
    })

    setUserCaptures(updateFeedList(userCaptures))
    setFriendsCaptures(updateFeedList(friendsCaptures))

    // Background Database Update
    const supabase = getSupabaseClient() as any
    try {
      const { data: existing } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('capture_id', itemId)
        .eq('type', 'like')
        .maybeSingle()

      if (existing && !isLiking) {
        await supabase.from('interactions').delete().eq('id', (existing as any).id)
      } else if (!existing && isLiking) {
        await supabase.from('interactions').insert({
          user_id: user.id,
          capture_id: itemId,
          type: 'like'
        })
      }
    } catch (e) {
      console.error('Erro ao curtir:', e)
      // On error, let the next refresh correct the state.
    }
  }

  const handleComment = (itemId: string) => {
    alert('Funcionalidade de comentários em breve! 🎣')
  }

  const handleShare = (itemId: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Fishgada - Confira esta captura!',
        text: 'Veja essa fisgada incrível no Fishgada!',
        url: window.location.href
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copiado! 🚀')
    }
  }

  const fetchSpecies = async () => {
    try {
      const supabase = getSupabaseClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: speciesData } = await supabase.from('species').select('*').eq('is_active', true)
      const { data: capturesData } = await supabase.from('captures').select('id, species, length_cm, weight_kg, captured_at, photo_url').eq('user_id', user.id)

      if (speciesData) {
        const userCaptures = (capturesData || []) as any[]
        const mergedAlbum = speciesData.map((s: any) => {
          const myCatches = userCaptures.filter((c: any) => {
            const captName = c.species?.split(' (')[0].trim().toLowerCase();
            const specName = s.nome_comum?.split(' (')[0].trim().toLowerCase();
            return captName === specName;
          })
          const userPhoto = myCatches.find((c: any) => c.photo_url)?.photo_url
          return {
            ...s,
            imagem_url: userPhoto || s.imagem_url,
            total_capturas: myCatches.length,
            maior_tamanho_capturado_cm: myCatches.length > 0 ? Math.max(...myCatches.map((c: any) => c.length_cm || 0)) : null,
            maior_peso_capturado_kg: myCatches.length > 0 ? Math.max(...myCatches.map((c: any) => c.weight_kg || 0)) : null,
          }
        })
        setSpecies(mergedAlbum.sort((a: any, b: any) => {
          if (a.total_capturas > 0 && b.total_capturas === 0) return -1;
          if (a.total_capturas === 0 && b.total_capturas > 0) return 1;
          return a.nome_comum.localeCompare(b.nome_comum);
        }))
      }
    } catch (e) { console.error(e) }
  }

  const fetchFollowedResortPosts = async () => {
    const ids = JSON.parse(localStorage.getItem('followed_spots') || '[]')
    if (ids.length === 0) {
      setFollowedResorts([])
      return
    }
    const supabase = getSupabaseClient() as any
    const { data } = await supabase.from('resort_posts').select('*').in('resort_id', ids).order('created_at', { ascending: false }).limit(10)
    if (data) setFollowedResorts(data)
  }

  const handleUpdateProfile = async () => {
    const supabase = getSupabaseClient() as any
    const { error } = await supabase.from('profiles').update(editForm).eq('id', user.id)
    if (error) alert('Erro ao atualizar: ' + error.message)
    else {
      setIsEditing(false)
      fetchProfileData()
    }
  }

  const userRank = getRankByLevel(profile?.level || 1)
  const xpProgress = Math.min(100, (profile?.xp_points % 500) / 5)
  const nextXP = (Math.floor((profile?.xp_points || 0) / 500) + 1) * 500

  const BRAZILIAN_STATES = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-32 pt-20 md:pt-12">
        <div className="max-w-5xl mx-auto space-y-8 fade-in">
          
          {/* Tab Navigation */}
          <div className="flex items-center gap-6 border-b border-white/5 pb-1">
             <button onClick={() => setActiveTab('general')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'general' ? 'text-accent' : 'text-gray-500 hover:text-white'}`}>
                Pescador {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent shadow-[0_0_10px_rgba(0,212,170,0.8)]" />}
             </button>
             <button onClick={() => setActiveTab('business')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'business' ? 'text-accent' : 'text-gray-500 hover:text-white'}`}>
                Meu Pesqueiro {activeTab === 'business' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent shadow-[0_0_10px_rgba(0,212,170,0.8)]" />}
             </button>
          </div>

          {activeTab === 'general' ? (
            <>
              {/* Header Card */}
              <div className="relative glass-elevated rounded-[40px] p-8 md:p-12 border border-white/5 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="relative">
                    <div className="w-32 h-32 md:w-44 md:h-44 rounded-[48px] overflow-hidden p-1.5 shadow-2xl" style={{ background: `linear-gradient(135deg, ${userRank.color}, transparent)` }}>
                      <div className="w-full h-full rounded-[42px] overflow-hidden bg-slate-900 border border-white/10">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : <User className="w-full h-full p-10 text-gray-500" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    {!isEditing ? (
                      <>
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">{profile?.display_name || 'Pescador'}</h1>
                        <p className="text-accent font-bold text-xs flex items-center justify-center md:justify-start gap-1 uppercase tracking-widest">
                          <MapPin size={12} /> {profile?.city || '---'}, {profile?.state || '---'}
                        </p>
                        <p className="text-gray-400 font-medium max-w-xl">{profile?.bio || 'Sem bio disponível.'}</p>
                      </>
                    ) : (
                      <div className="space-y-4 max-w-xl">
                        <input value={editForm.display_name} onChange={e => setEditForm({...editForm, display_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white" placeholder="Nome" />
                        <div className="grid grid-cols-2 gap-2">
                          <input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white" placeholder="Cidade" />
                          <select value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white">
                            {BRAZILIAN_STATES.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
                          </select>
                        </div>
                        <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white resize-none" placeholder="Bio" />
                      </div>
                    )}
                    <div className="pt-2 flex items-center justify-center md:justify-start gap-3">
                       <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                          <userRank.icon size={14} style={{ color: userRank.color }} />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: userRank.color }}>{userRank.title}</span>
                       </div>
                       {!isEditing ? (
                         <button onClick={() => setIsEditing(true)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Editar Perfil</button>
                       ) : (
                         <div className="flex gap-3">
                           <button onClick={handleUpdateProfile} className="text-[10px] font-black uppercase tracking-widest text-accent">Salvar</button>
                           <button onClick={() => setIsEditing(false)} className="text-[10px] font-black uppercase tracking-widest text-red-500">Cancelar</button>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Capturas', value: stats.total_captures, icon: Fish, color: '#00d4aa' },
                  { label: 'Peso Total', value: `${stats.total_weight}kg`, icon: TrendingUp, color: '#3b82f6' },
                  { label: 'Espécies', value: stats.unique_species, icon: Star, color: '#f59e0b' },
                  { label: 'Medalhas', value: stats.medals_count, icon: Award, color: '#ec4899' },
                ].map((stat) => (
                  <div key={stat.label} className="glass p-6 rounded-[28px] border border-white/5 flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent mb-3" style={{ color: stat.color }}>
                      <stat.icon size={20} />
                    </div>
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Sub-Tabs Nav */}
              <div className="flex items-center gap-2 p-1.5 glass rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'mural', label: 'Feed', icon: Megaphone },
                  { id: 'social', label: 'Comunidade', icon: Users },
                  { id: 'captures', label: 'Minhas Fotos', icon: ImageIcon },
                  { id: 'fishdex', label: 'Fishdex', icon: Fish },
                  { id: 'inscriptions', label: 'Torneios', icon: Trophy },
                  { id: 'achievements', label: 'Medalhas', icon: Award },
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setProfileSubTab(tab.id as any)} className={`py-3 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${profileSubTab === tab.id ? 'bg-accent text-dark shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub-Tab Content */}
              <div className="fade-in">
                 {profileSubTab === 'social' && (
                    <div className="space-y-8">
                       {/* Search Section */}
                       <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
                          <div className="flex items-center gap-4">
                             <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input 
                                  type="text" 
                                  placeholder="Buscar novos amigos..." 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-accent/40"
                                  value={socialSearch}
                                  onChange={e => setSocialSearch(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleSearchUsers()}
                                />
                             </div>
                             <button onClick={handleSearchUsers} className="bg-accent text-dark px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95">
                                {searchingUsers ? <Loader2 size={18} className="animate-spin" /> : 'Buscar'}
                             </button>
                          </div>

                          {foundUsers.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {foundUsers.map((u: any) => {
                                 const isFollow = friends.some(f => f.following_id === u.id)
                                 return (
                                   <div key={u.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full p-2 text-gray-600" />}
                                         </div>
                                         <div className="min-w-0">
                                            <p className="text-white font-black uppercase text-[10px] tracking-tight truncate">{u.display_name}</p>
                                            <p className="text-[9px] text-gray-500">@{u.username}</p>
                                         </div>
                                      </div>
                                      <button onClick={() => toggleFollowUser(u.id, isFollow)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${isFollow ? 'border border-white/10 text-gray-500' : 'bg-accent text-dark'}`}>
                                         {isFollow ? 'Seguindo' : 'Seguir'}
                                      </button>
                                   </div>
                                 )
                               })}
                            </div>
                          )}
                       </div>

                       {/* Lists Section */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Seguindo */}
                          <div className="space-y-4">
                             <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 ml-4">
                               <Users size={14} className="text-accent" /> Amigos ({friends.length})
                             </h3>
                             <div className="space-y-2">
                               {friends.length === 0 ? (
                                 <div className="p-8 text-center glass rounded-3xl border border-white/5 text-gray-600 text-[10px] font-black uppercase italic">Ninguém seguido ainda</div>
                               ) : (
                                 friends.map((f: any) => (
                                   <div key={f.id} className="p-4 glass rounded-[24px] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                      <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                                           {f.followed?.avatar_url ? <img src={f.followed.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full p-2 text-gray-700" />}
                                         </div>
                                         <p className="text-white font-black text-[10px] uppercase">{f.followed?.display_name || 'Amigo'}</p>
                                      </div>
                                      <button onClick={() => toggleFollowUser(f.following_id, true)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg">
                                         <UserMinus size={16} />
                                      </button>
                                   </div>
                                 ))
                               )}
                             </div>
                          </div>

                          {/* Pesqueiros */}
                          <div className="space-y-4">
                             <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 ml-4">
                               <Building size={14} className="text-accent" /> Pesqueiros ({followingResorts.length})
                             </h3>
                             <div className="space-y-2">
                               {followingResorts.length === 0 ? (
                                 <div className="p-8 text-center glass rounded-3xl border border-white/5 text-gray-600 text-[10px] font-black uppercase italic">Nenhum pesqueiro seguido</div>
                               ) : (
                                 followingResorts.map((s: any) => (
                                   <div key={s.id} className="p-4 glass rounded-[24px] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                      <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                           <Building size={20} />
                                         </div>
                                         <p className="text-white font-black text-[10px] uppercase truncate">{s.fishing_resorts?.spots?.title || 'Resort'}</p>
                                      </div>
                                      <button onClick={() => unfollowSpot(s.resort_id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg">
                                         <ShieldOff size={16} />
                                      </button>
                                   </div>
                                 ))
                               )}
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {profileSubTab === 'mural' && (
                    <div className="grid grid-cols-1 gap-8">
                       {/* feed logic remains... */}
                       <div className="space-y-8">
                          {[
                            ...userCaptures.map(c => ({ type: 'capture', date: c.captured_at, data: c })),
                            ...friendsCaptures.map(c => ({ type: 'friend_capture', date: c.captured_at, data: c }))
                          ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, visibleFeedCount).map((item, idx) => (
                            <div key={idx} className="glass rounded-[40px] border border-white/5 overflow-hidden">
                               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                        {item.type === 'capture' 
                                          ? (profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="p-2"/>)
                                          : (item.data.profiles.avatar_url ? <img src={item.data.profiles.avatar_url} className="w-full h-full object-cover" /> : <User className="p-2"/>)
                                        }
                                     </div>
                                     <div>
                                        <p className="text-white font-black uppercase text-xs">
                                          {item.type === 'capture' ? (profile?.display_name || 'Pescador') : item.data.profiles.display_name}
                                        </p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                                     </div>
                                  </div>
                               </div>
                               <div className="aspect-video bg-slate-900">
                                  {item.data.photo_url ? (
                                    <img src={item.data.photo_url} className="w-full h-full object-cover" />
                                  ) : <div className="w-full h-full flex items-center justify-center text-white/5"><Fish size={80}/></div>}
                               </div>
                               <div className="p-6 space-y-4">
                                  <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">{item.data.species}</h4>
                                  <div className="flex items-center gap-6 text-[10px] font-black uppercase text-accent tracking-widest">
                                     <span className="flex items-center gap-2"><Scale size={14}/> {item.data.weight_kg}kg</span>
                                     <span className="flex items-center gap-2"><Ruler size={14}/> {item.data.length_cm}cm</span>
                                     <span className="flex items-center gap-2"><MapPin size={14}/> {item.data.spots?.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 pt-2">
                                     <button onClick={() => handleLike(item.data.id)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:border-accent transition-all">
                                        <Heart size={16} className={item.data.interactions?.some((i: any) => i.user_id === user?.id && i.type === 'like') ? 'fill-red-500 text-red-500' : ''}/> {item.data.likes_count || 0}
                                     </button>
                                     <button onClick={() => handleComment(item.data.id)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:border-accent transition-all">
                                        <MessageSquare size={16}/> {item.data.comments_count || 0}
                                     </button>
                                  </div>
                               </div>
                            </div>
                          ))}
                          <div ref={feedSentinelRef} className="h-20" />
                       </div>
                    </div>
                 )}

                 {profileSubTab === 'fishdex' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {species.map(s => (
                          <div key={s.id} className={`glass p-4 rounded-3xl border border-white/5 relative overflow-hidden transition-all hover:scale-[1.02] ${s.total_capturas > 0 ? 'bg-accent/5' : 'grayscale opacity-40'}`}>
                             <div className="aspect-square rounded-2xl bg-slate-900 border border-white/5 mb-3 overflow-hidden flex items-center justify-center">
                                {s.imagem_url ? <img src={s.imagem_url} className="w-full h-full object-cover" /> : <Fish size={40} className="text-white/5" />}
                             </div>
                             <h5 className="text-[10px] font-black text-white uppercase tracking-tight truncate">{s.nome_comum}</h5>
                             <div className="flex items-center justify-between mt-2">
                                <span className="text-[8px] font-black text-accent uppercase">{s.total_capturas} Fiscadas</span>
                                <Star size={10} className={s.total_capturas > 0 ? 'text-amber-500 fill-amber-500' : 'text-gray-700'} />
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center">
               <Warehouse size={80} className="mx-auto text-gray-800 mb-6" />
               <h3 className="text-xl font-black text-gray-400 uppercase italic">Área de Pesqueiro Parceiro</h3>
               <p className="text-gray-600 mt-2">Em breve: Gerencie seu resort e crie eventos exclusivos.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
