'use client'

import Link from 'next/link'
import { LogIn } from 'lucide-react'

interface LoginButtonProps {
  isExpanded: boolean
}

export default function LoginButton({ isExpanded }: LoginButtonProps) {
  return (
    <Link
      href="/login"
      className="sidebar-item"
      aria-label="Fazer login ou cadastrar"
      title={!isExpanded ? 'Entrar' : undefined}
    >
      <LogIn size={20} style={{ flexShrink: 0, color: 'var(--color-accent-primary)' }} aria-hidden="true" />
      {isExpanded && (
        <span className="fade-in" style={{ fontSize: 14 }}>
          Entrar / Cadastro
        </span>
      )}
    </Link>
  )
}
