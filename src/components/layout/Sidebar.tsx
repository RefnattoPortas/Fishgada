import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Map, Fish, BookOpen, Trophy, User, Settings,
  ChevronRight, Wifi, WifiOff, Plus, Bell, LogOut,
  LogIn, Award, Crown, Store, Building, Menu, X, Compass, Users,
  LifeBuoy, ShieldAlert
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import B2BLanding from '@/components/partners/B2BLanding'
import LoginButton from '@/components/auth/GoogleAuthButton'
import SignOutButton from '@/components/auth/SignOutButton'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { getRankByLevel } from '@/lib/utils/ranks'

const navItems = [
  { href: '/radar',      icon: Map,      label: 'Mapa',           id: 'nav-map' },
  { href: '/explore',    icon: Compass,  label: 'Explorar Locais',id: 'nav-explore' },
  { href: '/captures',   icon: Fish,     label: 'Minhas Capturas', id: 'nav-captures' },
  { href: '/especies',   icon: Award,    label: 'Catálogo / Álbum', id: 'nav-species' },
  { href: '/ranking',     icon: Crown,   label: 'Ranking',        id: 'nav-ranking' },
  { href: '/events',      icon: Trophy,  label: 'Torneios & Eventos', id: 'nav-tournaments' },
  { href: '/logbook',    icon: BookOpen, label: 'Diário de Pesca', id: 'nav-logbook' },
  { href: '/suporte',    icon: LifeBuoy, label: 'Suporte & Feedback', id: 'nav-support' },
]

interface SidebarProps {
  isOnline?: boolean
  pendingSync?: number
  userLevel?: number
  userXP?: number
}

