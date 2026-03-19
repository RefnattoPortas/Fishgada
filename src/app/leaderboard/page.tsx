'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'
import { Trophy, Medal, User, Heart, Star, Crown, Globe, MapPin, Users, ChevronDown, AlertCircle } from 'lucide-react'
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

export default function LeaderboardPage() {
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

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchUser()
  }, [])

  // Buscar cidades que possuem capturas quando o estado mudar
  useEffect(() => {
    const fetchCities = async () => {
      const supabase = getSupabaseClient()
      try {
        let query = supabase
          .from('profiles')
          .select('city')
          .not('city', 'is', null)
        
        // Verificamos se total_captures existe antes de filtrar
        // Por segurança, vamos apenas buscar cidades de perfis existentes
        
        if (state) query = query.eq('state', state)
        if (country) query = query.eq('country', country)

        const { data, error } = await query

        if (error) {
          console.error('Erro detalhado ao buscar cidades:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          return
        }
        
        const uniqueCities = Array.from(new Set(data?.map(p => (p as any).city) || [])).filter(Boolean).sort()
        setCities(uniqueCities as string[])
        // Resetar cidade se a atual não estiver na nova lista
        if (city && !uniqueCities.includes(city)) setCity('')
      } catch (err: any) {
        console.error('Erro ao buscar cidades:', err?.message || err)
      }
    }
    fetchCities()
  }, [state, country])

  useEffect(() => {
    fetchLeaderboard()
  }, [country, state, city, onlyFriends, currentUser])

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    setError(null)
    const supabase = getSupabaseClient()
    try {
      // Começamos selecionando os campos básicos que SABEMOS que existem
      let query = supabase
        .from('profiles')
        .select('*')
      
      // Tentativa de ordenação por total_likes
      // Se a coluna não existir, o Supabase retornará um erro que trataremos abaixo
      query = query.order('total_likes', { ascending: false })
      query = query.limit(20)

      // Aplicar filtros geográficos
      if (country) query = query.eq('country', country)
      if (state) query = query.eq('state', state)
      if (city) query = query.eq('city', city)

      // Filtro de amigos (pessoas que o usuário segue)
      if (onlyFriends && currentUser) {
        const { data: following, error: followError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id)
        
        if (followError) {
          console.error('Erro ao buscar seguidores:', followError.message)
          if (followError.message.includes('relation "public.follows" does not exist')) {
            setError('A funcionalidade de amigos requer a tabela "follows". Por favor, execute a migração #007.')
            setTopUsers([])
            setIsLoading(false)
            return
          }
        }
        
        const followingIds = following?.map(f => (f as any).following_id) || []
        if (followingIds.length > 0) {
          query = query.in('id', followingIds)
        } else {
          setTopUsers([])
          setIsLoading(false)
          return
        }
      }

      const { data: users, error: userError } = await query

      if (userError) {
        console.error('Erro detalhado do Supabase (Leaderboard):', {
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
          code: userError.code
        })
        // Erro comum: coluna total_likes não existe no banco ainda
        if (userError.message?.includes('total_likes') || userError.message?.includes('column "total_likes" does not exist')) {
          setError('A coluna "total_likes" (ou colunas de localização) ainda não foi criada no banco de dados. Por favor, execute a migração SQL #007 no console do Supabase.')
        } else {
          setError(`Erro ao buscar dados: ${userError.message || 'Verifique o console para mais detalhes.'}`)
        }
      } else {
        setTopUsers((users as any) || [])
      }
    } catch (err: any) {
      console.error('Erro capturado no catch:', err)
      setError(err?.message || 'Erro inesperado ao carregar o ranking. Verifique o console.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8 fade-in">
          
          {/* Header */}
          <header className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-xl shadow-rose-500/20 mb-2 animate-bounce-slow">
              <Trophy size={32} color="white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Fish-Map Leaderboard</h1>
            <p className="text-gray-400 max-w-md mx-auto">
              Ranking de popularidade baseado no seu desempenho e engajamento da comunidade.
            </p>
          </header>

          {/* Barra de Filtros */}
          <div className="glass p-4 rounded-3xl border border-white/5 flex flex-wrap items-center gap-4 shadow-2xl">
            {/* País */}
            <div className="flex-1 min-w-[130px] relative group">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-2 mb-1 block tracking-widest">País</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
                <select 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none cursor-pointer hover:bg-white/10 transition-all font-bold"
                >
                  <option value="Brasil">Brasil</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Paraguai">Paraguai</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Estado */}
            <div className="flex-1 min-w-[130px] relative group">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-2 mb-1 block tracking-widest">Estado</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
                <select 
                  value={state} 
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none cursor-pointer hover:bg-white/10 transition-all font-bold"
                >
                  <option value="">Todos</option>
                  {BRAZILIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Cidade Select */}
            <div className="flex-1 min-w-[130px] relative group">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-2 mb-1 block tracking-widest">Cidade</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
                <select 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none cursor-pointer hover:bg-white/10 transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <option value="">{cities.length === 0 ? 'Sem cidades' : 'Todas as cidades'}</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Amigos Toggle */}
            <div className="flex flex-col items-center gap-1.5 px-4 h-full pt-4">
               <button 
                onClick={() => setOnlyFriends(!onlyFriends)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${onlyFriends ? 'bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_rgba(0,212,170,0.2)]' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
               >
                  <Users size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">Amigos</span>
               </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="glass-elevated border-red-500/30 p-6 rounded-3xl flex items-center gap-4 text-red-400 bg-red-500/5">
               <AlertCircle size={24} className="flex-shrink-0" />
               <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Top 3 Podium (Visual) */}
          {!error && (
            <div className="grid grid-cols-3 gap-4 items-end pt-14 px-4">
              {/* 2nd Place */}
              {topUsers[1] && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-400 p-1 relative z-10 overflow-hidden bg-slate-800 shadow-[0_0_30px_rgba(148,163,184,0.3)]">
                      {topUsers[1].avatar_url ? (
                        <img src={topUsers[1].avatar_url} className="w-full h-full object-cover" />
                      ) : <User className="w-full h-full p-4 text-slate-400" />}
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-[12px] font-black px-3 py-0.5 rounded-full z-20 shadow-lg">PRATA</div>
                  </div>
                  <div className="text-center w-full glass p-3 rounded-t-2xl border-b-0 h-28 flex flex-col justify-center">
                    <p className="text-sm font-bold text-white truncate px-2 leading-tight">{topUsers[1].display_name || topUsers[1].username}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <Heart size={14} className="text-rose-500 fill-rose-500" />
                      <span className="text-lg font-black text-white">{topUsers[1].total_likes || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topUsers[0] && (
                <div className="flex flex-col items-center gap-4 relative -top-8">
                  <div className="relative group">
                    <Crown className="absolute -top-10 left-1/2 -translate-x-1/2 w-10 h-10 text-amber-500 animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <div className="w-32 h-32 rounded-full border-4 border-amber-500 p-1 relative z-10 overflow-hidden bg-amber-900/20 shadow-[0_0_50px_rgba(245,158,11,0.4)]">
                      {topUsers[0].avatar_url ? (
                        <img src={topUsers[0].avatar_url} className="w-full h-full object-cover" />
                      ) : <User className="w-full h-full p-6 text-amber-500" />}
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-[#000] text-sm font-black px-4 py-1 rounded-full z-20 shadow-xl shadow-amber-500/40">OURO</div>
                  </div>
                  <div className="text-center w-full glass-elevated p-4 rounded-t-3xl border-b-0 h-36 flex flex-col justify-center bg-amber-500/[0.08] border-amber-500/40">
                    <p className="text-lg font-black text-white truncate px-2 leading-tight">{topUsers[0].display_name || topUsers[0].username}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Heart size={18} className="text-rose-500 fill-rose-500" />
                      <span className="text-2xl font-black text-white">{topUsers[0].total_likes || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topUsers[2] && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full border-4 border-orange-700/60 p-1 relative z-10 overflow-hidden bg-orange-900/10 shadow-[0_0_30px_rgba(194,65,12,0.2)]">
                      {topUsers[2].avatar_url ? (
                        <img src={topUsers[2].avatar_url} className="w-full h-full object-cover" />
                      ) : <User className="w-full h-full p-4 text-orange-700" />}
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-700 text-white text-[12px] font-black px-3 py-0.5 rounded-full z-20 shadow-lg">BRONZE</div>
                  </div>
                  <div className="text-center w-full glass p-3 rounded-t-2xl border-b-0 h-24 flex flex-col justify-center opacity-90">
                    <p className="text-sm font-bold text-white truncate px-2 leading-tight">{topUsers[2].display_name || topUsers[2].username}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <Heart size={14} className="text-rose-500 fill-rose-500" />
                      <span className="text-lg font-black text-white">{topUsers[2].total_likes || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ranking List */}
          {!error && (
            <div className="space-y-4 pt-10">
              {topUsers.slice(3).map((user, idx) => (
                <div 
                  key={user.id} 
                  className="group glass flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.05] transition-all border border-white/5"
                >
                  <span className="w-10 text-xl font-black text-gray-700 group-hover:text-gray-500 pl-2">#{idx + 4}</span>
                  
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" />
                    ) : <User className="w-full h-full p-3 text-gray-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link href={`/profile/${user.username}`} className="hover:text-accent transition-colors">
                        <h4 className="text-base font-bold text-white truncate">
                          {user.display_name || user.username}
                        </h4>
                      </Link>
                      {(() => {
                        const rank = getRankByLevel(user.level || 1)
                        return (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                             <rank.icon size={10} style={{ color: rank.color }} />
                             <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: rank.color }}>
                               {rank.title}
                             </span>
                          </div>
                        )
                      })()}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-2 font-medium">
                      <MapPin size={10} className="text-accent" />
                      {user.city ? `${user.city}, ${user.state || ''}` : `${user.state || 'Brasil'}`}
                    </p>
                  </div>

                  <div className="hidden md:flex flex-col items-end pr-4">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest flex items-center gap-1 mb-0.5">
                      <Heart size={8} className="text-rose-500 fill-rose-500" /> Curtidas
                    </span>
                    <p className="text-lg font-black text-white leading-none">
                      {user.total_likes?.toLocaleString() || 0}
                    </p>
                  </div>

                  <div className="w-[1px] h-8 bg-white/10 hidden md:block" />

                  <div className="px-4 text-right">
                    <div className="badge badge-blue">Lv. {user.level || 1}</div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-center p-20">
                  <div className="spinner border-4 w-12 h-12 border-accent border-t-transparent" />
                </div>
              )}

              {!isLoading && topUsers.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                  <Medal size={48} className="mx-auto text-gray-800 mb-4" />
                  <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Nenhum pescador encontrado com estes filtros.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
      `}</style>
    </div>
  )
}
