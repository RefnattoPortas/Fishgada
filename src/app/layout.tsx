import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import InstallBanner from '@/components/pwa/InstallBanner'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Fishgada — Mapa de Pesca Esportiva',
  description: 'Descubra os melhores pontos de pesca, compartilhe suas capturas e aprenda com a comunidade de pescadores esportivos.',
  keywords: 'pesca esportiva, pontos de pesca, captura, isca, setup de pesca, comunidade pescadores',
  appleWebApp: {
    capable: true,
    title: 'Fishgada',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Fishgada',
    description: 'A plataforma da comunidade de pesca esportiva',
    type: 'website',
  },
  icons: {
    icon: '/images/iconapp.png',
    apple: '/images/iconapp.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        {children}
        <InstallBanner />
      </body>
    </html>
  )
}
