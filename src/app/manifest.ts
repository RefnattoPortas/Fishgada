import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fishgada',
    short_name: 'Fishgada',
    description: 'Pesca, Gastronomia e Gamificação.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#0F172A',
    icons: [
      {
        src: '/images/iconapp.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/iconapp.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/images/logo.png',
        sizes: 'any',
        type: 'image/png',
      }
    ],
  }
}
