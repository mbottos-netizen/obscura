import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OBSCURA — Moving images & interactive worlds',
  description:
    'OBSCURA is an independent studio making films, interfaces and worlds. Scroll to travel through a continuous 3D experience.',
  openGraph: {
    title: 'OBSCURA',
    description: 'Moving images & interactive worlds.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#07070a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/archivo-var.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/typefaces/archivo-black.json" as="fetch" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  )
}
