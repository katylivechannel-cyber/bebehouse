'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Mail, PackageCheck } from 'lucide-react'
import { useCart } from '@/components/cart-provider'

export default function PaymentSuccessPage() {
  const { clear } = useCart()

  const [paymentStatus, setPaymentStatus] = useState<
    'checking' | 'paid' | 'failed'
  >('checking')

  useEffect(() => {
    const completeOrder = async () => {
      const operationId = localStorage.getItem(
        'tochkaOperationId'
      )

      if (!operationId) {
        setPaymentStatus('failed')
        return
      }

      try {
        const response = await fetch(
          '/api/complete-order',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operationId,
            }),
          }
        )

        const data = await response.json()

        if (response.ok && data.paid) {
          localStorage.removeItem(
            'bebehouse-cart'
          )
          localStorage.removeItem(
            'bebehouseOrder'
          )
          localStorage.removeItem(
            'bebehouseOrderSent'
          )
          localStorage.removeItem(
            'bebehouseEmailSent'
          )

          clear()
          setPaymentStatus('paid')
        } else {
          setPaymentStatus('failed')
        }
      } catch {
        setPaymentStatus('failed')
      }
    }

    completeOrder()
  }, [clear])

  if (paymentStatus === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFDF8] px-6">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-[#E9E0D8] border-t-[#411D0A]" />

          <p className="text-[#6F5A4D]">
            Проверяем оплату...
          </p>
        </div>
      </main>
    )
  }

  if (paymentStatus === 'failed') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFDF8] px-6 py-10">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-3 font-serif text-3xl text-[#411D0A]">
            Оплата не подтверждена
          </h1>

          <p className="mb-8 leading-relaxed text-[#6F5A4D]">
            Мы пока не получили подтверждение
            оплаты. Вернитесь к оформлению заказа
            и попробуйте ещё раз.
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
    <main className="flex min-h-screen items-center justify-center bg-[#FFFDF8] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F4E9A6]">
            <Check
              className="h-10 w-10 text-[#411D0A]"
              strokeWidth={2}
            />
          </div>

          <h1 className="mb-3 font-serif text-3xl text-[#411D0A]">
            Спасибо за заказ! 🤍
          </h1>

          <p className="mx-auto max-w-sm leading-relaxed text-[#6F5A4D]">
            Оплата прошла успешно. Мы уже
            получили ваш заказ и скоро начнём
            его собирать.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[24px] border border-[#EEE5DD] bg-white">
          <div className="flex gap-4 border-b border-[#EEE5DD] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F8F3EE]">
              <Mail
                className="h-5 w-5 text-[#411D0A]"
                strokeWidth={1.8}
              />
            </div>

            <div>
              <div className="font-medium text-[#411D0A]">
                Подтверждение на почте
              </div>

              <p className="mt-1 text-sm leading-relaxed text-[#7A6A61]">
                Мы отправили письмо с информацией
                о вашем заказе на указанную
                электронную почту.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F8F3EE]">
              <PackageCheck
                className="h-5 w-5 text-[#411D0A]"
                strokeWidth={1.8}
              />
            </div>

            <div>
              <div className="font-medium text-[#411D0A]">
                Сообщим об отправке
              </div>

              <p className="mt-1 text-sm leading-relaxed text-[#7A6A61]">
                Когда мы передадим посылку в
                службу доставки, вам придёт ещё
                одно письмо с информацией для
                отслеживания.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 block w-full rounded-full bg-[#411D0A] px-6 py-4 text-center font-medium text-white"
        >
          Вернуться на главную
        </Link>

        <p className="mt-5 text-center text-xs leading-relaxed text-[#9A8980]">
          Спасибо, что выбираете bébéhouse 🤍
        </p>
      </div>
    </main>
  )
}
