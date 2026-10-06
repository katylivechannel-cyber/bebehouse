'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { CatalogDrawer } from '@/components/catalog-drawer'
import { haptic } from '@/lib/telegram'

export function HomeMenuButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Открыть каталог"
        aria-expanded={open}
        onClick={() => {
          setOpen(true)
          haptic('soft')
        }}
        className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-muted"
      >
        <Menu
          className="size-7"
          strokeWidth={1.6}
        />
      </button>

      <CatalogDrawer
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
