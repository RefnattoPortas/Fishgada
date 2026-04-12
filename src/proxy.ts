import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Proteção de Rotas de Autenticação
  const authProtectedRoutes = ['/profile', '/settings', '/captures', '/radar', '/ranking', '/explore']
  const isAuthProtectedRoute = authProtectedRoutes.some(path => request.nextUrl.pathname.startsWith(path))

  if (!user && isAuthProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Proteção de Rotas PRO (Paywall)
  if (user) {
    const proRoutes = ['/explore', '/ranking']
    const isProRoute = proRoutes.some(path => request.nextUrl.pathname.startsWith(path))

    if (isProRoute) {
      // Buscar status PRO no perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, trial_ends_at')
        .eq('id', user.id)
        .single()

      const isPro = profile?.plan_type === 'pro' || 
                   profile?.plan_type === 'partner' ||
                   (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date())

      if (!isPro) {
        // Redirecionar para Landing Page de upgrade com resumo dos benefícios
        return NextResponse.redirect(new URL('/upgrade', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
