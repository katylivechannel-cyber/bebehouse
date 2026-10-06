'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House,
  LayoutGrid,
  ShoppingBag,
} from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { CatalogDrawer } from '@/components/catalog-drawer'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()
  const { count } = useCart()
  const [catalogOpen, setCatalogOpen] =
    useState(false)

  const catalogActive =
    catalogOpen ||
    pathname.startsWith('/catalog') ||
    pathname.startsWith('/category') ||
    pathname.startsWith('/product')

  return (
    <>
      <CatalogDrawer
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
      />

      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-md pb-safe"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-4 pb-2 pt-2">
          <li className="flex-1">
            <Link
              href="/"
              onClick={() => haptic('soft')}
              aria-current={
                pathname === '/'
                  ? 'page'
                  : undefined
              }
              className="group flex flex-col items-center gap-1 py-1"
            >
              <span
                className={cn(
                  'relative flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                  pathname === '/'
                    ? 'bg-secondary'
                    : 'group-active:bg-muted'
                )}
              >
                <House
                  className={cn(
                    'size-5',
                    pathname === '/'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                  strokeWidth={1.75}
                />
              </span>

              <span
                className={cn(
                  'text-[11px] font-medium',
                  pathname === '/'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                Главная
              </span>
            </Link>
          </li>

          <li className="flex-1">
            <button
              type="button"
              onClick={() => {
                setCatalogOpen(true)
                haptic('soft')
              }}
              aria-expanded={catalogOpen}
              className="group flex w-full flex-col items-center gap-1 py-1"
            >
              <span
                className={cn(
                  'relative flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                  catalogActive
                    ? 'bg-secondary'
                    : 'group-active:bg-muted'
                )}
              >
                <LayoutGrid
                  className={cn(
                    'size-5',
                    catalogActive
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                  strokeWidth={1.75}
                />
              </span>

              <span
                className={cn(
                  'text-[11px] font-medium',
                  catalogActive
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                Каталог
              </span>
            </button>
          </li>

          <li className="flex-1">
            <Link
              href="/cart"
              onClick={() => haptic('soft')}
              aria-current={
                pathname === '/cart'
                  ? 'page'
                  : undefined
              }
              className="group flex flex-col items-center gap-1 py-1"
            >
              <span
                className={cn(
                  'relative flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                  pathname === '/cart'
                    ? 'bg-secondary'
                    : 'group-active:bg-muted'
                )}
              >
                <ShoppingBag
                  className={cn(
                    'size-5',
                    pathname === '/cart'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                  strokeWidth={1.75}
                />

                {count > 0 && (
                  <span className="absolute -top-1 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {count}
                    <span className="sr-only">
                      {' '}товаров в корзине
                    </span>
                  </span>
                )}
              </span>

              <span
                className={cn(
                  'text-[11px] font-medium',
                  pathname === '/cart'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                Корзина
              </span>
            </Link>
          </li>
        </ul>
      </nav>
    </>
  )
}
