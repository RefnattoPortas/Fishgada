'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Map, Fish, BookOpen, Trophy, User, Settings,
  ChevronRight, Wifi, WifiOff, Plus, Bell, LogOut,
  LogIn
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import GoogleAuthButton from '@/components/auth/GoogleAuthButton'
import SignOutButton from '@/components/auth/SignOutButton'
import { User as SupabaseUser } from '@supabase/supabase-js'

const navItems = [
  { href: '/',           icon: Map,      label: 'Mapa',      id: 'nav-map' },
  { href: '/captures',   icon: Fish,     label: 'Capturas',  id: 'nav-captures' },
  { href: '/logbook',    icon: BookOpen, label: 'Diário',    id: 'nav-logbook' },
  { href: '/ranking',    icon: Trophy,   label: 'Ranking',   id: 'nav-ranking' },
  { href: '/profile',    icon: User,     label: 'Perfil',    id: 'nav-profile' },
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
  userLevel = 1,
  userXP = 0,
}: SidebarProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    
    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const xpForNextLevel = userLevel * 500
  const xpProgress = Math.min((userXP % 500) / 500 * 100, 100)

  return (
    <aside
      id="sidebar"
      className="glass flex flex-col border-r transition-all duration-300 z-30 relative"
      style={{
        width: expanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-width)',
        minWidth: expanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-width)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-3 mb-2 mt-1" style={{ minHeight: 60 }}>
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl glow-green cursor-pointer"
          style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, var(--color-accent-primary), #0077b6)',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Fish size={20} color="white" />
        </div>
        {expanded && (
          <div className="fade-in overflow-hidden">
            <p className="font-bold text-gradient" style={{ fontSize: 16, lineHeight: 1 }}>WikiFish</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Pesca Esportiva</p>
          </div>
        )}
      </div>

      {/* Botão de expandir (chevron) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute"
        style={{
          right: -12, top: 18,
          width: 24, height: 24,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 10,
          transition: 'transform 0.3s ease',
          transform: expanded ? 'rotate(180deg)' : 'none',
        }}
        title={expanded ? 'Recolher' : 'Expandir'}
      >
        <ChevronRight size={14} color="var(--color-text-secondary)" />
      </button>

      {/* User Level Badge */}
      {expanded && (
        <div className="fade-in px-3 mb-3">
          <div className="card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="badge badge-amber">Nv. {userLevel}</div>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {userXP} XP
              </span>
            </div>
            {/* XP progressbar */}
            <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2 }}>
              <div
                style={{
                  height: '100%',
                  width: `${xpProgress}%`,
                  background: 'linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary))',
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {xpForNextLevel - (userXP % 500)} XP para o próximo nível
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label, id }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              id={id}
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

      {/* Separador */}
      <div className="divider mx-2 my-2" />

      {/* Status de conexão + sync */}
      <div className="px-2 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <div
          className="sidebar-item"
          style={{ gap: 10 }}
          title={isOnline ? 'Online' : 'Offline'}
        >
          {isOnline
            ? <Wifi size={18} color="var(--color-accent-primary)" />
            : <WifiOff size={18} color="var(--color-accent-danger)" />
          }
          {expanded && (
            <div className="fade-in">
              <p style={{ fontSize: 12, fontWeight: 600, color: isOnline ? 'var(--color-accent-primary)' : '#ef4444' }}>
                {isOnline ? 'Online' : 'Offline'}
              </p>
              {pendingSync > 0 && (
                <p style={{ fontSize: 10, color: 'var(--color-accent-warm)' }}>
                  {pendingSync} item(ns) pendente(s)
                </p>
              )}
            </div>
          )}
          {/* Badge de pendentes */}
          {!expanded && pendingSync > 0 && (
            <div
              className="absolute"
              style={{
                right: 8, top: 'calc(100% - 90px)',
                width: 16, height: 16,
                background: 'var(--color-accent-warm)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#000',
              }}
            >
              {pendingSync}
            </div>
          )}
        </div>

        {/* Settings */}
        <Link href="/settings" id="nav-settings" className="sidebar-item">
          <Settings size={18} style={{ flexShrink: 0 }} />
          {expanded && <span className="fade-in" style={{ fontSize: 14 }}>Configurações</span>}
        </Link>

        {/* Auth Buttons */}
        {user ? (
          <div className="flex flex-col gap-1">
            <Link href="/profile" className="sidebar-item">
              <div 
                className="rounded-full overflow-hidden flex-shrink-0"
                style={{ width: 20, height: 20, border: '1px solid var(--color-border)' }}
              >
                {user.user_metadata.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="m-auto" />
                )}
              </div>
              {expanded && (
                <span className="fade-in truncate" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {user.user_metadata.full_name || user.email}
                </span>
              )}
            </Link>
            <SignOutButton isExpanded={expanded} />
          </div>
        ) : (
          <GoogleAuthButton isExpanded={expanded} />
        )}
      </div>
    </aside>
  )
}
