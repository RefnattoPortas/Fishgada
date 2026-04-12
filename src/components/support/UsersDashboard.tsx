'use client'

import React, { useEffect, useState } from 'react'
import { Users, Crown, Store, TrendingUp, Activity } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function UsersDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    free: 0,
    pro: 0,
    partner: 0,
    recent: 0
  })
  
  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchUsers = async () => {
      // In a production environment with millions of users, this should be done via an RPC / Serverless function
      // and getting precise counts.
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, created_at')
      
      if (data && !error) {
        const now = new Date()
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30))
        
        let free = 0; let pro = 0; let partner = 0; let recent = 0;
        
        data.forEach((user: any) => {
            if (user.subscription_tier === 'pro') pro++;
            else if (user.subscription_tier === 'partner') partner++;
            else free++;
            
            if (new Date(user.created_at) > thirtyDaysAgo) {
                recent++;
            }
        })
        
        setStats({
            total: data.length,
            free,
            pro,
            partner,
            recent
        })
      }
      setLoading(false)
    }
    
    fetchUsers()
  }, [supabase])

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center py-20 text-slate-400">
         <div className="spinner-small mb-4 border-cyan-500" />
         <span className="text-sm">Carregando métricas da base de usuários...</span>
       </div>
     )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={18} className="text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Métricas de Usuários</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="glass-elevated p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[40px] -z-10 group-hover:bg-blue-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Users className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total de Contas</p>
              <p className="text-3xl font-black text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        {/* Free Users */}
        <div className="glass-elevated p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] -z-10 group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Users className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Pescadores (Gratuito)</p>
              <p className="text-3xl font-black text-white">{stats.free}</p>
            </div>
          </div>
        </div>

        {/* Pro Users */}
        <div className="glass-elevated p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[40px] -z-10 group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Crown className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Fishgada Pro</p>
              <p className="text-3xl font-black text-white">{stats.pro}</p>
            </div>
          </div>
        </div>

        {/* Partners */}
        <div className="glass-elevated p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[40px] -z-10 group-hover:bg-orange-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <Store className="text-orange-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Pesqueiros (Parceiro)</p>
              <p className="text-3xl font-black text-white">{stats.partner}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="glass-elevated p-6 rounded-3xl border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
              <TrendingUp className="text-cyan-400" size={24} />
            </div>
            <div>
              <p className="text-cyan-400/80 text-[10px] font-black uppercase tracking-wider">Crescimento</p>
              <p className="text-lg font-bold text-white"><span className="text-cyan-400">+{stats.recent}</span> novos usuários cadastrados nos últimos 30 dias</p>
            </div>
          </div>
      </div>
    </div>
  )
}
