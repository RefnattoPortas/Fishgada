import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Validar redirect — apenas caminhos relativos são permitidos
  let next = searchParams.get('next') ?? '/'
  if (next.startsWith('http') || next.startsWith('//')) {
    next = '/'
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    let authError = error?.message

    if (!error && data?.user) {
      const user = data.user
      // Sincronizar dados do Google com a tabela pública profiles
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: user.user_metadata.full_name || user.user_metadata.name || 'Pescador',
          avatar_url: user.user_metadata.avatar_url,
          username: user.user_metadata.username || user.email?.split('@')[0] || `user_${user.id.substring(0, 5)}`,
          updated_at: new Error().stack?.includes('upsert') ? new Date().toISOString() : undefined // truque simples para forçar update se necessário
        })
        .select()

      return NextResponse.redirect(`${origin}${next}`)
    } else if (!authError) {
      authError = 'No user session returned after exchanging code'
    }

    // return the user to an error page with instructions and details
    return NextResponse.redirect(`${origin}/auth/auth-code-error?details=${encodeURIComponent(authError || 'unknown_error')}`)
  }

  // Falha inicial: sem código e etc
  return NextResponse.redirect(`${origin}/auth/auth-code-error?details=no_auth_code_provided`)
}
