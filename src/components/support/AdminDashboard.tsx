'use client'

import React, { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { 
  History, Eye, CheckCircle2, Clock, 
  MessageSquare, AlertTriangle, ExternalLink, Filter, 
  Search, Calendar, User, MoreHorizontal, Check, RefreshCw
} from 'lucide-react'

const statusOptions = [
  { value: 'aberto', label: 'Aberto', color: 'bg-white/10 text-white border-white/20' },
  { value: 'em desenvolvimento', label: 'Em Desenvolvimento', color: 'bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/20' },
  { value: 'concluído', label: 'Concluído', color: 'bg-[#00d4aa]/10 text-[#00d4aa] border-[#00d4aa]/20' },
]

const priorityColors: Record<string, string> = {
  baixa: 'badge-gray',
  média: 'badge-blue',
  alta: 'badge-amber',
  urgente: 'badge-red',
}

export default function AdminDashboard() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const supabase = getSupabaseClient()

  const fetchTickets = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setTickets(data || [])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [statusFilter])

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingTicket(ticketId)
    try {
      const { error: updateError } = await (supabase
        .from('support_tickets') as any)
        .update({ status: newStatus })
        .eq('id', ticketId)

      if (updateError) throw updateError
      
      // Update local state
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: newStatus } : t
      ))
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message)
    } finally {
      setUpdatingTicket(null)
    }
  }

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(o => o.value === status) || statusOptions[0]
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 glass-elevated rounded-3xl animate-fade-in">
        <div className="spinner mb-4" />
        <p className="text-slate-400">Carregando canais de comunicação...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header section with Stats or Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: tickets.length, icon: History, color: 'text-white' },
          { label: 'Abertos', value: tickets.filter(t => t.status === 'aberto').length, icon: Clock, color: 'text-[#ef4444]' },
          { label: 'Em Desenvolvimento', value: tickets.filter(t => t.status === 'em desenvolvimento').length, icon: RefreshCw, color: 'text-[#0ea5e9]' },
          { label: 'Concluídos', value: tickets.filter(t => t.status === 'concluído').length, icon: CheckCircle2, color: 'text-[#00d4aa]' },
        ].map((stat, i) => (
          <div key={i} className="glass p-4 rounded-2xl border-white/5 border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stat.label}</span>
              <stat.icon size={14} className={stat.color} />
            </div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-elevated rounded-3xl border border-white/5 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3.5 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Pesquisar tickets..." 
                    className="input pl-10 h-10 min-h-[40px] text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                {statusOptions.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value === statusFilter ? 'all' : opt.value)}
                        className={`badge cursor-pointer transition-all ${statusFilter === opt.value ? (opt.label === 'Aberto' ? 'badge-red' : opt.label === 'Concluído' ? 'badge-green' : 'badge-blue') : 'badge-gray opacity-50 hover:opacity-100'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto h-[500px] scrollbar-none">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0f1829] z-10">
              <tr className="text-xxs font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                <th className="px-6 py-4">Ticket</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4 text-center">Prioridade</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Data</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-white text-sm font-bold truncate max-w-[200px]">{ticket.subject}</span>
                        <span className="text-xxs text-slate-500 font-medium uppercase tracking-tight">{ticket.category.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-slate-800 overflow-hidden ring-1 ring-white/10">
                        {ticket.profiles?.avatar_url ? (
                          <img src={ticket.profiles.avatar_url} alt="User" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-cyan-500/10">
                            <User size={12} className="text-cyan-400" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-white/80 font-medium">{ticket.profiles?.display_name || 'Desconhecido'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`badge ${priorityColors[ticket.priority] || 'badge-gray'} !text-[10px]`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-600 font-medium">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative group/actions">
                            <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                                <MoreHorizontal size={14} />
                            </button>
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover/actions:block w-[180px] bg-[#121e30] border border-white/10 rounded-xl shadow-2xl p-1 z-20">
                                <div className="text-[9px] font-black text-slate-500 px-3 py-2 uppercase tracking-widest border-b border-white/5 mb-1">Mudar Status</div>
                                {statusOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleUpdateStatus(ticket.id, opt.value)}
                                        disabled={updatingTicket === ticket.id}
                                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between hover:bg-white/5 transition-colors ${ticket.status === opt.value ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}
                                    >
                                        {opt.label}
                                        {ticket.status === opt.value && <Check size={12} />}
                                    </button>
                                ))}
                                {ticket.attachment_url && (
                                    <div className="border-t border-white/5 mt-1 pt-1">
                                        <a 
                                            href={ticket.attachment_url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="w-full text-left p-2 rounded-lg text-xs text-slate-300 flex items-center gap-2 hover:bg-white/5"
                                        >
                                            <ExternalLink size={12} />
                                            Ver Anexo
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTickets.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center gap-2">
                <MessageSquare className="text-slate-600 w-12 h-12 mb-2" />
                <p className="text-slate-400 text-sm italic">Nenhum ticket encontrado nos canais de escuta.</p>
                {statusFilter !== 'all' && (
                    <button onClick={() => setStatusFilter('all')} className="text-cyan-400 text-xs font-bold underline">Limpar filtros</button>
                )}
            </div>
          )}
        </div>
      </div>
      
      {/* Help info */}
      <div className="flex items-center gap-3 p-4 bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-2xl text-[11px] text-slate-400 leading-relaxed italic">
        <AlertTriangle size={16} className="text-[#0ea5e9] shrink-0" />
        Para tickets de "Alta Prioridade" ou "Urgente", recomenda-se contato imediato com Thais se não houver resolução técnica automática.
      </div>
    </div>
  )
}
