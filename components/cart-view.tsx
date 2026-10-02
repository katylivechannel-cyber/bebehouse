'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { formatPrice, productsLabel } from '@/lib/format'
import { haptic } from '@/lib/telegram'

export function CartView() {
const { lines, count, total, add, setQuantity, remove } = useCart()

  

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-7" strokeWidth={1.5} aria-hidden="true" />}
        title="Корзина пока пуста"
        text="Загляните в каталог — там много красивого для самых маленьких."
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-3">
        {lines.map(({ product, quantity }) => (
          <li key={product.id} className="flex gap-3 rounded-3xl border border-border/60 bg-card p-3">
            <Link
              href={`/product/${product.id}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-muted"
            >
              <Image
                src={product.image || '/placeholder.svg'}
                alt={product.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {product.brand}
                  </p>
                  <p className="line-clamp-2 text-sm leading-snug">{product.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    remove(product.id)
                    haptic()
                  }}
                  aria-label={`Удалить ${product.name}`}
                  className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center rounded-full bg-muted">
                  <button
                    type="button"
                    onClick={() => {
                      setQuantity(product.id, quantity - 1)
                      haptic()
                    }}
                    aria-label="Уменьшить количество"
                    className="flex size-8 items-center justify-center rounded-full active:bg-border"
                  >
                    <Minus className="size-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      add(product.id)
                      haptic()
                    }}
                    aria-label="Увеличить количество"
                    className="flex size-8 items-center justify-center rounded-full active:bg-border"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-[15px] font-semibold">{formatPrice(product.price * quantity)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section aria-label="Итог заказа" className="flex flex-col gap-3 rounded-3xl bg-accent/50 p-5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{productsLabel(count)}</span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Доставка</span>
          <span>Рассчитаем при оформлении</span>
        </div>
        <div className="my-1 h-px bg-foreground/10" />
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-xl font-semibold">Итого</span>
          <span className="text-xl font-semibold">{formatPrice(total)}</span>
        </div>
      </section>

    <Link
  href="/checkout"
  onClick={() => haptic()}
  className="flex h-15 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_rgba(62,44,34,0.55)] transition active:scale-[0.98]"
>
  Оформить заказ
</Link>
    </div>
  )
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-14 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-secondary">{icon}</span>
      <h2 className="mt-1 font-serif text-2xl font-semibold">{title}</h2>
      <p className="max-w-64 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <Link
        href="/catalog"
        className="mt-3 flex h-12 items-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
      >
        Перейти в каталог
      </Link>
    </div>
  )
}
