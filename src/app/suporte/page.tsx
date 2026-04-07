'use client'

import React, { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TicketForm from '@/components/support/TicketForm'
import { getSupabaseClient } from '@/lib/supabase/client'
import { 
  MessageSquare, Clock, CheckCircle2, 
  ChevronRight, ArrowLeft, LifeBuoy, AlertCircle 
} from 'lucide-react'

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchMyTickets = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) setTickets(data || [])
      setLoading(false)
    }

    fetchMyTickets()
  }, [])

  // Monitor connection
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a101f]">
      <Sidebar isOnline={isOnline} />
      
      <main className="flex-1 overflow-y-auto relative scrollbar-none pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-[0.2em]">
                <LifeBuoy size={14} />
                <span>Central de Ajuda</span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">
                Como podemos <span className="text-gradient">ajudar?</span>
              </h1>
              <p className="text-slate-400 max-w-lg">
                Se encontrou um bug, tem uma sugestão ou precisa de suporte técnico, use o formulário abaixo.
              </p>
            </div>
            
            <button 
              onClick={() => setShowForm(!showForm)}
              className={showForm ? "btn-secondary" : "btn-primary"}
            >
              {showForm ? (
                <>
                  <ArrowLeft size={18} />
                  <span>Ver Meus Tickets</span>
                </>
              ) : (
                <>
                  <MessageSquare size={18} />
                  <span>Novo Ticket</span>
                </>
              )}
            </button>
          </header>

          <div className="w-full">
            {showForm ? (
              <TicketForm />
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Clock size={16} className="text-cyan-400" />
                        Histórico de Solicitações
                    </h3>
                </div>

                {loading ? (
                  <div className="p-12 text-center flex flex-col items-center gap-4">
                    <div className="spinner" />
                    <p className="text-slate-500 text-sm">Carregando seus tickets...</p>
                  </div>
                ) : tickets.length > 0 ? (
                  <div className="grid gap-4">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="card p-5 group flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] cursor-default">
                        <div className="flex gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${ticket.status === 'concluído' ? 'bg-green-500/10' : 'bg-cyan-500/10'}`}>
                                {ticket.status === 'concluído' ? (
                                    <CheckCircle2 className="text-green-500" size={24} />
                                ) : (
                                    <MessageSquare className="text-cyan-500" size={24} />
                                )}
                            </div>
                            <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-bold leading-none">{ticket.subject}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${ticket.priority === 'alta' || ticket.priority === 'urgente' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-slate-400'}`}>
                                        {ticket.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xxs text-slate-500 font-medium uppercase tracking-tight">
                                    <span>#{ticket.id.slice(0, 8)}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span className={ticket.status === 'em desenvolvimento' ? 'text-blue-400' : ticket.status === 'concluído' ? 'text-green-400' : ''}>
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="text-slate-700 group-hover:text-cyan-400 transition-colors" size={20} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center glass rounded-3xl border-dashed border-white/10 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                        <AlertCircle className="text-slate-600" size={32} />
                    </div>
                    <div>
                        <p className="text-white font-bold mb-1">Você ainda não tem tickets</p>
                        <p className="text-slate-500 text-xs">Sempre que precisar de ajuda, seus tickets aparecerão aqui.</p>
                    </div>
                    <button 
                        onClick={() => setShowForm(true)}
                        className="btn-secondary mt-2 px-6"
                    >
                        Abrir meu primeiro ticket
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick FAQ / Contacts */}
          {!showForm && (
            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl border-white/5">
                    <h4 className="text-white font-bold mb-2">Comunidade</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Participe do nosso grupo oficial para trocar experiências com outros pescadores.
                    </p>
                    <a href="https://wa.me/..." className="text-cyan-400 text-xs font-black uppercase tracking-widest hover:underline">Entrar no WhatsApp →</a>
                </div>
                <div className="glass p-6 rounded-2xl border-white/5">
                    <h4 className="text-white font-bold mb-2">Termos e Privacidade</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Dúvidas sobre como usamos seus dados ou as regras da plataforma? Consute nossos documentos.
                    </p>
                    <div className="flex gap-4">
                        <a href="/termos" className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Termos</a>
                        <a href="/privacidade" className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Privacidade</a>
                    </div>
                </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
