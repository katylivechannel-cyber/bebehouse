'use client'

import Link from 'next/link'
import { Check, Minus, Plus } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { formatPrice } from '@/lib/format'
import { haptic, hapticSuccess } from '@/lib/telegram'

export function AddToCartBar({
  productId,
  price,
  availableQuantity,
}: {
  productId: string
  price: number
  availableQuantity: number
}) {
  const { quantityOf, add, setQuantity } = useCart()
  const quantity = quantityOf(productId)

  // Товара пока нет — ничего купить нельзя
  if (availableQuantity <= 0) {
    return (
      <div className="fixed inset-x-0 bottom-nav z-30 px-4 pb-3">
        <div className="mx-auto max-w-md">
          <div className="flex h-15 w-full items-center justify-center rounded-full bg-muted text-base font-semibold text-muted-foreground">
            Пока нет в наличии
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-nav z-30 px-4 pb-3">
      <div className="mx-auto max-w-md">
        {quantity === 0 ? (
          <button
            type="button"
            onClick={() => {
              add(productId)
              hapticSuccess()
            }}
            className="flex h-15 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_rgba(62,44,34,0.55)] transition active:scale-[0.98]"
          >
            Добавить в корзину
          </button>
        ) : (
          <div className="flex h-15 items-center gap-2 rounded-full bg-card p-1.5 shadow-[0_10px_30px_-12px_rgba(62,44,34,0.35)] ring-1 ring-border">
            <div className="flex h-full items-center rounded-full bg-muted">
              <button
                type="button"
                onClick={() => {
                  setQuantity(productId, quantity - 1)
                  haptic()
                }}
                aria-label="Уменьшить количество"
                className="flex size-12 items-center justify-center rounded-full active:bg-border"
              >
                <Minus
                  className="size-4"
                  aria-hidden="true"
                />
              </button>

              <span
                className="w-6 text-center text-base font-semibold tabular-nums"
                aria-live="polite"
              >
                {quantity}
              </span>

              <button
                type="button"
                disabled={quantity >= availableQuantity}
                onClick={() => {
                  if (quantity < availableQuantity) {
                    add(productId)
                    haptic()
                  }
                }}
                aria-label="Увеличить количество"
                className="flex size-12 items-center justify-center rounded-full active:bg-border disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus
                  className="size-4"
                  aria-hidden="true"
                />
              </button>
            </div>

            <Link
              href="/cart"
              className="flex h-full flex-1 items-center justify-center gap-2 rounded-full bg-secondary text-sm font-semibold text-secondary-foreground active:opacity-90"
            >
              <Check
                className="size-4"
                aria-hidden="true"
              />
              {'В корзине · '}
              {formatPrice(price * quantity)}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
