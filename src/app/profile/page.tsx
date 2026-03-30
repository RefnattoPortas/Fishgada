'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { User, Trophy, Fish, MapPin, Calendar, Star, TrendingUp, Award, Clock, Warehouse, Plus, ArrowRight, Megaphone, Utensils } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getRankByLevel } from '@/lib/utils/ranks'
import NewResortForm from '@/components/map/NewResortForm'

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
  const [profileSubTab, setProfileSubTab] = useState<'mural' | 'inscriptions' | 'achievements'>('mural')

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    city: '',
    state: ''
  })

  useEffect(() => {
    fetchProfileData()
    fetchFollowedResorts()
    
    // Check tab from URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'business') {
      setActiveTab('business')
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

      // Fetch Captures for Stats
      const { data: captures } = await supabase
        .from('captures')
        .select('species, weight_kg')
        .eq('user_id', user.id)

      if (captures && captures.length > 0) {
        const captureList = captures as any[]
        const uniqueSpecies = new Set(captureList.map((c: any) => c.species)).size
        const totalWeight = captureList.reduce((acc: number, c: any) => acc + (c.weight_kg || 0), 0)
        
        setStats({
          total_captures: captures.length,
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

              {/* Sub-Tab Navigation */}
              <div className="flex gap-4 border-b border-white/5 pb-1">
                {[
                  { id: 'mural', label: 'Feed/Mural', icon: Megaphone },
                  { id: 'inscriptions', label: 'Inscrições', icon: Trophy },
                  { id: 'achievements', label: 'Medalhas', icon: Award },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setProfileSubTab(tab.id as any)}
                    className={`pb-3 px-1 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${profileSubTab === tab.id ? 'text-accent' : 'text-gray-500 hover:text-white'}`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                    {profileSubTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent" />}
                  </button>
                ))}
              </div>

              {/* Sub-Tab Content */}
              <div className="fade-in">
                {profileSubTab === 'mural' && (
                  <div className="space-y-6">
                    {followedResorts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {followedResorts.map(resort => (
                          <div key={resort.id} className="relative glass rounded-[32px] border border-white/5 overflow-hidden flex flex-col group hover:border-accent/30 transition-all">
                            <div className="h-20 bg-gradient-to-r from-accent/10 to-blue-500/10 relative">
                               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '12px 12px' }} />
                               <div className="absolute bottom-0 left-6 translate-y-1/2">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border-2 border-[#0a0f1a] flex items-center justify-center p-2 shadow-xl">
                                     {resort.photo_url ? (
                                       <img src={resort.photo_url} className="w-full h-full object-cover rounded-lg" />
                                     ) : <Warehouse size={20} className="text-accent" />}
                                  </div>
                               </div>
                            </div>
                            <div className="p-6 pt-10 space-y-3">
                               <div className="flex items-center justify-between">
                                  <h4 className="text-lg font-black text-white truncate">{resort.title}</h4>
                                  {resort.resort_active_highlight && (
                                    <span className="text-[9px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                      {resort.resort_active_highlight}
                                    </span>
                                  )}
                               </div>
                               {resort.resort_notice_board ? (
                                 <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                   <p className="text-xs text-gray-300 italic leading-relaxed">"{resort.resort_notice_board}"</p>
                                 </div>
                               ) : (
                                 <p className="text-[11px] text-gray-500 font-medium italic">Nenhum recado no mural ainda.</p>
                               )}
                               <div className="flex items-center justify-between pt-2">
                                 <div className="flex gap-2">
                                    {resort.resort_infrastructure?.restaurante && <Utensils size={14} className="text-gray-600" />}
                                    {resort.resort_infrastructure?.pousada && <Warehouse size={14} className="text-gray-600" />}
                                 </div>
                                 <a href={`/radar?selectSpot=${resort.id}`} className="text-[10px] font-black uppercase text-accent hover:underline flex items-center gap-1">Ver no Mapa <ArrowRight size={12} /></a>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[32px]">
                        <Megaphone size={32} className="text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Siga pesqueiros no mapa para ver as novidades aqui</p>
                      </div>
                    )}
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
        </div>

        {showResortForm && (
           <NewResortForm 
              userId={user?.id}
              isOnline={isOnline}
              onClose={() => setShowResortForm(false)}
              onSuccess={() => { setShowResortForm(false); fetchProfileData(); }}
           />
        )}
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>
    </div>
  )
}
