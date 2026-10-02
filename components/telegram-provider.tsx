'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getTelegram } from '@/lib/telegram'

const ROOT_PATHS = ['/', '/catalog', '/cart']
const SURFACE_COLOR = '#F7F1E6'

export function TelegramProvider() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const webApp = getTelegram()
    if (!webApp) return
    document.documentElement.dataset.tg = 'true'
    webApp.ready()
    webApp.expand()
    webApp.setHeaderColor?.(SURFACE_COLOR)
    webApp.setBackgroundColor?.(SURFACE_COLOR)
    webApp.setBottomBarColor?.(SURFACE_COLOR)
    if (webApp.isVersionAtLeast?.('7.7')) webApp.disableVerticalSwipes?.()
  }, [])

  useEffect(() => {
    const webApp = getTelegram()
    if (!webApp) return
    const goBack = () => router.back()
    if (ROOT_PATHS.includes(pathname)) {
      webApp.BackButton.hide()
      return
    }
    webApp.BackButton.show()
    webApp.BackButton.onClick(goBack)
    return () => webApp.BackButton.offClick(goBack)
  }, [pathname, router])

  return null
}
