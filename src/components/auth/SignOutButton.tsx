'use client'

import { signOut } from '@/lib/supabase/auth'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

interface SignOutButtonProps {
  isExpanded: boolean
}

export default function SignOutButton({ isExpanded }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      await signOut()
      window.location.reload()
    } catch (error) {
      console.error('Erro ao sair:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="sidebar-item w-full text-left border-none bg-transparent"
      aria-label="Sair do aplicativo"
      title={!isExpanded ? 'Sair' : undefined}
    >
      <LogOut size={18} color="var(--color-accent-danger)" style={{ flexShrink: 0 }} aria-hidden="true" />
      {isExpanded && (
        <span className="fade-in" style={{ fontSize: 14, color: 'var(--color-accent-danger)' }}>
          {isLoading ? 'Saindo...' : 'Sair'}
        </span>
      )}
    </button>
  )
}
