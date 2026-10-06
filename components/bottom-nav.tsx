'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House,
  LayoutGrid,
  ShoppingBag,
} from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/utils'

const items = [
  {
    href: '/',
    label: 'Главная',
    icon: House,
    match: (p: string) => p === '/',
  },
  {
    href: '/catalog',
    label: 'Каталог',
    icon: LayoutGrid,
    match: (p: string) =>
      p.startsWith('/catalog') ||
      p.startsWith('/category') ||
      p.startsWith('/product'),
  },
  {
    href: '/cart',
    label: 'Корзина',
    icon: ShoppingBag,
    match: (p: string) => p === '/cart',
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { count } = useCart()

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-md pb-safe"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-4 pb-2 pt-2">
        {items.map(
          ({
            href,
            label,
            icon: Icon,
            match,
          }) => {
            const active = match(pathname)

            return (
              <li
                key={href}
                className="flex-1"
              >
                <Link
                  href={href}
                  onClick={() =>
                    haptic('soft')
                  }
                  aria-current={
                    active
                      ? 'page'
                      : undefined
                  }
                  className="group flex flex-col items-center gap-1 py-1"
                >
                  <span
                    className={cn(
                      'relative flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                      active
                        ? 'bg-secondary'
                        : 'group-active:bg-muted'
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-5',
                        active
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      )}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />

                    {href === '/cart' &&
                      count > 0 && (
                        <span className="absolute -top-1 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                          {count}

                          <span className="sr-only">
                            {' '}
                            товаров в корзине
                          </span>
                        </span>
                      )}
                  </span>

                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      active
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            )
          }
        )}
      </ul>
    </nav>
  )
}
