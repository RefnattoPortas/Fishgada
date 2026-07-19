import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/utils/rate-limiter'

export async function GET(req: Request) {
  const rateLimitResponse = rateLimitMiddleware(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado', isPartner: false },
        { status: 401 }
      )
    }

    // Verifica se o usuário é dono de pelo menos um pesqueiro
    const { data: resorts, error: resortsError } = await supabase
      .from('fishing_resorts')
      .select('id, spot_id')
      .eq('owner_id', user.id)

    if (resortsError) {
      return NextResponse.json(
        { error: 'Erro ao verificar permissões', isPartner: false },
        { status: 500 }
      )
    }

    const resortsData = (resorts as { id: string; spot_id?: string }[]) || []

    if (resortsData.length === 0) {
      return NextResponse.json(
        { error: 'Acesso negado — nenhum pesqueiro encontrado para este usuário', isPartner: false },
        { status: 403 }
      )
    }

    return NextResponse.json({
      isPartner: true,
      userId: user.id,
      resortIds: resortsData.map(r => r.id),
    })
  } catch (err: any) {
    console.error('Erro ao verificar parceiro:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor', isPartner: false },
      { status: 500 }
    )
  }
}
