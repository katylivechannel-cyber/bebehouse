import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import Script from 'next/script'
import { BottomNav } from '@/components/bottom-nav'
import { CartProvider } from '@/components/cart-provider'
import { TelegramProvider } from '@/components/telegram-provider'
import { getCatalog } from '@/lib/catalog'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
})

export const metadata: Metadata = {
  title: 'bébéhouse — детские европейские бренды',
  description: 'Детские европейские бренды в одном месте: куклы, коляски, развивающие игрушки и многое другое.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: '#F7F1E6',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { products } = await getCatalog()
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${cormorant.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <CartProvider products={products}>
          <TelegramProvider />
          <div className="mx-auto min-h-dvh max-w-md px-4 pt-safe pb-nav">{children}</div>
          <BottomNav />
        </CartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
