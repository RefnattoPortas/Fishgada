'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { User, Trophy, Fish, MapPin, TrendingUp, Award, UserPlus, UserMinus, Star, Megaphone, Scale, Calendar } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getRankByLevel } from '@/lib/utils/ranks'
import { Profile } from '@/types/database'
import { use } from 'react'

interface OtherProfilePageProps {
  params: Promise<{ username: string }>
}

export default function OtherProfilePage({ params }: OtherProfilePageProps) {
  const { username } = use(params)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [stats, setStats] = useState({
    total_captures: 0,
    total_weight: 0,
    unique_species: 0,
    medals_count: 0
  })
  const [achievements, setAchievements] = useState<any[]>([])
  const [userCaptures, setUserCaptures] = useState<any[]>([])
  const [inscriptions, setInscriptions] = useState<any[]>([])
  const [profileSubTab, setProfileSubTab] = useState<'mural' | 'captures' | 'inscriptions' | 'achievements'>('mural')
  const [loading, setLoading] = useState(true)

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchProfileData()
  }, [username])

  const fetchProfileData = async () => {
    setLoading(true)
    try {
      const { data: { user: me } } = await supabase.auth.getUser()
      setCurrentUser(me)

      // Fetch Profile by username
      const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()
      
      if (pError) throw pError
      const profileData = pData as any
      setProfile(profileData)

      if (me && profileData) {
        // Check if I'm following
        const { data: follow } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', me.id)
          .eq('following_id', (profileData as any).id)
          .single()
        setIsFollowing(!!follow)
      }

      // Fetch Achievements
      const { data: userAch } = await supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', (profileData as any).id)
      setAchievements((userAch as any[]) || [])

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
        .eq('user_id', (profileData as any).id)
        .order('created_at', { ascending: false })
      if (userInscriptions) setInscriptions(userInscriptions)

      // Fetch Full Captures
      const { data: captures } = await supabase
        .from('captures')
        .select('*, spots(title)')
        .eq('user_id', (profileData as any).id)
        .order('captured_at', { ascending: false })
      
      if (captures) {
        setUserCaptures(captures)
        const captureList = captures as any[]
        setStats({
          total_captures: captures.length,
          total_weight: Math.round(captureList.reduce((acc, c) => acc + (c.weight_kg || 0), 0) * 10) / 10,
          unique_species: new Set(captureList.map(c => c.species)).size,
          medals_count: userAch?.length || 0
        })
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
        setIsFollowing(false)
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profile.id
          } as any)
        setIsFollowing(true)
      }
    } catch (err) {
      console.error('Erro ao seguir/parar de seguir:', err)
    }
  }

  if (loading) return null

  if (!profile) return (
    <div className="flex w-screen h-screen items-center justify-center bg-[#0a0f1a] text-white">
      <Sidebar />
      <div className="text-center space-y-4">
        <User size={64} className="mx-auto text-gray-800" />
        <p className="font-bold uppercase tracking-widest text-gray-500">Pescador não encontrado</p>
      </div>
    </div>
  )

  const userRank = getRankByLevel(profile.level || 1)

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-10 fade-in">
          
          {/* Hero Profile Header */}
          <div className="relative glass-elevated rounded-[40px] p-8 md:p-12 border border-white/5 overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full -mr-32 -mt-32" />
            
            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Avatar Big */}
              <div className="relative">
                <div 
                  className="w-32 h-32 md:w-44 md:h-44 rounded-[48px] overflow-hidden p-1.5 shadow-2xl"
                  style={{ background: `linear-gradient(135deg, ${userRank.color}, transparent)` }}
                >
                  <div className="w-full h-full rounded-[42px] overflow-hidden bg-slate-900 border border-white/10">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover" />
                    ) : <User className="w-full h-full p-10 text-gray-500" />}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full w-fit mx-auto md:mx-0">
                    <userRank.icon size={16} style={{ color: userRank.color }} />
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]" style={{ color: userRank.color }}>
                      {userRank.title}
                    </span>
                  </div>
                  
                  {currentUser && currentUser.id !== profile.id && (
                    <button 
                      onClick={handleFollowToggle}
                      className={`px-6 py-2.5 rounded-xl border font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 mx-auto md:mx-0 shadow-lg ${
                        isFollowing 
                        ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30' 
                        : 'bg-accent text-dark border-accent/20 hover:brightness-110 shadow-accent/20'
                      }`}
                    >
                      {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                      {isFollowing ? 'Remover Amigo' : 'Adicionar Amigo'}
                    </button>
                  )}
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none italic">
                  {profile.display_name || profile.username || 'Pescador'}
                </h1>
                
                <p className="text-accent font-bold text-xs flex items-center justify-center md:justify-start gap-1">
                  <MapPin size={12} /> {profile.city || '---'}, {profile.state || '---'}
                </p>
                
                <p className="text-gray-400 font-medium text-sm md:text-base max-w-xl">
                  {profile.bio || 'Sem biografia disponível.'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Capturas', value: stats.total_captures, icon: Fish, color: '#00d4aa' },
              { label: 'Peso Total (kg)', value: stats.total_weight, icon: TrendingUp, color: '#3b82f6' },
              { label: 'Espécies Únicas', value: stats.unique_species, icon: Star, color: '#f59e0b' },
              { label: 'Amigos', value: '---', icon: User, color: '#ec4899' },
            ].map((stat) => (
              <div key={stat.label} className="glass p-6 rounded-[28px] border border-white/5 space-y-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                >
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
          <div className="w-full flex justify-center md:justify-start">
            <div className="flex gap-2 p-1.5 glass-elevated rounded-2xl border border-white/5 w-full md:w-fit overflow-x-auto no-scrollbar">
              {[
                { id: 'mural', label: 'Mural', icon: Megaphone },
                { id: 'captures', label: 'Capturas', icon: Fish },
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

          <div className="fade-in pt-4">
             {profileSubTab === 'mural' && (
                <div className="w-full space-y-8">
                  {userCaptures.length > 0 ? (
                    <div className="grid grid-cols-1 gap-8">
                       {userCaptures.map((capture, idx) => (
                          <div key={`mural-${capture.id}-${idx}`} className="relative glass-elevated rounded-[40px] border border-white/5 overflow-hidden flex flex-col hover:border-accent/20 transition-all shadow-2xl">
                             <div className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                                      <Fish size={20} />
                                   </div>
                                   <div>
                                      <h4 className="text-sm font-black text-white uppercase tracking-wider">{capture.species}</h4>
                                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                         <MapPin size={10} className="flex-shrink-0" /> {capture.spots?.title || 'Pesqueiro'} • {new Date(capture.captured_at).toLocaleDateString('pt-BR')}
                                      </p>
                                   </div>
                                </div>
                                <div className="flex gap-2">
                                   {capture.is_trophy && <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-1 rounded-lg text-[8px] font-black uppercase">🏆 Troféu</span>}
                                   {capture.was_released && <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-1 rounded-lg text-[8px] font-black uppercase">♻️ Solto</span>}
                                </div>
                             </div>
                             {capture.photo_url ? (
                                <div className="px-6">
                                   <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 group">
                                      <img src={capture.photo_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                      <div className="absolute bottom-6 left-6 flex gap-4">
                                         {capture.weight_kg && (
                                            <div className="flex flex-col">
                                               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1"><Scale size={12} /> Peso</span>
                                               <span className="text-xl font-black text-white italic">{capture.weight_kg}kg</span>
                                            </div>
                                         )}
                                         {capture.length_cm && (
                                            <div className="flex flex-col border-l border-white/20 pl-4">
                                               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1"><Scale size={12} /> Compr.</span>
                                               <span className="text-xl font-black text-white italic">{capture.length_cm}cm</span>
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                </div>
                             ) : (
                               <div className="px-6">
                                  <div className="h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5">
                                     <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Captura sem foto 🎣</span>
                                  </div>
                               </div>
                             )}
                             {capture.notes && (
                                <div className="px-8 pb-8 pt-4">
                                   <p className="text-sm text-gray-400 font-medium italic leading-relaxed border-l-2 border-accent/30 pl-4 bg-accent/5 py-3 rounded-r-2xl">
                                      "{capture.notes}"
                                   </p>
                                </div>
                             )}
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
                      <Megaphone size={48} className="text-gray-700 mx-auto mb-6 opacity-50" />
                      <h3 className="text-white font-black uppercase tracking-tighter text-xl mb-2 italic">Mural vazio</h3>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Nenhuma captura registrada ainda.</p>
                    </div>
                  )}
                </div>
             )}

             {profileSubTab === 'captures' && (
                <div className="w-full pb-10">
                   {userCaptures.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         {userCaptures.map((capture) => (
                           <div key={`cap-${capture.id}`} className="glass-elevated group rounded-3xl overflow-hidden border border-white/5 hover:border-accent/30 transition-all hover:shadow-[0_0_30px_rgba(0,212,170,0.1)] flex flex-col">
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
                             </div>
                           </div>
                         ))}
                      </div>
                   ) : (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
                        <Fish size={48} className="text-gray-700 mx-auto mb-6 opacity-50" />
                        <h3 className="text-white font-black uppercase tracking-tighter text-xl mb-2 italic">Sem Capturas</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Nenhuma fisgada registrada.</p>
                      </div>
                   )}
                </div>
             )}

             {profileSubTab === 'inscriptions' && (
                <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
                  <div className="space-y-4">
                    {inscriptions.length > 0 ? inscriptions.map((insc: any) => (
                      <div key={`insc-${insc.id}`} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
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
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Nenhuma inscrição em torneios.</p>
                      </div>
                    )}
                  </div>
                </div>
             )}

             {profileSubTab === 'achievements' && (
                <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                     {achievements.length > 0 ? achievements.map((ua: any) => (
                        <div key={`ach-${ua.id}`} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
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
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Nenhuma medalha conquistada.</p>
                      </div>
                     )}
                  </div>
                </div>
             )}
          </div>

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
