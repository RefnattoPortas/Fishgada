'use client'

import React, { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import AdminDashboard from '@/components/support/AdminDashboard'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Terminal, MessageSquare, AlertTriangle, Users } from 'lucide-react'

export default function AdminTicketsPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (error || !(profile as any)?.is_admin) {
        // Se der erro (ex: coluna is_admin não existe ainda), tentamos ser proativos
        console.warn('Verificação de Admin falhou ou coluna não existe.', error)
        setIsAdmin(false)
        setLoading(false)
        router.push('/') // Redirect non-admins
        return
      }

      setIsAdmin(true)
      setLoading(false)
    }

    checkAdmin()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0f1a] flex flex-col items-center justify-center text-white">
        <div className="spinner mb-4" />
        <p className="text-slate-500 animate-pulse uppercase tracking-[0.2em] font-black text-xs">Acessando Terminal de Gestão...</p>
      </div>
    )
  }

  if (isAdmin === false) return null

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a101f]">
      <Sidebar isOnline={true} />
      
      <main className="flex-1 overflow-y-auto relative scrollbar-none pb-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          
          <header className="mb-12 space-y-4">
            <div className="flex items-center gap-3 text-red-500 font-bold text-xs uppercase tracking-[0.2em]">
              <div className="p-1 px-2 border border-red-500/20 bg-red-500/10 rounded flex items-center gap-1.5">
                <ShieldAlert size={14} />
                <span>Admin Level Control</span>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter leading-none mb-1">
                        Gestão de <span className="text-gradient">Tickets</span>
                    </h1>
                    <p className="text-slate-400 max-w-lg text-sm">
                        Painel centralizado de suporte, feedbacks e resolução de bugs reportados pela comunidade.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                    <Users size={16} className="text-slate-500" />
                    <div className="flex flex-col">
                        <span className="text-white text-xs font-bold leading-tight">Painel Compartilhado</span>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Thais & Renatinho</span>
                    </div>
                </div>
            </div>
          </header>

          <AdminDashboard />

          <footer className="mt-20 flex items-center justify-between p-6 glass rounded-3xl border-white/5">
                <div className="flex items-center gap-3">
                    <Terminal size={18} className="text-cyan-400" />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fishgada Admin Terminal v1.0.4 - 2026</span>
                </div>
                <div className="text-[10px] text-slate-600 font-medium italic">
                    Log de auditoria ativo para todas as mudanças de status.
                </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
