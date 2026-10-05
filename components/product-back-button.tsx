'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export function ProductBackButton() {
  const router = useRouter()

  function handleBack() {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push('/')
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Назад"
      className="absolute left-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-background/80"
    >
      <ChevronLeft className="size-5" />
    </button>
  )
}
