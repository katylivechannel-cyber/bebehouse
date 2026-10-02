'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { formatPrice } from '@/lib/format'

export default function CheckoutPage() {
  const { count, total } = useCart()
  const [fullName, setFullName] = useState('')
 const [phone, setPhone] = useState('+7')
const [cdekPoint, setCdekPoint] = useState('')

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
     
<section className="flex flex-col gap-4 rounded-3xl bg-card p-5">
  <div className="flex flex-col gap-2">
    <label htmlFor="fullName" className="text-sm font-medium">
      ФИО
    </label>

    <input
      id="fullName"
      type="text"
      value={fullName}
      onChange={(e) => setFullName(e.target.value)}
      placeholder="Иванова Анна Сергеевна"
      className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
    />
  </div>
  <div className="flex flex-col gap-2">
  <label htmlFor="phone" className="text-sm font-medium">
    Номер телефона
  </label>

  <input
    id="phone"
    type="tel"
    inputMode="numeric"
    value={phone}
    onChange={(e) => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
  let number = digits.startsWith('7') ? digits.slice(1) : digits

  number = number.slice(0, 10)

  let formatted = '+7'
  if (number.length > 0) formatted += ' ' + number.slice(0, 3)
  if (number.length > 3) formatted += ' ' + number.slice(3, 6)
  if (number.length > 6) formatted += '-' + number.slice(6, 8)
  if (number.length > 8) formatted += '-' + number.slice(8, 10)

  setPhone(formatted)
}}
    placeholder="+7 999 123-45-67"
    className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
  />
    <div className="flex flex-col gap-2">
  <label htmlFor="cdekPoint" className="text-sm font-medium">
    Адрес ПВЗ СДЭК
  </label>

  <input
    id="cdekPoint"
    type="text"
    value={cdekPoint}
    onChange={(e) => setCdekPoint(e.target.value)}
    placeholder="Например: Санкт-Петербург, ул. ..."
    className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
  />
</div>
</div>
</section>
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
