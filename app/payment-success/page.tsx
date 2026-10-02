'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF8] flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F4E9A6]">
          <Check
            className="h-10 w-10 text-[#411D0A]"
            strokeWidth={2}
          />
        </div>

        <h1 className="mb-3 font-serif text-3xl text-[#411D0A]">
          Спасибо за заказ! 🤍
        </h1>

        <p className="mb-8 leading-relaxed text-[#6F5A4D]">
          Оплата прошла успешно.
          <br />
          <br />
          Мы передадим ваш заказ в СДЭК в течение 1–2 дней.
          Как только посылка будет отправлена, трек-номер придёт на вашу электронную почту.
        </p>

        <Link
          href="/"
          className="block w-full rounded-full bg-[#411D0A] px-6 py-4 font-medium text-white"
        >
          Вернуться на главную
        </Link>
      </div>
    </main>
  )
}
