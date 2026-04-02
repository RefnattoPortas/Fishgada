'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Settings, User, Bell, Shield, LogOut, Save, Camera, CheckCircle2, Map as MapIcon, Moon, Sun, Download, Trash2, Globe } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getMapRegions, deleteMapRegion } from '@/lib/offline/indexeddb'

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
  const [activeTab, setActiveTab] = useState('Perfil')
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('light')
  const [mapRegions, setMapRegions] = useState<any[]>([])

  useEffect(() => {
    fetchProfile()
    fetchMapRegions()
    const savedMapTheme = localStorage.getItem('fishgada_map_theme') as 'dark' | 'light'
    if (savedMapTheme) setMapTheme(savedMapTheme)
  }, [])

  const handleLogout = async () => {
    if (!confirm('Tem certeza que deseja sair da sua conta?')) return
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const fetchMapRegions = async () => {
    try {
      const regions = await getMapRegions()
      setMapRegions(regions)
    } catch (err) {
      console.error('Erro ao buscar regiões de mapa:', err)
    }
  }

  const handleDeleteRegion = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este mapa offline?')) {
      await deleteMapRegion(id)
      fetchMapRegions()
    }
  }

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
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Personalize sua experiência no Fishgada</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Sidebar de Navegação Interna */}
            <aside className="space-y-2">
              {[
                { label: 'Perfil', icon: User },
                { label: 'Notificações', icon: Bell },
                { label: 'Mapa & Visual', icon: MapIcon },
                { label: 'Mapas Baixados', icon: Download },
                { label: 'Privacidade', icon: Shield },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setActiveTab(item.label)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                    activeTab === item.label 
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
              
              {activeTab === 'Perfil' && (
                <>
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
                    <button 
                      onClick={handleLogout}
                      className="px-5 py-2.5 rounded-xl border border-red-500/30 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 transition-colors flex items-center gap-2">
                      <LogOut size={14} /> Sair
                    </button>
                  </div>
                </div>
              </>
              )}

              {activeTab === 'Notificações' && (
                <div className="glass-elevated p-8 rounded-[32px] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] rounded-full -mr-16 -mt-16" />
                  <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-8 flex items-center gap-2">
                    <Bell size={20} className="text-accent" /> Notificações
                  </h3>
                  <div className="space-y-6">
                    <p className="text-gray-400 font-medium">As configurações de notificações estarão disponíveis em breve.</p>
                  </div>
                </div>
              )}

              {activeTab === 'Mapa & Visual' && (
                <div className="glass-elevated p-8 rounded-[32px] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] rounded-full -mr-16 -mt-16" />
                  <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-8 flex items-center gap-2">
                    <MapIcon size={20} className="text-accent" /> Mapa & Visual
                  </h3>
                  
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-sm font-black text-white uppercase tracking-widest block">Aparência do Mapa</label>
                      <p className="text-gray-400 text-xs mb-4">Escolha entre um mapa focado no constraste do escuro ou a clareza do dia.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                          onClick={() => {
                            setMapTheme('light')
                            localStorage.setItem('fishgada_map_theme', 'light')
                          }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                            mapTheme === 'light' 
                            ? 'bg-accent/10 border-accent/50 text-accent font-bold shadow-[0_0_15px_rgba(0,212,170,0.2)]' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                           <Sun size={24} className={mapTheme === 'light' ? 'text-accent' : 'text-gray-400'} />
                           <div className="text-left flex-1">
                             <div className="text-sm uppercase tracking-widest font-black">Modo Claro</div>
                             <div className="text-[10px] opacity-70 mt-1">Navegação tipo Voyager, tons azuis e rua</div>
                           </div>
                           {mapTheme === 'light' && <CheckCircle2 size={16} />}
                        </button>
                        
                        <button 
                          onClick={() => {
                            setMapTheme('dark')
                            localStorage.setItem('fishgada_map_theme', 'dark')
                          }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                            mapTheme === 'dark' 
                            ? 'bg-accent/10 border-accent/50 text-accent font-bold shadow-[0_0_15px_rgba(0,212,170,0.2)]' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                           <Moon size={24} className={mapTheme === 'dark' ? 'text-accent' : 'text-gray-400'} />
                           <div className="text-left flex-1">
                             <div className="text-sm uppercase tracking-widest font-black">Modo Escuro</div>
                             <div className="text-[10px] opacity-70 mt-1">Dark Matter alto contraste e bateria</div>
                           </div>
                           {mapTheme === 'dark' && <CheckCircle2 size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Mapas Baixados' && (
                <div className="glass-elevated p-8 rounded-[32px] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] rounded-full -mr-16 -mt-16" />
                  <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-8 flex items-center gap-2">
                    <Download size={20} className="text-accent" /> Mapas Baixados
                  </h3>
                  
                  <div className="space-y-6">
                    {mapRegions.length === 0 ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                          <Globe className="text-gray-600" size={32} />
                        </div>
                        <div>
                          <p className="text-white font-bold">Nenhum mapa baixado</p>
                          <p className="text-gray-500 text-xs">Aproveite para baixar regiões e pescar em locais sem sinal de internet.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {mapRegions.map((region) => (
                          <div key={region.id} className="p-5 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-between group hover:border-accent/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                                <MapIcon size={24} />
                              </div>
                              <div>
                                <h4 className="text-white font-black text-sm uppercase tracking-tight">{region.name}</h4>
                                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">
                                  {region.tile_count} Tiles • {region.size_mb.toFixed(1)} MB
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteRegion(region.id)}
                              className="p-3 text-gray-500 hover:text-red-500 transition-colors"
                              title="Remover Mapa"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-6 border-t border-white/10">
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest text-center">
                        Para baixar novos mapas, utilize o botão de Download diretamente na tela do Radar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Privacidade' && (
                <div className="glass-elevated p-8 rounded-[32px] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] rounded-full -mr-16 -mt-16" />
                  <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-8 flex items-center gap-2">
                    <Shield size={20} className="text-accent" /> Privacidade
                  </h3>
                  <div className="space-y-6">
                    <p className="text-gray-400 font-medium">As configurações de privacidade estarão disponíveis em breve.</p>
                  </div>
                </div>
              )}


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
