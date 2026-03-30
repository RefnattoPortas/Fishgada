'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Trophy, Calendar, Users, DollarSign, MapPin, 
  ChevronRight, ArrowLeft, Ticket, CheckCircle2, Clock, Filter, Search
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import TournamentTicket from '@/components/tournaments/TournamentTicket'
import { useRouter } from 'next/navigation'

interface Tournament {
  id: string
  title: string
  description: string
  start_at: string
  entry_fee: number
  prize_pool: string | null
  status: string
  max_participants: number
  current_participants: number
  resort_id: string
  fishing_resorts: {
    spots: {
      id: string
      title: string
      display_lat: number
      display_lng: number
      exact_lat: number | null
      exact_lng: number | null
    }
  }
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [participatingIds, setParticipatingIds] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'mine'>('all')
  const [search, setSearch] = useState('')
  const router = useRouter()

  const supabase = getSupabaseClient() as any

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      await fetchTournaments()
      if (user) await fetchUserParticipations(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        fishing_resorts(
          id,
          spots(id, title)
        )
      `)
      .order('start_at', { ascending: true })

    if (error) {
       if (error.code !== '42P01' && error.code !== 'PGRST204' && error.code !== 'PGRST205') {
         console.error('Erro ao buscar torneios:', error.message || error)
       }
       setTournaments([])
    } else {
       setTournaments(data as any)
    }
  }

  const fetchUserParticipations = async (userId: string) => {
    const { data, error } = await supabase
      .from('tournament_inscriptions')
      .select('tournament_id')
      .eq('user_id', userId)

    if (error) {
       if (error.code !== '42P01' && error.code !== 'PGRST204' && error.code !== 'PGRST205') console.error(error)
    }
    else setParticipatingIds(data.map((p: any) => p.tournament_id))
  }

  const handleCheckIn = async (tournamentId: string) => {
    if (!user) return alert('Faça login para se inscrever!')
    
    const { error } = await supabase
      .from('tournament_inscriptions')
      .insert({
        tournament_id: tournamentId,
        user_id: user.id
      })

    if (error) {
       alert('Erro na inscrição: ' + error.message)
    } else {
       setParticipatingIds([...participatingIds, tournamentId])
       await fetchTournaments()
    }
  }

  const handleViewOnMap = (lat: number, lng: number, spotId: string) => {
     // Redireciona para o mapa com query handle
     router.push(`/?selectSpot=${spotId}`)
  }

  const filteredTournaments = useMemo(() => {
     return tournaments.filter(t => {
        const resort = (t as any).fishing_resorts
        const resortName = resort?.name || ''
        const spotTitle = resort?.spots?.[0]?.title || ''
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                             resortName.toLowerCase().includes(search.toLowerCase()) ||
                             spotTitle.toLowerCase().includes(search.toLowerCase())
        
        const matchesFilter = filter === 'all' ? true :
                             filter === 'open' ? t.status === 'open' :
                             filter === 'mine' ? participatingIds.includes(t.id) : true
        
        return matchesSearch && matchesFilter
     })
  }, [tournaments, search, filter, participatingIds])

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-32">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 fade-in">
             <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
                  <Trophy size={14} className="text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent">Competições Oficiais</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">
                  Tournaments <span className="text-accent">&</span> Events
                </h1>
                <p className="text-gray-400 font-medium max-w-xl">
                  Participe das maiores competições de pesca esportiva do Brasil. Garanta sua vaga, registre suas capturas e suba no ranking global.
                </p>
             </div>
             
             <div className="flex items-center gap-3">
               <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-accent shadow-2xl">
                  <Calendar size={32} />
               </div>
               <div className="text-right hidden md:block">
                  <p className="text-[24px] font-black text-white leading-none">12</p>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Eventos este mês</p>
               </div>
             </div>
          </header>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-[28px] glass">
             <div className="flex-1 relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar torneio ou pesqueiro..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white font-medium outline-none focus:border-accent/40 transition-colors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             
             <div className="flex items-center gap-2 bg-dark/40 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'open', label: 'Inscrições Abertas' },
                  { id: 'mine', label: 'Meus Torneios' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setFilter(btn.id as any)}
                    className={`whitespace-nowrap px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      filter === btn.id ? 'bg-accent text-dark shadow-lg shadow-accent/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
             </div>
          </div>

          {/* Listagem */}
          <div className="space-y-8 fade-in">
             {loading ? (
                <div className="py-32 flex flex-col items-center justify-center space-y-4">
                   <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sincronizando Lista...</p>
                </div>
             ) : (
                <>
                  {filteredTournaments.length === 0 ? (
                    <div className="py-32 text-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[40px]">
                       <Ticket size={80} className="mx-auto text-gray-800 mb-6" />
                       <h3 className="text-xl font-black text-gray-400 uppercase italic">Nenhum evento encontrado</h3>
                       <p className="text-gray-600 text-sm mt-2">Tente mudar os filtros ou volte mais tarde para novas competições.</p>
                    </div>
                   ) : (
                    <div className="grid grid-cols-1 gap-8">
                       {filteredTournaments.map((t) => (
                          <TournamentTicket 
                            key={t.id}
                            tournament={t}
                            isParticipating={participatingIds.includes(t.id)}
                            onCheckIn={handleCheckIn}
                            onViewOnMap={(lat, lng) => handleViewOnMap(lat, lng, t.fishing_resorts.spots.id)}
                          />
                       ))}
                    </div>
                   )}
                </>
             )}
          </div>

        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
