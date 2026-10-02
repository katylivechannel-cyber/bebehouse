type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
type NotificationType = 'error' | 'success' | 'warning'

export type TelegramWebApp = {
  initData: string
  version: string
  ready: () => void
  expand: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  setBottomBarColor?: (color: string) => void
  disableVerticalSwipes?: () => void
  isVersionAtLeast?: (version: string) => boolean
  showAlert?: (message: string, callback?: () => void) => void
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  HapticFeedback?: {
    impactOccurred: (style: HapticStyle) => void
    notificationOccurred: (type: NotificationType) => void
    selectionChanged: () => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function getTelegram(): TelegramWebApp | undefined {
  if (typeof window === 'undefined') return undefined
  const webApp = window.Telegram?.WebApp
  return webApp?.initData ? webApp : undefined
}

export function haptic(style: HapticStyle = 'light') {
  getTelegram()?.HapticFeedback?.impactOccurred(style)
}

export function hapticSuccess() {
  getTelegram()?.HapticFeedback?.notificationOccurred('success')
}
