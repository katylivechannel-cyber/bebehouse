'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { formatPrice } from '@/lib/format'

export default function CheckoutPage() {
  const { count, total } = useCart()

  return (
    <main className="flex flex-col gap-6 pb-8">
      <div className="flex items-center gap-3">
        <Link
          href="/cart"
          className="flex size-10 items-center justify-center rounded-full bg-card"
        >
          <ChevronLeft className="size-5" />
        </Link>

        <h1 className="font-serif text-2xl font-semibold">
          Оформление заказа
        </h1>
      </div>

      <section className="rounded-3xl bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Товаров: {count}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="font-serif text-xl font-semibold">Итого</span>
          <span className="text-xl font-semibold">
            {formatPrice(total)}
          </span>
        </div>
      </section>
    </main>
  )
}
