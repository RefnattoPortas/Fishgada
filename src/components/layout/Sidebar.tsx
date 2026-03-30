'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Map, Fish, BookOpen, Trophy, User, Settings,
  ChevronRight, Wifi, WifiOff, Plus, Bell, LogOut,
  LogIn, Award, Crown, Store, Building, Menu, X, Compass
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
      // Proteção: Algumas versões da sessão no localStorage podem vir como string
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
  const userXP = profile?.xp_points || 0
  const userRank = getRankByLevel(userLevel)
  const xpForNextLevel = userLevel * 500
  const xpProgress = Math.min((userXP % 500) / 500 * 100, 100)

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

  const trialDaysLeft = profile?.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <>
      {/* Mobile Toggle Button (Hidden on Map page to use custom embedded button instead) */}
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
      {/* Botão de expandir (chevron) - Fora do container de scroll para ficar visível */}
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
        title={expanded ? 'Recolher' : 'Expandir'}
      >
        <ChevronRight size={14} color="var(--color-text-secondary)" />
      </button>

      {/* Container de Conteúdo com Scroll Interno */}
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
                    border: profile?.subscription_tier === 'partner'
                        ? '2px solid #a855f7'
                        : (profile?.subscription_tier === 'pro' || trialDaysLeft > 0)
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
                {(profile?.subscription_tier === 'pro' || trialDaysLeft > 0) && (
                  <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-[#0a0f1a] shadow-lg animate-bounce z-10">
                    <Crown size={10} className="text-dark fill-dark" />
                  </div>
                )}
                {profile?.subscription_tier === 'partner' && (
                  <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center border-2 border-[#0a0f1a] shadow-lg animate-bounce z-10">
                    <Crown size={10} className="text-white fill-white" />
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
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <userRank.icon size={12} style={{ color: userRank.color }} />
                      <span 
                        className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                        style={{ color: userRank.color }}
                      >
                        {userRank.title}
                      </span>
                    </div>
                    
                    {/* Badge de Assinatura */}
                    {(profile?.subscription_tier === 'pro' || trialDaysLeft > 0) && (
                      <span className="text-[8px] font-black bg-amber-500 text-dark px-1.5 py-0.5 rounded-md shadow-lg shadow-amber-500/20 animate-pulse">
                        {trialDaysLeft > 0 && !profile?.subscription_tier ? 'TRIAL' : 'PRO'}
                      </span>
                    )}
                    {profile?.subscription_tier === 'partner' && (
                      <span className="text-[8px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded-md shadow-lg shadow-purple-500/20 animate-pulse">PARCEIRO</span>
                    )}
                    {(!profile?.subscription_tier && trialDaysLeft <= 0) && (
                      <Link href="/profile?tab=billing" className="text-[8px] font-black text-accent hover:underline uppercase tracking-tighter">Virar Pro</Link>
                    )}
                  </div>

                  <p className="font-bold text-white text-sm truncate leading-tight">
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
            {/* Trial Counter */}
            {trialDaysLeft > 0 && (
              <div className={`px-2 mb-2 transition-all ${expanded ? 'block' : 'hidden'}`}>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-2 flex items-center justify-between">
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Trial Premium</span>
                  <span className="text-[10px] font-bold text-white whitespace-nowrap">{trialDaysLeft} dias restando</span>
                </div>
              </div>
            )}
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

          {/* Área Comercial / Pesqueiros */}
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
               <LoginButton isExpanded={expanded} />
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
