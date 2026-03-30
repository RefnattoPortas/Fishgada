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
      title="Entrar ou Cadastrar"
    >
      <LogIn size={20} style={{ flexShrink: 0, color: 'var(--color-accent-primary)' }} />
      {isExpanded && (
        <span className="fade-in" style={{ fontSize: 14 }}>
          Entrar / Cadastro
        </span>
      )}
    </Link>
  )
}
