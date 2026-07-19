import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas administrativas que exigem autorização extra
const ADMIN_ROUTES = ['/admin', '/resort-admin']

// Origens permitidas para redirect pós-login
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_VERCEL_URL,
  'http://localhost:3000',
  'https://fishgada.vercel.app',
].filter(Boolean)

function isAllowedRedirect(url: string): boolean {
  if (!url || url.startsWith('/')) return true
  try {
    const parsed = new URL(url)
    return ALLOWED_ORIGINS.some(origin => {
      if (!origin) return false
      const originUrl = new URL(origin.startsWith('http') ? origin : `https://${origin}`)
      return parsed.hostname === originUrl.hostname
    })
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
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
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── 1. Proteção de Rotas de Autenticação ──
  const authProtectedRoutes = ['/profile', '/settings', '/captures', '/radar', '/ranking', '/explore']
  const isAuthProtectedRoute = authProtectedRoutes.some(path => request.nextUrl.pathname.startsWith(path))

  if (!user && isAuthProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── 2. Proteção de Rotas Administrativas ──
  const isAdminRoute = ADMIN_ROUTES.some(path => request.nextUrl.pathname.startsWith(path))
  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── 3. Proteção de Rotas PRO ──
  if (user) {
    const proRoutes = ['/explore', '/ranking']
    const isProRoute = proRoutes.some(path => request.nextUrl.pathname.startsWith(path))

    if (isProRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, trial_ends_at')
        .eq('id', user.id)
        .single()

      const isPro = profile?.plan_type === 'pro' || 
                   profile?.plan_type === 'partner' ||
                   (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date())

      if (!isPro) {
        return NextResponse.redirect(new URL('/upgrade', request.url))
      }
    }
  }

  // ── 4. Validar redirects externos ──
  const redirectParam = request.nextUrl.searchParams.get('redirect')
  if (redirectParam && !isAllowedRedirect(redirectParam)) {
    const url = request.nextUrl.clone()
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  // ── 5. Security Headers ──
  // CSP ativa configurada via next.config.ts (política consolidada).
  // Este middleware mantém apenas headers que next.config.ts não cobre dinamicamente.
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  )

  // Cache-Control para rotas protegidas
  if (isAdminRoute || isAuthProtectedRoute) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate')
  } else {
    // Páginas públicas mantêm cache eficiente
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
