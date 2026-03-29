'use client'

import { useState, useEffect, useMemo } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'
import { Trophy, Medal, User, Heart, Star, Crown, Globe, MapPin, Users, ChevronDown, AlertCircle, Search } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { getRankByLevel } from '@/lib/utils/ranks'

interface LeaderboardUser extends Profile {
  total_likes: number
  is_following?: boolean
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export default function RankingPage() {
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [country, setCountry] = useState('Brasil')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [onlyFriends, setOnlyFriends] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [me, setMe] = useState<LeaderboardUser | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
      }
    }
    fetchUser()
  }, [])

  // Buscar cidades
  useEffect(() => {
    const fetchCities = async () => {
      const supabase = getSupabaseClient()
      try {
        let query = supabase.from('profiles').select('city').not('city', 'is', null)
        if (state) query = query.eq('state', state)
        if (country) query = query.eq('country', country)
        const { data } = await query
        const uniqueCities = Array.from(new Set(data?.map(p => (p as any).city) || [])).filter(Boolean).sort()
        setCities(uniqueCities as string[])
      } catch (e) {}
    }
    fetchCities()
  }, [state, country])

  useEffect(() => {
    fetchRanking()
  }, [country, state, city, onlyFriends, currentUser])

  const fetchRanking = async () => {
    setIsLoading(true)
    setError(null)
    const supabase = getSupabaseClient()
    try {
      // 1. Garantir que temos os dados do próprio usuário atualizados
      let myProfile = me
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single()
        if (profile) {
          myProfile = profile as any
          setMe(myProfile)
        }
      }

      // 2. Buscar Top 500
      let query = supabase.from('profiles').select('*').order('total_likes', { ascending: false }).limit(500)
      
      if (country) query = query.eq('country', country)
      if (state) query = query.eq('state', state)
      if (city) query = query.eq('city', city)

      if (onlyFriends && currentUser) {
        const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id)
        const followingIds = following?.map(f => (f as any).following_id) || []
        if (followingIds.length > 0) query = query.in('id', followingIds)
        else { setTopUsers([]); setIsLoading(false); return; }
      }

      const { data: users, error: userError } = await query
      if (userError) throw userError
      
      const results = (users as any) || []
      setTopUsers(results)

      // 3. Calcular rank exato se o usuário existir
      if (myProfile) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('total_likes', myProfile.total_likes || 0)
        setMyRank((count || 0) + 1)
      }

    } catch (err: any) {
      console.error('Erro no ranking:', err)
      setError(err?.message || 'Erro ao carregar o ranking.')
    } finally {
      setIsLoading(false)
    }
  }

  // Verificar se eu estou na lista exibida
  const isMeInTop500 = useMemo(() => {
    return topUsers.some(u => u.id === currentUser?.id)
  }, [topUsers, currentUser])

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-8">
        <div className="max-w-5xl mx-auto w-full flex flex-col h-full gap-6 fade-in">
          
          {/* Header */}
          <header className="flex flex-col items-center text-center gap-2 flex-shrink-0">
             <div className="flex items-center gap-3">
                <Trophy size={32} className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Ranking de Pescadores</h1>
             </div>
             <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em]">Os maiores pescadores da Fishgada</p>
          </header>

          {/* Filtros */}
          <div className="glass p-4 rounded-3xl border border-white/5 flex flex-wrap items-end gap-4 shadow-2xl flex-shrink-0">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-black uppercase text-gray-600 ml-1 mb-1 block">Estado</label>
              <select value={state} onChange={e => setState(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm font-bold text-white">
                <option value="" className="text-black">Brasil (Todos)</option>
                {BRAZILIAN_STATES.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-black uppercase text-gray-600 ml-1 mb-1 block">Cidade</label>
              <select value={city} onChange={e => setCity(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm font-bold text-white">
                <option value="" className="text-black">Todas</option>
                {cities.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
              </select>
            </div>
            <button 
              onClick={() => setOnlyFriends(!onlyFriends)}
              className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 h-[38px] ${onlyFriends ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/10 text-gray-500'}`}
            >
              <Users size={16} /> <span className="text-[10px] font-black uppercase">Amigos</span>
            </button>
          </div>

          {/* Lista do Ranking con Scroll */}
          <div className="flex-1 overflow-hidden flex flex-col gap-4 relative">
             <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-3 pb-8">
                {isLoading ? (
                  <div className="flex justify-center p-20"><div className="spinner border-accent w-10 h-10" /></div>
                ) : topUsers.map((user, idx) => {
                  const isMe = user.id === currentUser?.id;
                  const rank = getRankByLevel(user.level || 1);
                  const position = idx + 1;

                  return (
                    <div 
                      key={user.id} 
                      className={`group flex items-center gap-4 p-6 md:p-4 min-h-[110px] md:min-h-0 rounded-3xl transition-all border ${
                        isMe 
                          ? 'bg-accent/10 border-accent/40 shadow-[0_0_30px_rgba(0,212,170,0.15)]' 
                          : 'glass border-white/5 hover:bg-white/[0.05]'
                      }`}
                    >
                      {/* Rank Position */}
                      <div className="w-10 md:w-12 flex justify-center flex-shrink-0">
                         {position === 1 ? <Crown className="text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" size={28} /> :
                          position === 2 ? <Medal className="text-slate-400" size={24} /> :
                          position === 3 ? <Medal className="text-orange-700" size={24} /> :
                          <span className={`text-lg font-black ${isMe ? 'text-accent' : 'text-gray-700/50 group-hover:text-gray-600'} transition-colors`}>#{position}</span>}
                      </div>

                      {/* User Identity */}
                      <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="w-11 h-11 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white/10 flex-shrink-0 bg-[#0a1425]">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} className="w-full h-full object-cover" />
                          ) : <User className="w-full h-full p-2.5 text-gray-600" />}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <h4 className={`text-sm md:text-base font-black uppercase tracking-tight truncate ${isMe ? 'text-accent' : 'text-white'}`}>
                                {user.display_name || user.username}
                              </h4>
                              <div className="flex items-center gap-2">
                                {isMe && <span className="bg-accent text-black text-[7px] font-black px-1.5 py-0.5 rounded-sm">VOCÊ</span>}
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 border border-white/5">
                                   <rank.icon size={8} style={{ color: rank.color }} />
                                   <span className="text-[7px] font-black uppercase tracking-widest leading-none" style={{ color: rank.color }}>
                                     {rank.title}
                                   </span>
                                </div>
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                             <MapPin size={10} className="text-cyan-500" /> {user.city || 'Pescas Solitárias'}
                           </p>
                        </div>
                      </div>

                      {/* Stats Section */}
                      <div className="flex flex-col items-center md:items-end gap-1 md:gap-2 shrink-0 pr-1">
                        <div className="flex flex-col items-center md:items-end min-w-[60px]">
                           <span className="text-[8px] text-gray-600 font-black uppercase tracking-tighter">Curtidas</span>
                           <span className={`text-base md:text-xl font-black ${isMe ? 'text-accent' : 'text-white'}`}>
                             {user.total_likes?.toLocaleString() || 0}
                           </span>
                        </div>
                        <div className="flex sm:hidden items-center justify-center rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[8px] font-black text-gray-600">
                          L{user.level || 1}
                        </div>
                        <div className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-gray-500">
                          Lv.{user.level || 1}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {!isLoading && topUsers.length === 0 && (
                  <div className="text-center py-20 text-gray-600 uppercase font-black text-xs">Ninguém encontrado neste ranking</div>
                )}
             </div>

             {/* Sticky Card for current user IF rank > 500 */}
             {!isMeInTop500 && !isLoading && currentUser && me && (
               <div className="mt-4 pt-4 border-t border-white/10 animate-in slide-in-from-bottom duration-500">
                  <div className="bg-accent text-black p-5 rounded-3xl flex items-center gap-4 shadow-[0_0_30px_rgba(0,212,170,0.3)]">
                      <div className="w-10 md:w-12 text-center">
                        <span className="text-lg font-black">#{myRank || '...'}</span>
                      </div>
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-black/20 flex-shrink-0">
                        {me.avatar_url ? (
                          <img src={me.avatar_url} className="w-full h-full object-cover" />
                        ) : <User className="w-full h-full p-3 text-black/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="text-sm md:text-base font-black uppercase tracking-tight truncate">
                            {me.display_name || me.username}
                         </h4>
                         <p className="text-[10px] font-bold uppercase tracking-wider">Sua posição atual no ranking</p>
                      </div>
                      <div className="flex flex-col items-end pr-2">
                        <span className="text-[9px] font-black uppercase tracking-tighter">Curtidas</span>
                        <span className="text-base md:text-lg font-black">{me.total_likes?.toLocaleString() || 0}</span>
                      </div>
                  </div>
               </div>
             )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 212, 170, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  )
}
