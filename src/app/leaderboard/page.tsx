'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Trophy, Medal, User, TrendingUp, Fish, Star, Crown } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { getRankByLevel } from '@/lib/utils/ranks'

interface LeaderboardUser extends Profile {
  record_fish_species?: string
  record_fish_weight?: number
}

export default function LeaderboardPage() {
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    const supabase = getSupabaseClient()
    try {
      // Busca os top 10 por XP
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .order('xp_points', { ascending: false })
        .limit(10)

      if (userError) throw userError

      // Para cada usuário, busca o maior peixe (recorde)
      const usersWithRecords = await Promise.all(((users as Profile[]) || []).map(async (u: Profile) => {
        const { data: record } = await supabase
          .from('captures')
          .select('species, weight_kg')
          .eq('user_id', u.id)
          .order('weight_kg', { ascending: false })
          .limit(1)
          .single()

        const r = record as any
        return {
          ...u,
          record_fish_species: r?.species,
          record_fish_weight: r?.weight_kg
        } as LeaderboardUser
      }))

      setTopUsers(usersWithRecords)
    } catch (err) {
      console.error('Erro ao buscar leaderboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-12 fade-in">
          
          {/* Header */}
          <header className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/20 mb-4 animate-bounce-slow">
              <Trophy size={32} color="white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Leaderboard Global</h1>
            <p className="text-gray-400 max-w-md mx-auto">
              Os mestres da pesca. O ranking é atualizado em tempo real com base no XP e recordes.
            </p>
          </header>

          {/* Top 3 Podium (Visual) */}
          <div className="grid grid-cols-3 gap-4 items-end pt-10 px-4">
            {/* 2nd Place */}
            {topUsers[1] && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full border-4 border-slate-400 p-1 relative z-10 overflow-hidden bg-slate-800">
                    {topUsers[1].avatar_url ? (
                      <img src={topUsers[1].avatar_url} className="w-full h-full object-cover" />
                    ) : <User className="w-full h-full p-4 text-slate-400" />}
                  </div>
                  <div className="absolute -top-3 -right-2 bg-slate-400 text-[#000] text-[10px] font-black px-2 py-0.5 rounded-full z-20">#2</div>
                </div>
                <div className="text-center w-full glass p-3 rounded-t-2xl border-b-0 h-24 flex flex-col justify-center">
                  <p className="text-sm font-bold text-white truncate px-2">{topUsers[1].display_name || topUsers[1].username}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {(() => {
                      const rank = getRankByLevel(topUsers[1].level!)
                      return (
                        <>
                          <rank.icon size={10} style={{ color: rank.color }} />
                          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: rank.color }}>
                            {rank.title}
                          </span>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topUsers[0] && (
              <div className="flex flex-col items-center gap-4 relative -top-6">
                <div className="relative group">
                  <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-8 text-amber-500 animate-pulse" />
                  <div className="w-28 h-28 rounded-full border-4 border-amber-500 p-1 relative z-10 overflow-hidden bg-amber-900/20 shadow-2xl shadow-amber-500/30">
                    {topUsers[0].avatar_url ? (
                      <img src={topUsers[0].avatar_url} className="w-full h-full object-cover" />
                    ) : <User className="w-full h-full p-6 text-amber-500" />}
                  </div>
                  <div className="absolute -top-1 -right-3 bg-amber-500 text-[#000] text-xs font-black px-3 py-1 rounded-full z-20 shadow-lg shadow-amber-500/40">REI</div>
                </div>
                <div className="text-center w-full glass-elevated p-4 rounded-t-3xl border-b-0 h-32 flex flex-col justify-center bg-amber-500/[0.05] border-amber-500/30">
                  <p className="text-base font-black text-white truncate px-2">{topUsers[0].display_name || topUsers[0].username}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    {(() => {
                      const rank = getRankByLevel(topUsers[0].level!)
                      return (
                        <>
                          <rank.icon size={12} style={{ color: rank.color }} />
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: rank.color }}>
                            {rank.title}
                          </span>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topUsers[2] && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full border-4 border-orange-700/60 p-1 relative z-10 overflow-hidden bg-orange-900/10">
                    {topUsers[2].avatar_url ? (
                      <img src={topUsers[2].avatar_url} className="w-full h-full object-cover" />
                    ) : <User className="w-full h-full p-4 text-orange-700" />}
                  </div>
                  <div className="absolute -top-3 -right-2 bg-orange-700 text-[#000] text-[10px] font-black px-2 py-0.5 rounded-full z-20">#3</div>
                </div>
                <div className="text-center w-full glass p-3 rounded-t-2xl border-b-0 h-20 flex flex-col justify-center opacity-80 shadow-inner">
                  <p className="text-sm font-bold text-white truncate px-2">{topUsers[2].display_name || topUsers[2].username}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {(() => {
                      const rank = getRankByLevel(topUsers[2].level!)
                      return (
                        <>
                          <rank.icon size={10} style={{ color: rank.color }} />
                          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: rank.color }}>
                            {rank.title}
                          </span>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ranking List */}
          <div className="space-y-4 pt-10">
            {topUsers.slice(3).map((user, idx) => (
              <div 
                key={user.id} 
                className="group glass flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.05] transition-all border border-white/5"
              >
                <span className="w-8 text-xl font-black text-gray-700 group-hover:text-gray-500 pl-2">#{idx + 4}</span>
                
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" />
                  ) : <User className="w-full h-full p-3 text-gray-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-base font-bold text-white truncate">
                      {user.display_name || user.username}
                    </h4>
                    {(() => {
                      const rank = getRankByLevel(user.level!)
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
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <Star size={10} className="text-amber-500" />
                    {user.xp_points.toLocaleString()} XP
                  </p>
                </div>

                {/* Record Fish */}
                {user.record_fish_species && (
                  <div className="hidden md:flex flex-col items-end pr-4">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">🏆 Troféu Recorde</span>
                    <p className="text-sm font-bold text-accent">
                      {user.record_fish_species} ({user.record_fish_weight}kg)
                    </p>
                  </div>
                )}

                <div className="w-[1px] h-8 bg-white/10 hidden md:block" />

                <div className="px-4 text-right">
                  <div className="badge badge-blue">Lv. {user.level}</div>
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
                <p className="text-gray-500">Nenhum pescador no ranking ainda.</p>
              </div>
            )}
          </div>

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
