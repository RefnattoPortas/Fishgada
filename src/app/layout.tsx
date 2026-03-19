import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fish-Map — Mapa de Pesca Esportiva',
  description: 'Descubra os melhores pontos de pesca, compartilhe suas capturas e aprenda com a comunidade de pescadores esportivos.',
  keywords: 'pesca esportiva, pontos de pesca, captura, isca, setup de pesca, comunidade pescadores',
  openGraph: {
    title: 'Fish-Map',
    description: 'A plataforma da comunidade de pesca esportiva',
    type: 'website',
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
      </body>
    </html>
  )
}
