'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { formatPrice } from '@/lib/format'

type CdekCity = {
  code: number
  city: string
  region?: string
  subRegion?: string
}

type CdekPoint = {
  code: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  workTime: string
  type: string
  haveCashless: boolean | null
  haveCash: boolean | null
}

export default function CheckoutPage() {
  const { lines, count, total } = useCart()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('+7')
  const [email, setEmail] = useState('')

  const [city, setCity] = useState('')
  const [cityCode, setCityCode] = useState<number | null>(null)
  const [cityStatus, setCityStatus] = useState<
    'idle' | 'checking' | 'found' | 'not-found'
  >('idle')

  const [points, setPoints] = useState<CdekPoint[]>([])
  const [cdekPoint, setCdekPoint] = useState('')
  const [cdekPointCode, setCdekPointCode] = useState('')
  const [pointSearch, setPointSearch] = useState('')
  const [isLoadingPoints, setIsLoadingPoints] = useState(false)
  const [isChoosingPoint, setIsChoosingPoint] = useState(false)

  useEffect(() => {
    const query = city.trim()

    if (query.length < 2) {
      setCityStatus('idle')
      setCityCode(null)
      return
    }

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        setCityStatus('checking')

        const response = await fetch(
          `/api/cdek/cities?city=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        )

        const data = await response.json()

        if (
          data.success &&
          Array.isArray(data.cities) &&
          data.cities.length > 0
        ) {
          const foundCity = data.cities[0] as CdekCity

          setCityCode(foundCity.code)
          setCityStatus('found')

          setPoints([])
          setCdekPoint('')
          setCdekPointCode('')
          setPointSearch('')
          setIsChoosingPoint(true)

          try {
            setIsLoadingPoints(true)

            const pointsResponse = await fetch(
              `/api/cdek/points?cityCode=${foundCity.code}`,
              {
                signal: controller.signal,
                cache: 'no-store',
              }
            )

            const pointsData = await pointsResponse.json()

            if (
              pointsData.success &&
              Array.isArray(pointsData.points)
            ) {
              setPoints(pointsData.points)
            } else {
              setPoints([])
            }
          } finally {
            if (!controller.signal.aborted) {
              setIsLoadingPoints(false)
            }
          }
        } else {
          setCityCode(null)
          setCityStatus('not-found')

          setPoints([])
          setCdekPoint('')
          setCdekPointCode('')
          setPointSearch('')
          setIsChoosingPoint(false)
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AbortError'
        ) {
          return
        }

        setCityCode(null)
        setCityStatus('not-found')
        setPoints([])
        setCdekPoint('')
        setCdekPointCode('')
        setPointSearch('')
        setIsChoosingPoint(false)
        setIsLoadingPoints(false)
      }
    }, 900)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [city])

  const filteredPoints = points.filter((point) => {
    const query = pointSearch.trim().toLowerCase()

    if (!query) return true

    return (
      point.address.toLowerCase().includes(query) ||
      point.name.toLowerCase().includes(query) ||
      point.code.toLowerCase().includes(query)
    )
  })

  const isFormValid =
    fullName.trim().length > 0 &&
    phone.replace(/\D/g, '').length === 11 &&
    email.trim().length > 0 &&
    cityCode !== null &&
    cdekPointCode.trim().length > 0 &&
    lines.length > 0

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
            autoComplete="name"
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
              const digits = e.target.value
                .replace(/\D/g, '')
                .slice(0, 11)

              let number = digits.startsWith('7')
                ? digits.slice(1)
                : digits

              number = number.slice(0, 10)

              let formatted = '+7'

              if (number.length > 0) {
                formatted += ' ' + number.slice(0, 3)
              }

              if (number.length > 3) {
                formatted += ' ' + number.slice(3, 6)
              }

              if (number.length > 6) {
                formatted += '-' + number.slice(6, 8)
              }

              if (number.length > 8) {
                formatted += '-' + number.slice(8, 10)
              }

              setPhone(formatted)
            }}
            placeholder="+7 999 123-45-67"
            autoComplete="tel"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Электронная почта
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.ru"
            autoComplete="email"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="city" className="text-sm font-medium">
            Город
          </label>

          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value)
              setCityCode(null)
              setCityStatus('idle')

              setPoints([])
              setCdekPoint('')
              setCdekPointCode('')
              setPointSearch('')
              setIsChoosingPoint(false)
            }}
            placeholder="Например: Екатеринбург"
            autoComplete="address-level2"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
          />

          {cityStatus === 'checking' && (
            <p className="px-1 text-xs text-muted-foreground">
              Проверяем город...
            </p>
          )}

          {cityStatus === 'found' && (
            <p className="px-1 text-xs font-medium">
              ✓ Город найден
            </p>
          )}

          {cityStatus === 'not-found' && (
            <p className="px-1 text-xs text-muted-foreground">
              Не удалось найти город. Проверьте название.
            </p>
          )}
        </div>

        {cityCode !== null && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              ПВЗ СДЭК
            </label>

            {isLoadingPoints ? (
              <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                Загружаем пункты СДЭК...
              </div>
            ) : cdekPoint && !isChoosingPoint ? (
              <div className="rounded-2xl border border-primary bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  Выбранный ПВЗ
                </p>

                <p className="mt-1 text-sm font-medium">
                  {cdekPoint}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setIsChoosingPoint(true)
                    setPointSearch('')
                  }}
                  className="mt-3 text-sm font-medium underline underline-offset-4"
                >
                  Изменить ПВЗ
                </button>
              </div>
            ) : points.length > 0 ? (
              <>
                <input
                  id="pointSearch"
                  type="text"
                  value={pointSearch}
                  onChange={(e) => setPointSearch(e.target.value)}
                  placeholder="Введите улицу, например: Крауля"
                  autoComplete="off"
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
                />

                {pointSearch.trim().length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">
                    Начните вводить улицу или адрес ПВЗ
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-border bg-background">
                    {filteredPoints.length > 0 ? (
                      filteredPoints.map((point) => (
                        <button
                          key={point.code}
                          type="button"
                          onClick={() => {
                            setCdekPoint(point.address)
                            setCdekPointCode(point.code)
                            setPointSearch('')
                            setIsChoosingPoint(false)
                          }}
                          className="flex w-full flex-col border-b border-border px-4 py-3 text-left last:border-b-0"
                        >
                          <span className="text-sm font-medium">
                            {point.address}
                          </span>

                          {point.workTime && (
                            <span className="mt-1 text-xs text-muted-foreground">
                              {point.workTime}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground">
                        ПВЗ по этому адресу не найден
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                В этом городе не удалось найти ПВЗ СДЭК
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Товаров: {count}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="font-serif text-xl font-semibold">
            Итого
          </span>

          <span className="text-xl font-semibold">
            {formatPrice(total)}
          </span>
        </div>
      </section>

      <button
        type="button"
        disabled={!isFormValid}
        onClick={async () => {
          const response = await fetch('/api/payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fullName,
              phone,
              email,
              city,
              cityCode,
              cdekPoint,
              cdekPointCode,
              items: lines.map((line) => ({
                productId: line.product.id,
                quantity: line.quantity,
              })),
            }),
          })

          const data = await response.json()

          if (data.paymentLink) {
            localStorage.setItem(
              'tochkaOperationId',
              data.operationId
            )

            localStorage.setItem(
              'bebehouseOrder',
              JSON.stringify({
                fullName,
                phone,
                email,
                city,
                cityCode,
                cdekPoint,
                cdekPointCode,
                items: lines,
                total,
              })
            )

            const telegram = (window as any).Telegram?.WebApp

            if (telegram?.openLink) {
              telegram.openLink(data.paymentLink)
            } else {
              window.location.href = data.paymentLink
            }
          } else {
            alert(JSON.stringify(data, null, 2))
          }
        }}
        className="flex h-15 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        Перейти к оплате
      </button>
    </main>
  )
}
