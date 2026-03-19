'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Map, Fish, BookOpen, Trophy, User, Settings,
  ChevronRight, Wifi, WifiOff, Plus, Bell, LogOut,
  LogIn, Award, Crown, Store, Building, Menu, X
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import B2BLanding from '@/components/partners/B2BLanding'
import GoogleAuthButton from '@/components/auth/GoogleAuthButton'
import SignOutButton from '@/components/auth/SignOutButton'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { getRankByLevel } from '@/lib/utils/ranks'

const navItems = [
  { href: '/',           icon: Map,      label: 'Mapa',           id: 'nav-map' },
  { href: '/captures',   icon: Fish,     label: 'Minhas Capturas', id: 'nav-captures' },
  { href: '/leaderboard', icon: Award,   label: 'Leaderboard',    id: 'nav-leaderboard' },
  { href: '/events',      icon: Trophy,  label: 'Torneios & Eventos', id: 'nav-tournaments' },
  { href: '/logbook',    icon: BookOpen, label: 'Diário de Pesca', id: 'nav-logbook' },
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
        .single()
      setProfile(data)
    }

    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchProfile(user.id)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        checkResortOwner(session.user.id)
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
  const userXP = profile?.xp_points || 0
  const userRank = getRankByLevel(userLevel)
  const xpForNextLevel = userLevel * 500
  const xpProgress = Math.min((userXP % 500) / 500 * 100, 100)

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpenMobile(!isOpenMobile)}
        className="fixed top-4 left-4 z-50 md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-dark shadow-lg shadow-accent/20 border border-accent/20"
      >
        {isOpenMobile ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop for Mobile */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        id="sidebar"
        className={`glass flex flex-col border-r transition-all duration-300 z-40 relative 
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          fixed md:relative h-full`}
        style={{
          width: expanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-width)',
          minWidth: expanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-width)',
        }}
      >
      {/* Botão de expandir (chevron) - Fora do container de scroll para ficar visível */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute"
        style={{
          right: -12, top: 28,
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

      {/* Container de Conteúdo com Scroll Interno */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden h-full">
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
              <p className="font-bold text-gradient" style={{ fontSize: 16, lineHeight: 1 }}>Fish-Map</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Pesca Esportiva</p>
            </div>
          )}
        </div>

        {/* User Profile Section */}
        {user && (
          <div className={`px-2 mb-4 transition-all ${expanded ? 'mt-2' : 'mt-0'}`}>
            <div className={`flex items-center gap-3 p-2 rounded-2xl transition-all ${expanded ? 'bg-white/[0.03] border border-white/5' : ''}`}>
               <Link href="/profile" className="relative flex-shrink-0 group">
                <div 
                  className="rounded-xl overflow-hidden glow-accent-small transition-transform group-hover:scale-105"
                  style={{ 
                    width: expanded ? 48 : 36, 
                    height: expanded ? 48 : 36, 
                    border: profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'partner'
                        ? '2px solid #fbbf24'
                        : '2px solid var(--color-accent-primary)' 
                  }}
                >
                  {user.user_metadata.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <User size={expanded ? 24 : 18} className="text-gray-400" />
                    </div>
                  )}
                </div>
                {(profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'partner') && (
                  <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-[#0a0f1a] shadow-lg animate-bounce z-10">
                    <Crown size={10} className="text-dark fill-dark" />
                  </div>
                )}
                <div 
                  className="absolute -bottom-1 -right-1 text-[#000] text-[9px] font-black px-1.5 py-0.5 rounded-md border border-[#0a0f1a] shadow-lg"
                  style={{ backgroundColor: userRank.color }}
                >
                  L{userLevel}
                </div>
              </Link>
              
              {expanded && (
                <div className="fade-in flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <userRank.icon size={12} style={{ color: userRank.color }} />
                    <span 
                      className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                      style={{ color: userRank.color }}
                    >
                      {userRank.title}
                    </span>
                  </div>
                  <p className="font-bold text-white text-sm truncate">
                    {user.user_metadata.full_name || user.user_metadata.username || 'Pescador'}
                  </p>
                  <div className="flex items-center justify-between mt-1 mb-1">
                    <span className="text-[10px] text-accent font-bold uppercase tracking-tighter">XP {userXP}</span>
                    <span className="text-[10px] text-gray-500 font-bold">{xpForNextLevel - (userXP % 500)} para L{userLevel + 1}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent-secondary rounded-full transition-all duration-1000"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            {!expanded && (
              <div className="mt-2 h-1 w-8 mx-auto bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-1000"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

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
          {/* Navigation Items (Regular) - Removed Admin Link from here to consolidate at bottom */}
        </nav>

        {/* Separador */}
        <div className="divider mx-2 my-2" />

        {/* Status de conexão + sync */}
        <div className="px-2 sidebar-footer">
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
            {!expanded && pendingSync > 0 && (
              <div
                className="absolute"
                style={{
                  right: 8, top: 'auto', bottom: 8,
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

          {/* Botão de Anunciar Pesqueiro (Somente se não tiver um e estiver logado) */}
          {user && (
            profile?.subscription_tier === 'partner' || profile?.subscription_tier === 'admin' ? (
              <Link 
                href="/resort-admin" 
                className={`sidebar-item group ${pathname === '/resort-admin' ? 'active' : ''}`}
                style={{ 
                  background: 'linear-gradient(to right, rgba(0, 212, 170, 0.05), transparent)',
                  border: '1px solid rgba(0, 212, 170, 0.1)',
                  marginBottom: 8
                }}
              >
                 <Settings size={18} className="text-accent" />
                 {expanded && (
                   <span className="fade-in text-xs font-black uppercase text-accent">Meu Painel Admin</span>
                 )}
              </Link>
            ) : (
              <button 
                onClick={() => setShowLanding(true)}
                className="sidebar-item group"
                style={{ 
                  background: 'rgba(0, 212, 170, 0.03)',
                  border: '1px solid rgba(0, 212, 170, 0.4)',
                  boxShadow: '0 0 10px rgba(0, 212, 170, 0.1)',
                  marginBottom: 8,
                  textAlign: 'left'
                }}
              >
                 <Store size={18} className="text-accent group-hover:scale-110 transition-transform" />
                 {expanded && (
                   <span className="fade-in text-xs font-black uppercase text-accent tracking-tighter">Anunciar Pesqueiro</span>
                 )}
              </button>
            )
          )}

          {/* Settings */}
          <Link href="/settings" id="nav-settings" className="sidebar-item">
            <Settings size={18} style={{ flexShrink: 0 }} />
            {expanded && <span className="fade-in" style={{ fontSize: 14 }}>Configurações</span>}
          </Link>

          {/* Auth Buttons */}
          {user ? (
            <div className="flex flex-col gap-1 pb-2">
              <SignOutButton isExpanded={expanded} />
            </div>
          ) : (
            <div className="pb-2">
               <GoogleAuthButton isExpanded={expanded} />
            </div>
          )}
        </div>
      </div>
    </aside>
    {showLanding && (
      <B2BLanding 
         onClose={() => setShowLanding(false)} 
         onStart={() => {
            setShowLanding(false)
            window.location.href = '/profile?tab=business&start=true'
         }}
      />
    )}
    </>
  )
}
