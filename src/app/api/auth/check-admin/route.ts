import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimitMiddleware, getClientIp } from '@/lib/utils/rate-limiter'

export async function GET(req: Request) {
  const rateLimitResponse = rateLimitMiddleware(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado', isAdmin: false },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    const profileData = profile as { is_admin?: boolean } | null

    if (profileError || !profileData) {
      return NextResponse.json(
        { error: 'Perfil não encontrado', isAdmin: false },
        { status: 403 }
      )
    }

    if (!profileData.is_admin) {
      return NextResponse.json(
        { error: 'Acesso negado — permissão de administrador necessária', isAdmin: false },
        { status: 403 }
      )
    }

    return NextResponse.json({ isAdmin: true, userId: user.id })
  } catch (err: any) {
    console.error('Erro ao verificar admin:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor', isAdmin: false },
      { status: 500 }
    )
  }
}
