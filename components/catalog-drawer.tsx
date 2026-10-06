'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, X } from 'lucide-react'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/utils'

type CatalogDrawerProps = {
  open: boolean
  onClose: () => void
}

const categories = [
  {
    name: 'Куклы',
    href: '/category/dolls',
  },
  {
    name: 'Ролевые игры',
    href: '/category/role-play',
  },
  {
    name: 'Музыкальные игрушки',
    href: '/category/musical',
  },
  {
    name: 'Творчество',
    href: '/category/creativity',
  },
  {
    name: 'Развивающие игрушки',
    href: '/category/educational',
  },
  {
    name: 'Для малышей',
    href: '/category/for-babies',
  },
  {
    name: 'Аксессуары',
    href: '/category/accessories',
  },
]

const brands = [
  {
    name: 'Little Dutch',
    href: '/catalog?brand=little-dutch',
  },
  {
    name: 'Konges Sløjd',
    href: '/catalog?brand=konges-slojd',
  },
  {
    name: 'Élhée',
    href: '/catalog?brand=elhee',
  },
]

export function CatalogDrawer({
  open,
  onClose,
}: CatalogDrawerProps) {
  const [brandsOpen, setBrandsOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null

  function closeDrawer() {
    haptic('soft')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Закрыть каталог"
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
      />

      <aside
        aria-label="Каталог"
        className="absolute inset-y-0 left-0 flex w-[88%] max-w-[390px] flex-col bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 pb-3 pt-5">
          <p className="font-serif text-[26px] font-semibold">
            Каталог
          </p>

          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Закрыть"
            className="flex size-9 items-center justify-center rounded-full active:bg-muted"
          >
            <X
              className="size-5"
              strokeWidth={1.6}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-3">
          <nav className="flex flex-col items-start">
            <Link
              href="/catalog?collection=new"
              onClick={closeDrawer}
              className="w-full py-2 text-left text-[15px] font-medium text-[#B99B6B]"
            >
              Новинки
            </Link>

            <Link
              href="/catalog?collection=bestseller"
              onClick={closeDrawer}
              className="w-full py-2 text-left text-[15px] font-medium text-[#B99B6B]"
            >
              Бестселлеры
            </Link>

            <div className="my-2 h-px w-full bg-border/50" />

            {categories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                onClick={closeDrawer}
                className="w-full py-2 text-left text-[15px] text-foreground"
              >
                {category.name}
              </Link>
            ))}

            <div className="my-2 h-px w-full bg-border/50" />

            <button
              type="button"
              onClick={() => {
                setBrandsOpen((current) => !current)
                haptic('soft')
              }}
              className="flex w-full items-center justify-between py-2 text-left text-[15px] font-medium"
            >
              <span>БРЕНДЫ</span>

              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform duration-200',
                  brandsOpen && 'rotate-180'
                )}
                strokeWidth={1.6}
              />
            </button>

            <div
              className={cn(
                'grid w-full transition-all duration-300',
                brandsOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col border-l border-border/70 pl-4">
                  {brands.map((brand) => (
                    <Link
                      key={brand.href}
                      href={brand.href}
                      onClick={closeDrawer}
                      className="py-2 text-left text-[15px] text-foreground/80"
                    >
                      {brand.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </div>
  )
}
