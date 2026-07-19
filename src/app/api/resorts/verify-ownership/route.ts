import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/utils/rate-limiter'

export async function POST(req: Request) {
  const rateLimitResponse = rateLimitMiddleware(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado', owned: false },
        { status: 401 }
      )
    }

    const { resortId } = await req.json()

    if (!resortId || typeof resortId !== 'string') {
      return NextResponse.json(
        { error: 'ID do pesqueiro é obrigatório', owned: false },
        { status: 400 }
      )
    }

    // Verifica ownership: o resort pertence ao usuário autenticado
    const { data: resort, error: resortError } = await supabase
      .from('fishing_resorts')
      .select('id')
      .eq('id', resortId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (resortError) {
      return NextResponse.json(
        { error: 'Erro ao verificar propriedade', owned: false },
        { status: 500 }
      )
    }

    if (!resort) {
      return NextResponse.json(
        { error: 'Acesso negado — você não é proprietário deste pesqueiro', owned: false },
        { status: 403 }
      )
    }

    return NextResponse.json({ owned: true, resortId, userId: user.id })
  } catch (err: any) {
    console.error('Erro ao verificar ownership:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor', owned: false },
      { status: 500 }
    )
  }
}
