'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useCart } from '@/components/cart-provider'

export default function PaymentSuccessPage() {
  const { clear } = useCart()
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'paid' | 'failed'>('checking')
  useEffect(() => {
  const checkPayment = async () => {
    const operationId = localStorage.getItem('tochkaOperationId')

    if (!operationId) {
      setPaymentStatus('failed')
      return
    }

    try {
      const response = await fetch('/api/payment-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operationId }),
      })

      const data = await response.json()

      if (data.paid) {
  clear()

  const orderSent = localStorage.getItem('bebehouseOrderSent')

if (orderSent === operationId) {
  setPaymentStatus('paid')
  return
}
      const savedOrder = localStorage.getItem('bebehouseOrder')

if (savedOrder) {
  const order = JSON.parse(savedOrder)

  const orderResponse = await fetch('/api/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  })
  if (orderResponse.ok) {
  localStorage.setItem('bebehouseOrderSent', operationId)
}
  const emailSent = localStorage.getItem('bebehouseEmailSent')

if (emailSent !== operationId && order.email) {
  const emailResponse = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: order.email,
      fullName: order.fullName,
    }),
  })

  if (emailResponse.ok) {
    localStorage.setItem('bebehouseEmailSent', operationId)
  }
}
}
        setPaymentStatus('paid')
      } else {
        setPaymentStatus('failed')
      }
    } catch {
      setPaymentStatus('failed')
    }
  }

  checkPayment()
}, [])
  if (paymentStatus === 'checking') {
  return (
    <main className="min-h-screen bg-[#FFFDF8] flex items-center justify-center px-6">
      <p className="text-[#6F5A4D]">
        Проверяем оплату...
      </p>
    </main>
  )
}
  if (paymentStatus === 'failed') {
  return (
    <main className="min-h-screen bg-[#FFFDF8] flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-3 font-serif text-3xl text-[#411D0A]">
          Оплата не подтверждена
        </h1>

        <p className="mb-8 text-[#6F5A4D]">
          Пожалуйста, вернитесь в корзину и попробуйте ещё раз.
        </p>

        <Link
          href="/checkout"
          className="block w-full rounded-full bg-[#411D0A] px-6 py-4 font-medium text-white"
        >
          Вернуться к оплате
        </Link>
      </div>
    </main>
  )
}
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
