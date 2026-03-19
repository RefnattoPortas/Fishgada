'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { User, Trophy, Fish, MapPin, TrendingUp, Award, UserPlus, UserMinus, Star } from 'lucide-react'
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

      // Stats from captures
      const { data: captures } = await supabase
        .from('captures')
        .select('species, weight_kg')
        .eq('user_id', (profileData as any).id)
      
      if (captures) {
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

          {/* Achievements Section */}
          <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
            <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <Award size={16} className="text-amber-500" /> Galeria de Medalhas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
               )) : (
                  <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl col-span-2">
                     <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Nenhuma medalha exibida</p>
                  </div>
               )}
            </div>
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
