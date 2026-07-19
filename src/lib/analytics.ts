'use client'

export type AnalyticsEvent =
  | 'map_viewed'
  | 'species_searched'
  | 'filter_applied'
  | 'marker_opened'
  | 'place_details_opened'
  | 'route_requested'
  | 'place_saved'
  | 'capture_started_from_map'
  | 'capture_created'
  | 'place_added'
  | 'onboarding_completed'
  | 'onboarding_dismissed'

interface EventProperties {
  place_type?: string
  species?: string
  filter_count?: number
  source?: string
  location_granted?: boolean
  [key: string]: string | number | boolean | undefined
}

export function trackEvent(event: AnalyticsEvent, properties?: EventProperties) {
  if (typeof window === 'undefined') return

  try {
    if (typeof (window as any).gtag !== 'undefined') {
      ;(window as any).gtag('event', event, properties)
    }

    if (typeof (window as any).fbq !== 'undefined') {
      ;(window as any).fbq('trackCustom', event, properties)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${event}`, properties)
    }
  } catch {
    // Silently fail
  }
}

export function trackPageView(path: string) {
  if (typeof window === 'undefined') return
  try {
    if (typeof (window as any).gtag !== 'undefined') {
      ;(window as any).gtag('config', 'G-XXXXXXXXXX', { page_path: path })
    }
  } catch {
    // Silently fail
  }
}