export default function Sidebar({
  isOnline = true,
  pendingSync = 0,
}: SidebarProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isResortOwner, setIsResortOwner] = useState(false)
  const [showLanding, setShowLanding] = useState(false)
  const [isOpenMobile, setIsOpenMobile] = useState(false)


  useEffect(() => {
    const supabase = getSupabaseClient()
    
    const fetchProfile = async (uid: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle()
      setProfile(data)
    }

    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchProfile(user.id)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const safeSession = (session && typeof session === 'object') ? session : null
      
      setUser(safeSession?.user ?? null)
      if (safeSession?.user) {
        fetchProfile(safeSession.user.id)
        checkResortOwner(safeSession.user.id)
      } else {
        setProfile(null)
        setIsResortOwner(false)
      }
    })

    const checkResortOwner = async (uid: string) => {
      const { data } = await supabase
        .from('fishing_resorts')
        .select('id')
        .eq('owner_id', uid)
        .limit(1)
      setIsResortOwner(!!data && data.length > 0)
    }

    if (user) checkResortOwner(user.id)

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const userLevel = profile?.level || 1
  const userRank = getRankByLevel(userLevel)

  const showDefaultMobileButton = pathname !== '/' && pathname !== '/radar'

  useEffect(() => {
    const handleToggle = () => setIsOpenMobile(prev => !prev)
    window.addEventListener('toggleMobileMenu', handleToggle as EventListener)
    return () => window.removeEventListener('toggleMobileMenu', handleToggle as EventListener)
  }, [])

  useEffect(() => {
    if (isOpenMobile) {
      setExpanded(true)
    }
  }, [isOpenMobile])

  return (
    <>
      {/* Mobile Toggle Button */}
      {showDefaultMobileButton && (
        <button 
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="fixed top-4 left-4 z-[9999] md:hidden flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f1829] text-white shadow-2xl border border-white/10 hover:bg-white/5 transition-colors"
        >
          {isOpenMobile ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Backdrop for Mobile */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden transition-all duration-300"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        id="sidebar"
        className={`glass flex flex-col transition-transform duration-300 z-[9999]
          ${isOpenMobile ? 'translate-x-0 border-r-0 shadow-none' : '-translate-x-full md:translate-x-0 border-r border-white/5'} 
          fixed inset-y-0 left-0 md:relative h-full`}
        style={{
          width: expanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-width)',
          minWidth: expanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-width)',
        }}
      >
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute hidden md:flex items-center justify-center cursor-pointer z-10 transition-transform duration-300"
        style={{
          right: -12, top: 28,
          width: 24, height: 24,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 6,
          transform: expanded ? 'rotate(180deg)' : 'none',
        }}
      >
        <ChevronRight size={14} color="var(--color-text-secondary)" />
      </button>

      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden h-full scrollbar-none">
        {/* Logo */}
        <div className={`flex items-center justify-center p-0 mb-2 mt-[20px] transition-all duration-300 
          ${expanded ? (isOpenMobile ? 'h-[60px]' : 'h-[70px]') : 'h-[45px]'}`}>
          <Link href="/radar" className="flex items-center justify-center cursor-pointer group w-full h-full">
            <div className={`flex items-center justify-center overflow-hidden transition-all duration-500 gap-3
              ${expanded ? 'px-4 w-full h-full' : 'w-10 h-10'}`}>
              <img 
                src="/images/1f734841-ff76-4035-91f2-7af673684c92-removebg-preview.png" 
                alt="Fishgada" 
                className={`transition-all duration-500 rounded-none border-0 ${expanded ? 'h-[40px] md:h-[50px] object-contain' : 'w-8 h-8'}`} 
              />
              {expanded && (
                <span className="text-2xl font-black italic tracking-tighter text-white animate-in slide-in-from-left duration-500">
                  FISH<span className="text-cyan-400">GADA</span>
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* User Profile Section - Simple & Compact */}
        <div className={`px-2 mb-4 transition-all ${expanded ? 'mt-2' : 'mt-0'}`}>
          {user ? (
            <Link href="/profile" className={`flex items-center gap-3 p-2 rounded-2xl transition-all hover:bg-white/5 border border-transparent ${expanded ? 'bg-white/[0.03] border-white/5' : ''}`}>
              <div 
                className="relative flex-shrink-0"
                style={{ width: expanded ? 42 : 36, height: expanded ? 42 : 36 }}
              >
                <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 glow-accent-small">
                  {user.user_metadata.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <User size={expanded ? 20 : 18} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div 
                  className="absolute -bottom-1 -right-1 text-[#000] text-[8px] font-black px-1 py-0.5 rounded-md border border-[#0a0f1a] shadow-lg"
                  style={{ backgroundColor: userRank.color }}
                >
                  {userLevel}
                </div>
              </div>
              
              {expanded && (
                <div className="fade-in flex-1 min-w-0">
                  <p className="font-black text-white text-[13px] truncate leading-none mb-1 uppercase tracking-tight">
                    {user.user_metadata.full_name || user.user_metadata.username || 'Pescador'}
                  </p>
                  <div className="flex items-center gap-1.5 opacity-60">
                    <userRank.icon size={10} style={{ color: userRank.color }} />
                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: userRank.color }}>
                      {userRank.title}
                    </span>
                  </div>
                </div>
              )}
            </Link>
          ) : (
             <Link href="/login" className={`flex items-center gap-3 p-3 rounded-2xl transition-all bg-accent/10 border border-accent/20 hover:bg-accent/20 ${!expanded ? 'justify-center p-2' : ''}`}>
               <User size={20} className="text-accent" />
               {expanded && (
                 <span className="text-xs font-black uppercase tracking-widest text-accent fade-in">Meu Perfil</span>
               )}
             </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-2">
          {navItems.map(({ href, icon: Icon, label, id }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                id={id}
                onClick={() => setIsOpenMobile(false)}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} style={{ flexShrink: 0 }} />
                {expanded && (
                  <span className="fade-in" style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>
                    {label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="divider mx-2 my-2" />

        <div className="px-2 sidebar-footer">
          <div className="sidebar-item" style={{ gap: 10 }}>
            {isOnline
              ? <Wifi size={18} color="var(--color-accent-primary)" />
              : <WifiOff size={18} color="var(--color-accent-danger)" />
            }
            {expanded && (
              <div className="fade-in">
                <p style={{ fontSize: 12, fontWeight: 600, color: isOnline ? 'var(--color-accent-primary)' : '#ef4444' }}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            )}
          </div>

          {user && (
            <Link 
              href={isResortOwner ? '/resort-admin' : '/profile?tab=business'} 
              onClick={() => setIsOpenMobile(false)}
              className={`sidebar-item group ${pathname === '/resort-admin' ? 'active' : ''}`}
              style={{ 
                background: 'rgba(0, 212, 170, 0.03)',
                border: '1px solid rgba(0, 212, 170, 0.2)',
                marginBottom: 8
              }}
            >
              <Store size={18} className="text-accent group-hover:scale-110 transition-transform" />
              {expanded && (
                <div className="flex flex-col">
                  <span className="fade-in text-xs font-black uppercase text-accent tracking-tighter">
                    {isResortOwner ? 'Administração' : 'Meu Pesqueiro'}
                  </span>
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Negócios</span>
                </div>
              )}
            </Link>
          )}

          {profile?.is_admin && (
            <Link 
              href="/admin/tickets" 
              onClick={() => setIsOpenMobile(false)}
              className={`sidebar-item group ${pathname === '/admin/tickets' ? 'active' : ''}`}
              style={{ 
                background: 'rgba(239, 68, 68, 0.03)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                marginBottom: 8
              }}
            >
              <ShieldAlert size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
              {expanded && (
                <div className="flex flex-col">
                  <span className="fade-in text-xs font-black uppercase text-red-500 tracking-tighter">
                    Gestão Tickets
                  </span>
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Administração</span>
                </div>
              )}
            </Link>
          )}

          <Link href="/settings" id="nav-settings" className="sidebar-item">
            <Settings size={18} style={{ flexShrink: 0 }} />
            {expanded && <span className="fade-in" style={{ fontSize: 14 }}>Configurações</span>}
          </Link>

          {user ? (
            <div className="flex flex-col gap-1 pb-2">
              <SignOutButton isExpanded={expanded} />
            </div>
          ) : (
            <div className="pb-2">
               <LoginButton isExpanded={expanded} />
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  )
}
