'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Settings, Clock, DollarSign, Warehouse, Fish, Megaphone, 
  Trophy, Calendar, Plus, Save, ChevronRight, AlertCircle,
  Utensils, Wifi, Anchor, Car, CheckCircle2, User, TrendingUp, BarChart3,
  Users, Trash2, Edit3, Sparkles, Flame, MapPin, ArrowRight, Lock, Camera, X, ImagePlus
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default function ResortAdminPage() {
  const [loading, setLoading] = useState(true)
  const [resorts, setResorts] = useState<any[]>([])
  const [selectedResort, setSelectedResort] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'stats' | 'profile' | 'highlight' | 'news' | 'tournaments'>('stats')
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [showNewTournament, setShowNewTournament] = useState(false)
  
  // States para dados dinâmicos
  const [tournaments, setTournaments] = useState<any[]>([])
  const [stats, setStats] = useState({ total_captures: 0, top_species: [] as any[] })
  const [newTournament, setNewTournament] = useState({
    title: '',
    description: '',
    event_date: '',
    entry_fee: 0,
    prize_pool: '',
    max_participants: 50
  })
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null)

  const supabase = getSupabaseClient() as any
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      await fetchResorts(user.id)
    }
    checkAuth()
  }, [])

  const fetchResorts = async (userId: string) => {
    // Busca os pesqueiros onde o usuário logado é o dono do Spot vinculado
    const { data, error } = await supabase
      .from('fishing_resorts')
      .select('*, spots!inner(*)')
      .eq('spots.user_id', userId)

    // Aproveitamos para pegar o tier do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Erro ao buscar resorts:', error)
    } else if (data && data.length > 0) {
      setResorts(data)
      setSelectedResort(data[0])
      setUser((prev: any) => ({ ...prev, subscription_tier: profile?.subscription_tier || 'free' }))
      await loadDashboardData(data[0])
    } else {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!selectedResort) return
    
    // Lógica de Ativação: O botão de publicar deve verificar o subscription_tier. 
    // Se for 'free', abre a tela de planos. Se for 'partner', muda is_active para TRUE.
    if (user?.subscription_tier === 'free') {
      alert('Seu plano atual é Free. Para publicar seu pesqueiro no mapa e torná-lo oficial, você precisa migrar para o Plano Parceiro.')
      // No futuro aqui abriria o Modal de Planos (Paywall)
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('fishing_resorts')
      .update({ is_active: true })
      .eq('id', selectedResort.id)

    if (error) {
       alert('Erro ao publicar: ' + error.message)
    } else {
       setSelectedResort({ ...selectedResort, is_active: true })
       alert('🚀 Sucesso! Seu pesqueiro agora está visível para todos os pescadores no mapa oficial.')
    }
    setSaving(false)
  }

  const loadDashboardData = async (resort: any) => {
    if (!resort) return
    setLoading(true)
    await Promise.all([
      fetchTournaments(resort.id),
      fetchResortStats(resort.spot_id)
    ])
    
    // Lógica de expiração de 3 horas para o Highlight (Ação)
    if (resort.active_highlight && resort.updated_at) {
      const lastUpdate = new Date(resort.updated_at).getTime()
      const now = new Date().getTime()
      const threeHours = 3 * 60 * 60 * 1000
      
      if (now - lastUpdate > threeHours) {
        // Limpar automaticamente se expirado
        console.log('Highlight expirado, limpando...')
        await supabase.from('fishing_resorts').update({ active_highlight: '' }).eq('id', resort.id)
        setSelectedResort({ ...resort, active_highlight: '' })
      }
    }
    
    setLoading(false)
  }

  const fetchTournaments = async (resortId: string) => {
    const { data } = await supabase
      .from('tournaments')
      .select(`
        *,
        tournament_participants(
          id,
          registered_at,
          profiles(display_name, avatar_url, level)
        )
      `)
      .eq('resort_id', resortId)
      .order('event_date', { ascending: true })
    
    setTournaments(data || [])
  }

  const fetchResortStats = async (spotId: string) => {
    // Total de capturas
    const { count } = await supabase
      .from('captures')
      .select('*', { count: 'exact', head: true })
      .eq('spot_id', spotId)

    // Espécies mais pescadas
    const { data: speciesData } = await supabase
      .from('captures')
      .select('species')
      .eq('spot_id', spotId)

    const speciesMap = (speciesData || []).reduce((acc: any, curr: any) => {
      acc[curr.species] = (acc[curr.species] || 0) + 1
      return acc
    }, {})

    const sortedSpecies = Object.entries(speciesMap)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setStats({
      total_captures: count || 0,
      top_species: sortedSpecies
    })
  }

  const handleUpdateResort = async (updates: any) => {
    if (!selectedResort) return
    setSaving(true)
    
    // Removemos campos que não pertencem à tabela fishing_resorts (como o join 'spots')
    // para não dar erro de coluna inexistente no Supabase
    const { id, spots, ...cleanUpdates } = updates
    
    const { error } = await supabase
      .from('fishing_resorts')
      .update(cleanUpdates)
      .eq('id', id)

    if (error) {
       console.error('Erro ao atualizar resort:', error)
       alert('Erro ao salvar: ' + error.message)
    } else {
       setSelectedResort({ ...selectedResort, ...cleanUpdates })
       // Atualiza na lista de resorts também
       setResorts(resorts.map(r => r.id === id ? { ...r, ...cleanUpdates } : r))
    }
    setSaving(false)
  }

  const handleCreateTournament = async () => {
    if (!selectedResort || !newTournament.title || !newTournament.event_date) return
    setSaving(true)
    const { error } = await supabase
      .from('tournaments')
      .insert({
        resort_id: selectedResort.id,
        ...newTournament,
        status: 'open'
      })

    if (error) {
       alert('Erro ao criar torneio: ' + error.message)
    } else {
       setShowNewTournament(false)
       await fetchTournaments(selectedResort.id)
       setNewTournament({
         title: '',
         description: '',
         event_date: '',
         entry_fee: 0,
         prize_pool: '',
         max_participants: 50
       })
    }
    setSaving(false)
  }

  if (loading && !selectedResort) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0f1a]">
      <div className="flex flex-col items-center gap-4">
         <div className="spinner" />
         <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] animate-pulse">Autenticando Acesso Admin...</p>
      </div>
    </div>
  )

  if (resorts.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1a] p-6 text-center">
      <div className="w-24 h-24 rounded-[40px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-8 shadow-2xl shadow-red-500/10">
         <AlertCircle size={48} />
      </div>
      <h1 className="text-4xl font-black mb-4 uppercase italic tracking-tighter">Acesso Restrito</h1>
      <p className="text-gray-400 max-w-md font-medium leading-relaxed">
        Detectamos que seu perfil não é proprietário de um Pesqueiro Parceiro. Se você possui um estabelecimento, cadastre-o primeiro no mapa ou entre em contato com o suporte B2B.
      </p>
      <button onClick={() => router.push('/')} className="btn-primary mt-12 px-12 py-4 text-xs font-black uppercase tracking-widest gap-2">
         <ArrowRight size={16} /> Voltar ao Mapa
      </button>
    </div>
  )

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      {/* Mobile Tab Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[1000] bg-[#0a0f1a]/90 backdrop-blur-xl border-b border-white/10 flex flex-col pt-4 pb-2">
        <div className="pl-16 pr-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-dark">
              <Warehouse size={16} />
            </div>
            <h2 className="font-black text-sm tracking-tight leading-none text-white uppercase truncate max-w-[150px]">
              {selectedResort?.spots.title}
            </h2>
          </div>
          {resorts.length > 1 && (
            <select 
              value={selectedResort?.id} 
              onChange={(e) => {
                const r = resorts.find(res => res.id === e.target.value)
                if (r) { setSelectedResort(r); loadDashboardData(r); }
              }}
              className="bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-[10px] font-black text-accent outline-none"
            >
              {resorts.map(r => <option key={r.id} value={r.id} className="text-black">{r.spots.title}</option>)}
            </select>
          )}
        </div>
        
        <div className="flex overflow-x-auto scrollbar-none px-4 pb-2 gap-2">
          {[
            { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
            { id: 'profile', label: 'Perfil', icon: Settings },
            { id: 'highlight', label: 'Ação', icon: Flame },
            { id: 'news', label: 'Mural', icon: Megaphone },
            { id: 'tournaments', label: 'Torneios', icon: Trophy },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                activeTab === tab.id 
                  ? 'bg-accent text-dark border-accent shadow-lg shadow-accent/20' 
                  : 'bg-white/5 text-gray-400 border-white/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mini Sidebar de Navegação Admin (Desktop Only) */}
      <aside className="hidden md:flex w-80 border-r border-white/5 bg-white/[0.01] flex-col pt-12">
        <div className="px-8 mb-12">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-dark shadow-lg shadow-accent/20">
                <Warehouse size={24} />
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight leading-none mb-1 text-white">DASHBOARD</h2>
                <p className="text-[10px] text-accent font-bold uppercase tracking-widest leading-none truncate max-w-[140px]">{selectedResort?.spots.title}</p>
              </div>
           </div>

           <nav className="space-y-1.5">
             {[
               { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
               { id: 'profile', label: 'Gestão de Perfil', icon: Settings },
               { id: 'highlight', label: 'O que está batendo', icon: Flame },
               { id: 'news', label: 'Mural de Avisos', icon: Megaphone },
               { id: 'tournaments', label: 'Torneios & Inscritos', icon: Trophy },
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${
                   activeTab === tab.id ? 'bg-accent text-dark shadow-lg shadow-accent/10' : 'text-gray-500 hover:text-white hover:bg-white/5'
                 }`}
               >
                 <tab.icon size={18} />
                 {tab.label}
               </button>
             ))}
           </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5">
           <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-widest">Seus Ativos</p>
           <div className="space-y-3">
             {resorts.map(r => (
               <button 
                 key={r.id} 
                 onClick={() => { setSelectedResort(r); loadDashboardData(r); }}
                 className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                   selectedResort?.id === r.id ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-white/5 hover:border-white/20'
                 }`}
               >
                 <span className={`text-[11px] font-bold ${selectedResort?.id === r.id ? 'text-white' : 'text-gray-400'}`}>
                   {r.spots.title}
                 </span>
                 {r.is_partner && <Sparkles size={14} className="text-accent" />}
               </button>
             ))}
           </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 overflow-y-auto pt-24 md:pt-16 p-6 md:p-16 custom-scrollbar pb-32">
        <div className="max-w-5xl mx-auto fade-in">
          
          {/* FLUXO DE PUBLICAÇÃO (BANNER SE INATIVO) */}
          {!selectedResort?.is_active && (
            <div className="mb-12 glass-elevated border-2 border-accent/30 p-10 rounded-[48px] overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-accent/20 transition-all duration-1000" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="w-24 h-24 rounded-[32px] bg-accent/20 border border-accent/20 flex items-center justify-center text-accent shadow-[0_0_30px_rgba(0,212,170,0.2)] animate-pulse">
                  <Megaphone size={40} />
                </div>
                <div className="flex-1 text-center md:text-left space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full mb-2">
                    <Sparkles size={14} className="text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent italic">Rascunho de Negócio</span>
                  </div>
                  <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                    Seu Pesqueiro <br /><span className="text-accent underline decoration-4 underline-offset-8">Ainda não está no mapa</span>
                  </h2>
                  <p className="text-gray-400 font-medium max-w-xl text-lg">
                    Seu cadastro básico foi salvo. Para ativar o **PIN ROXO** e liberar as funções de **Torneios** e **Publicidade**, publique seu estabelecimento oficial.
                  </p>
                </div>
                <div className="flex flex-col gap-4 w-full md:w-auto">
                   <button 
                     onClick={handlePublish}
                     disabled={saving}
                     className="bg-accent hover:bg-accent/80 text-dark px-10 py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-accent/20 transition-all border-b-4 border-dark/20 active:translate-y-1 active:border-b-0 whitespace-normal"
                   >
                     {saving ? <span className="spinner" /> : <CheckCircle2 size={20} />} Publicar Agora
                   </button>
                   <p className="text-[9px] text-center text-gray-500 font-black uppercase tracking-widest leading-relaxed">
                     Acesso Grátis p/ Parceiros <br /> <span className="text-accent underline">Plano Elite Requerido</span>
                   </p>
                </div>
              </div>
            </div>
          )}
          {/* TAB: STATS */}
          {activeTab === 'stats' && (
             <div className="space-y-12">
                <header>
                   <p className="text-accent font-black text-[10px] uppercase tracking-[0.3em] mb-4">Relatório de Performance</p>
                   <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                      Insights <span className="text-gray-700">&</span> Métricas
                   </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Card Capturas */}
                   <div className="glass p-10 rounded-[40px] border border-white/5 space-y-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform">
                         <Fish size={150} />
                      </div>
                      <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                         <TrendingUp size={16} className="text-accent" /> Total de Capturas
                      </h3>
                      <p className="text-7xl font-black text-white">{stats.total_captures}</p>
                      <p className="text-sm text-gray-400 font-medium">Capturas registradas por pescadores neste local via Fishgada.</p>
                   </div>

                   {/* Card Espécies */}
                   <div className="glass p-10 rounded-[40px] border border-white/5 space-y-8">
                      <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                         <BarChart3 size={16} className="text-indigo-400" /> Espécies Mais Frequentadas
                      </h3>
                      <div className="space-y-4">
                         {stats.top_species.length > 0 ? stats.top_species.map((s, idx) => (
                            <div key={s.name} className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400">
                                     #{idx + 1}
                                  </span>
                                  <p className="font-bold text-white uppercase text-sm tracking-wide">{s.name}</p>
                               </div>
                               <div className="flex items-center gap-4 flex-1 mx-6">
                                  <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                     <div 
                                      className="h-full bg-accent" 
                                      style={{ width: `${(s.count / stats.total_captures) * 100}%` }}
                                     />
                                  </div>
                                  <span className="text-[10px] font-black text-accent">{s.count}</span>
                               </div>
                            </div>
                         )) : (
                           <p className="text-center py-10 text-gray-600 font-black text-[10px] border-2 border-dashed border-white/5 rounded-3xl">Aguardando Capturas...</p>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
             <div className="space-y-12">
                <header>
                   <p className="text-accent font-black text-[10px] uppercase tracking-[0.3em] mb-4">Informações da Vitrine</p>
                   <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                      Infra <span className="text-gray-700">&</span> Servitium
                   </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="glass p-10 rounded-[40px] border border-white/5 space-y-8">
                      <div>
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">Horário de Funcionamento</label>
                         <textarea 
                           className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white font-medium min-h-[140px] outline-none focus:border-accent/40 transition-colors"
                           placeholder="Ex: Terça a Domingo das 07:00 às 18:00..."
                           value={selectedResort?.opening_hours || ''}
                           onChange={e => setSelectedResort({...selectedResort, opening_hours: e.target.value})}
                         />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                         <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Taxa de Entrada (Base)</label>
                            <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent font-black text-xs">R$</span>
                               <input 
                                 type="text"
                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black outline-none focus:border-accent/40"
                                 value={(selectedResort?.prices as any)?.entry || ''}
                                 onChange={e => setSelectedResort({
                                   ...selectedResort, 
                                   prices: { ...(selectedResort.prices as any || {}), entry: e.target.value } 
                                 })}
                               />
                            </div>
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Média p/ Quilo</label>
                            <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent font-black text-xs">R$</span>
                               <input 
                                 type="text"
                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black outline-none focus:border-accent/40"
                                 value={(selectedResort?.prices as any)?.kg || ''}
                                 onChange={e => setSelectedResort({
                                   ...selectedResort, 
                                   prices: { ...(selectedResort.prices as any || {}), kg: e.target.value } 
                                 })}
                               />
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="glass p-10 rounded-[40px] border border-white/5 space-y-6">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">Comodidades Disponíveis</label>
                      <div className="grid grid-cols-2 gap-3 md:gap-4 place-items-center">
                         {[
                           { key: 'restaurante', label: 'Restaurante', icon: Utensils },
                           { key: 'banheiros', label: 'Banheiros', icon: Warehouse },
                           { key: 'wi_fi', label: 'Wi-Fi Hotspot', icon: Wifi },
                           { key: 'pousada', label: 'Hospedagem', icon: MapPin },
                           { key: 'aluguel_equipamento', label: 'Aluguel Trupe', icon: Anchor },
                           { key: 'estacionamento', label: 'Aparelho', icon: Car },
                         ].map(item => {
                           const infra = (selectedResort?.infrastructure as any) || {}
                           const active = infra[item.key]
                           return (
                             <button
                               key={item.key}
                               onClick={() => {
                                 const newInfra = { ...infra, [item.key]: !active }
                                 setSelectedResort({ ...selectedResort, infrastructure: newInfra })
                               }}
                               className={`w-full p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all ${
                                 active ? 'border-accent bg-accent/5' : 'border-white/5 opacity-30 grayscale hover:opacity-50'
                               }`}
                             >
                               <item.icon size={18} className={active ? 'text-accent' : ''} />
                               <span className="text-[11px] font-black uppercase tracking-wider text-center">{item.label}</span>
                             </button>
                           )
                         })}
                      </div>
                   </div>
                </div>

                {/* Galeria de Fotos (5 fotos) */}
                <div className="glass p-10 rounded-[40px] border border-white/5 space-y-6">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">Galeria de Fotos (Máx. 5)</label>
                   <p className="text-xs text-gray-500 mb-4">A 1ª foto será a capa exibida ao abrir as informações do pesqueiro no mapa.</p>
                   <div className="grid grid-cols-5 gap-4">
                      {[0, 1, 2, 3, 4].map(idx => {
                        const photos = (selectedResort as any)?.photos || []
                        const photo = photos[idx]
                        return (
                          <div key={idx} className="relative aspect-square rounded-2xl border-2 border-dashed overflow-hidden group" style={{ borderColor: idx === 0 ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.1)' }}>
                            {photo ? (
                              <>
                                <img src={photo} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                                <button 
                                  onClick={() => {
                                    const newPhotos = [...photos]
                                    newPhotos.splice(idx, 1)
                                    setSelectedResort({ ...selectedResort, photos: newPhotos })
                                  }}
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                                {idx === 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-accent/80 text-dark text-[8px] font-black uppercase text-center py-1 tracking-widest">Capa</div>
                                )}
                              </>
                            ) : (
                              <label htmlFor={`resort-photo-${idx}`} className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                {uploadingPhoto === idx ? (
                                  <span className="spinner" style={{ width: 20, height: 20 }} />
                                ) : (
                                  <>
                                    <ImagePlus size={20} className="text-gray-600 mb-1" />
                                    <span className="text-[9px] text-gray-600 font-bold">{idx === 0 ? 'CAPA' : `Foto ${idx+1}`}</span>
                                  </>
                                )}
                              </label>
                            )}
                            <input 
                              id={`resort-photo-${idx}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file || !selectedResort) return
                                setUploadingPhoto(idx)
                                try {
                                  const ext = file.name.split('.').pop()
                                  const path = `resorts/${selectedResort.id}/photo_${idx}.${ext}`
                                  const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
                                  if (error) { alert('Erro no upload: ' + error.message); return }
                                  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
                                  const newPhotos = [...((selectedResort as any)?.photos || [])]
                                  newPhotos[idx] = urlData?.publicUrl
                                  setSelectedResort({ ...selectedResort, photos: newPhotos })
                                } catch (err: any) {
                                  alert('Erro: ' + err.message)
                                } finally {
                                  setUploadingPhoto(null)
                                }
                              }}
                            />
                          </div>
                        )
                      })}
                   </div>
                </div>

                <button 
                  onClick={() => handleUpdateResort(selectedResort)}
                  disabled={saving}
                  className="btn-primary w-full py-6 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-accent/20 whitespace-normal"
                >
                  {saving ? <span className="spinner" /> : <Save size={18} />} Publicar Alterações no Perfil
                </button>
             </div>
          )}

          {/* TAB: HIGHLIGHT */}
          {activeTab === 'highlight' && (
             <div className="space-y-12">
                <header>
                   <p className="text-accent font-black text-[10px] uppercase tracking-[0.3em] mb-4">Ação em Tempo Real</p>
                   <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                      Focus <span className="text-gray-700">&</span> Fire
                   </h1>
                </header>

                <div className="glass p-12 rounded-[50px] border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-12 opacity-[0.05] animate-pulse">
                      <Flame size={200} className="text-accent" />
                   </div>
                   
                   <div className="flex items-center gap-6 mb-12 relative z-10">
                      <div className="w-20 h-20 rounded-[35%] bg-accent flex items-center justify-center text-dark shadow-xl shadow-accent/20">
                         <Flame size={40} />
                      </div>
                      <div>
                         <h3 className="text-3xl font-black italic uppercase tracking-tighter">Destaque do Dia</h3>
                         <p className="text-gray-400 font-medium">Esta frase aparecerá como um balão neon pulsante no seu ponto no mapa para todos os usuários.</p>
                      </div>
                   </div>

                   <div className="space-y-4 relative z-10">
                      <label className="text-[10px] font-black text-accent uppercase tracking-widest block pl-2">Sua Mensagem de Gancho</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl py-6 md:py-10 px-6 md:px-10 text-2xl md:text-4xl font-black text-white placeholder:text-white/10 outline-none focus:border-accent transition-all italic tracking-tighter"
                        placeholder="EX: A PIRARARA ATIVOU!"
                        value={selectedResort?.active_highlight || ''}
                        onChange={e => setSelectedResort({...selectedResort, active_highlight: e.target.value})}
                      />
                   </div>

                   <div className="mt-12 flex flex-wrap gap-3 relative z-10">
                      {['Os Tambacas subiram!', 'Pacu na ração de superfície!', 'Dourado na batida!', 'Pirarara braba hoje!'].map(tip => (
                         <button 
                           key={tip}
                           onClick={() => setSelectedResort({...selectedResort, active_highlight: tip})}
                           className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-gray-400 hover:text-accent hover:border-accent/40 transition-all"
                         >
                            {tip}
                         </button>
                      ))}
                      <button 
                        onClick={() => setSelectedResort({...selectedResort, active_highlight: ''})}
                        className="px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      >
                         Limpar Status
                      </button>
                   </div>

                   <button 
                     onClick={() => handleUpdateResort({ active_highlight: selectedResort?.active_highlight })}
                     disabled={saving}
                     className="btn-primary w-full py-6 text-xs font-black uppercase tracking-[0.3em] mt-16 shadow-2xl shadow-accent/20 whitespace-normal"
                   >
                     {saving ? <span className="spinner" /> : 'Disparar Alerta no Mapa'}
                   </button>
                </div>
             </div>
          )}

          {/* TAB: NEWS */}
          {activeTab === 'news' && (
             <div className="space-y-12">
                <header>
                   <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Comunicação Direta</p>
                   <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                      Board <span className="text-gray-700">&</span> News
                   </h1>
                </header>

                <div className="glass p-12 rounded-[50px] border border-white/5 space-y-10">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                         <Megaphone size={30} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black italic uppercase tracking-tighter">Mural do Pesqueiro</h3>
                         <p className="text-gray-500 text-sm font-medium">Use para promoções de longo prazo ou avisos importantes do dia-a-dia.</p>
                      </div>
                   </div>

                   <textarea 
                     className="w-full bg-white/5 border border-white/10 rounded-[32px] p-10 text-xl font-bold text-white outline-none focus:border-amber-500/40 transition-all min-h-[300px]"
                     placeholder="Escreva seu aviso aqui..."
                     value={selectedResort?.notice_board || ''}
                     onChange={e => setSelectedResort({...selectedResort, notice_board: e.target.value})}
                   />

                   <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-3xl">
                      <p className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest mb-2">Simulação de Visualização:</p>
                      <p className="text-white font-medium italic">"{selectedResort?.notice_board || 'Aproveite nossa promoção de feriado!'}"</p>
                   </div>

                   <button 
                     onClick={() => handleUpdateResort({ notice_board: selectedResort?.notice_board })}
                     disabled={saving}
                     className="w-full bg-amber-500 text-dark py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all whitespace-normal"
                   >
                     {saving ? <span className="spinner" /> : 'Atualizar Mural'}
                   </button>
                </div>
             </div>
          )}

          {/* TAB: TOURNAMENTS */}
          {activeTab === 'tournaments' && (
             <div className="space-y-12">
                <header className="flex flex-col items-start gap-8">
                   <div>
                      <p className="text-accent font-black text-[10px] uppercase tracking-[0.3em] mb-4">Gerenciador de Ingressos</p>
                       <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                          Events <span className="text-gray-700">&</span> Arena
                       </h1>
                    </div>
                    <button 
                      onClick={() => setShowNewTournament(true)}
                      className="btn-primary w-full md:w-auto px-10 py-5 text-xs font-black uppercase tracking-widest gap-2 shadow-xl shadow-accent/20 whitespace-normal"
                    >
                      <Plus size={18} /> Novo Torneio
                    </button>
                 </header>

                 <div className="grid grid-cols-1 gap-12">
                    {tournaments.length > 0 ? tournaments.map(t => (
                       <div key={t.id} className="space-y-6">
                          {/* Card do Torneio */}
                          <div className="glass p-10 rounded-[40px] border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent flex flex-col md:flex-row gap-10">
                             <div className="flex-1 space-y-6">
                                <div className="flex items-center gap-3">
                                   <span className={`px-4 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${
                                     t.status === 'open' ? 'bg-accent text-dark' : 'bg-white/5 text-gray-500'
                                   }`}>
                                      {t.status === 'open' ? 'Ativo' : t.status}
                                   </span>
                                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                      Criado em {new Date(t.created_at).toLocaleDateString()}
                                   </span>
                                </div>
                                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">{t.title}</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                   <div>
                                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Engajamento</p>
                                      <p className="text-xl font-black text-white">{(t.tournament_participants || []).length} <span className="text-xs text-gray-600">inscritos</span></p>
                                   </div>
                                   <div>
                                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Data</p>
                                      <p className="text-sm font-bold text-white">{new Date(t.event_date).toLocaleDateString()}</p>
                                   </div>
                                   <div>
                                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Preço Ticket</p>
                                      <p className="text-sm font-bold text-accent">R$ {t.entry_fee}</p>
                                   </div>
                                   <div>
                                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Faturamento Est.</p>
                                      <p className="text-sm font-bold text-white">R$ {t.entry_fee * (t.tournament_participants || []).length}</p>
                                   </div>
                                </div>
                             </div>
                             
                             <div className="md:w-px bg-white/5" />

                             <div className="md:w-48 flex flex-col gap-3 justify-center">
                                <button className="w-full btn-secondary py-3 text-[10px] font-black uppercase tracking-widest gap-2">
                                   <Edit3 size={14} /> Editar Info
                                </button>
                                <button className="w-full bg-red-500/10 border border-red-500/20 text-red-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                   <Trash2 size={14} /> Encerrar
                                </button>
                             </div>
                          </div>

                          {/* Lista de Inscritos */}
                          <div className="pl-10 space-y-4">
                             <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Users size={14} /> Lista de Pescadores Inscritos
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(t.tournament_participants || []).length > 0 ? t.tournament_participants.map((p: any) => (
                                   <div key={p.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4 group hover:bg-white/[0.04] transition-all">
                                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                         {p.profiles?.avatar_url ? (
                                            <img src={p.profiles.avatar_url} className="w-full h-full object-cover" />
                                         ) : (
                                           <div className="w-full h-full bg-slate-800 flex items-center justify-center text-gray-500">
                                             <User size={18} />
                                           </div>
                                         )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <p className="font-bold text-white text-sm truncate uppercase tracking-tight">{p.profiles?.display_name || 'Participante'}</p>
                                         <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-accent font-black">LVL {p.profiles?.level || 1}</span>
                                            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-wider">{new Date(p.registered_at).toLocaleDateString()}</span>
                                         </div>
                                      </div>
                                   </div>
                                )) : (
                                  <div className="col-span-full py-8 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                     <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Nenhuma inscrição realizada ainda</p>
                                  </div>
                                )}
                             </div>
                          </div>
                       </div>
                    )) : (
                      <div className="py-32 text-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[50px]">
                         <Trophy size={100} className="mx-auto text-gray-900 mb-8" />
                         <h3 className="text-2xl font-black text-gray-500 uppercase italic">Nenhum Torneio Ativo</h3>
                         <p className="text-gray-600 mt-2 font-medium">Lance seu primeiro evento e comece a atrair pescadores profissionais agora.</p>
                      </div>
                    )}
                 </div>
              </div>
           )}

         </div>
      </main>

      {/* MODAL: NOVO TORNEIO */}
      {showNewTournament && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-[#0a0f1a]/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="glass p-12 rounded-[50px] border border-white/10 max-w-2xl w-full space-y-10 shadow-3xl">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-[35%] bg-accent flex items-center justify-center text-dark shadow-xl shadow-accent/20">
                    <Trophy size={40} />
                 </div>
                 <div>
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter">Lançar Novo Evento</h3>
                    <p className="text-gray-500 font-medium">As vagas serão abertas instantaneamente.</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Título do Torneio</label>
                       <input 
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-accent"
                         placeholder="Ex: 5ª Copa Tambacu VIP"
                         value={newTournament.title}
                         onChange={e => setNewTournament({...newTournament, title: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Data e Hora de Início</label>
                       <input 
                         type="datetime-local"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-accent"
                         value={newTournament.event_date}
                         onChange={e => setNewTournament({...newTournament, event_date: e.target.value})}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Taxa (R$)</label>
                          <input 
                            type="number"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-accent"
                            value={newTournament.entry_fee}
                            onChange={e => setNewTournament({...newTournament, entry_fee: Number(e.target.value)})}
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Max. Vagas</label>
                          <input 
                            type="number"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-accent"
                            value={newTournament.max_participants}
                            onChange={e => setNewTournament({...newTournament, max_participants: Number(e.target.value)})}
                          />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Destaque de Premiação</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-accent font-black outline-none focus:border-accent"
                          placeholder="Ex: R$ 5.000,00 EM PRÊMIOS"
                          value={newTournament.prize_pool}
                          onChange={e => setNewTournament({...newTournament, prize_pool: e.target.value})}
                        />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Regulamento / Bio</label>
                       <textarea 
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-medium outline-none focus:border-accent min-h-[148px]"
                         placeholder="Escreva as regras e detalhes principais..."
                         value={newTournament.description}
                         onChange={e => setNewTournament({...newTournament, description: e.target.value})}
                       />
                    </div>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setShowNewTournament(false)} className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">Desistir</button>
                 <button 
                  onClick={handleCreateTournament}
                  disabled={saving || !newTournament.title || !newTournament.event_date}
                  className="flex-1 btn-primary py-5 text-xs font-black uppercase tracking-[0.3em]"
                 >
                    {saving ? <span className="spinner" /> : 'Confirmar Lançamento'}
                 </button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  )
}
