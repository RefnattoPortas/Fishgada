'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Settings, User, Bell, Shield, LogOut, Save, Camera, CheckCircle2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>({
    display_name: '',
    username: '',
    bio: '',
    avatar_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setUser(user)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        const d = data as any
        setProfile({
          display_name: d.display_name || '',
          username: d.username || '',
          bio: d.bio || '',
          avatar_url: d.avatar_url || ''
        })
      }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const supabase = getSupabaseClient()
    
    try {
      const updatePayload: Record<string, any> = {
        display_name: profile.display_name,
        username: profile.username,
        bio: profile.bio,
        updated_at: new Date().toISOString()
      }
      const { error } = await (supabase as any)
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id)

      if (error) throw error
      
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar perfil:', err)
      alert('Erro ao salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0a0f1a]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
        <div className="max-w-3xl mx-auto space-y-10 fade-in">
          
          {/* Header */}
          <header className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent shadow-lg shadow-accent/10">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Configurações</h1>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Personalize sua experiência no WikiFish</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Sidebar de Navegação Interna */}
            <aside className="space-y-2">
              {[
                { label: 'Perfil', icon: User, active: true },
                { label: 'Notificações', icon: Bell, active: false },
                { label: 'Privacidade', icon: Shield, active: false },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                    item.active 
                      ? 'bg-accent text-dark shadow-lg shadow-accent/20' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </aside>

            {/* Painel Central */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Profile Card */}
              <div className="glass-elevated p-8 rounded-[32px] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] rounded-full -mr-16 -mt-16" />
                
                <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-8 flex items-center gap-2">
                  <User size={20} className="text-accent" /> Informações do Perfil
                </h3>

                <div className="space-y-6">
                  {/* Avatar Upload Placeholder */}
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 bg-slate-900 shadow-2xl">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={40} className="text-white/10" />
                          </div>
                        )}
                      </div>
                      <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-accent text-dark flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                        <Camera size={16} />
                      </button>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Foto do Perfil</p>
                      <p className="text-gray-500 text-xs">Sincronizada automaticamente com seu Google Auth.</p>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1">Nome de Exibição</label>
                      <input 
                        type="text" 
                        value={profile.display_name}
                        onChange={(e) => setProfile({...profile, display_name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent/50 outline-none transition-all font-medium"
                        placeholder="Como você quer ser chamado..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1">Username</label>
                      <input 
                        type="text" 
                        value={profile.username}
                        onChange={(e) => setProfile({...profile, username: e.target.value.toLowerCase()})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent/50 outline-none transition-all font-medium"
                        placeholder="@username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1">Bio</label>
                      <textarea 
                        value={profile.bio}
                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent/50 outline-none transition-all font-medium resize-none"
                        placeholder="Fale um pouco sobre suas pescarias..."
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-green-500 font-bold text-sm transition-all ${showSuccess ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                      <CheckCircle2 size={18} /> Alterações salvas!
                    </div>
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary px-8 py-3 rounded-2xl flex items-center gap-3 font-black text-sm relative overflow-hidden active:scale-95 transition-transform"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
                      ) : (
                        <><Save size={18} /> Salvar Alterações</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-8 rounded-[32px] border border-red-500/20 bg-red-500/[0.02] space-y-4">
                <h4 className="text-red-500 font-black text-xs uppercase tracking-widest">Zona de Perigo</h4>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-bold">Desconectar conta</p>
                    <p className="text-gray-500 text-xs text-balance">Isso removerá sua sessão atual deste dispositivo.</p>
                  </div>
                  <button className="px-5 py-2.5 rounded-xl border border-red-500/30 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 transition-colors flex items-center gap-2">
                    <LogOut size={14} /> Sair
                  </button>
                </div>
              </div>

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
