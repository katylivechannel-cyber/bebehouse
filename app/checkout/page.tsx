'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { formatPrice } from '@/lib/format'

type DeliveryMethod = 'cdek' | 'yandex'

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

type YandexPoint = {
  id: string
  name: string
  address: string
  street: string
  house: string
  latitude: number | null
  longitude: number | null
  paymentMethods: string[]
}

type CdekDelivery = {
  price: number
  periodMin?: number
  periodMax?: number
}

type YandexDelivery = {
  yandexPrice: number
  customerPrice: number
  deliveryDays?: number | null
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

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>('cdek')

  /*
    СДЭК
  */
  const [cdekPoints, setCdekPoints] = useState<CdekPoint[]>([])
  const [cdekPoint, setCdekPoint] = useState('')
  const [cdekPointCode, setCdekPointCode] = useState('')
  const [cdekPointSearch, setCdekPointSearch] = useState('')
  const [isLoadingCdekPoints, setIsLoadingCdekPoints] =
    useState(false)
  const [isChoosingCdekPoint, setIsChoosingCdekPoint] =
    useState(false)

  const [cdekDelivery, setCdekDelivery] =
    useState<CdekDelivery | null>(null)

  const [cdekDeliveryCalculated, setCdekDeliveryCalculated] =
    useState<boolean | null>(null)

  const [isLoadingCdekDelivery, setIsLoadingCdekDelivery] =
    useState(false)

  /*
    ЯНДЕКС
  */
  const [yandexPoints, setYandexPoints] =
    useState<YandexPoint[]>([])

  const [yandexPoint, setYandexPoint] = useState('')
  const [yandexPointId, setYandexPointId] = useState('')
  const [yandexPointSearch, setYandexPointSearch] =
    useState('')

  const [isLoadingYandexPoints, setIsLoadingYandexPoints] =
    useState(false)

  const [isChoosingYandexPoint, setIsChoosingYandexPoint] =
    useState(false)

  const [yandexDelivery, setYandexDelivery] =
    useState<YandexDelivery | null>(null)

  const [isLoadingYandexDelivery, setIsLoadingYandexDelivery] =
    useState(false)

  const [yandexCityDelivery, setYandexCityDelivery] =
    useState<YandexDelivery | null>(null)

  const [isLoadingYandexCityDelivery, setIsLoadingYandexCityDelivery] =
    useState(false)

  /*
    ПОИСК ГОРОДА + ПВЗ
  */
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

        /*
          Сначала проверяем город через СДЭК.
          Нам всё равно нужен cityCode для расчёта СДЭК.
        */
        const cityResponse = await fetch(
          `/api/cdek/cities?city=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        )

        const cityData = await cityResponse.json()

        if (
          !cityData.success ||
          !Array.isArray(cityData.cities) ||
          cityData.cities.length === 0
        ) {
          setCityCode(null)
          setCityStatus('not-found')
          return
        }

        const foundCity =
          cityData.cities[0] as CdekCity

        setCityCode(foundCity.code)
        setCity(foundCity.city)
        setCityStatus('found')

        /*
          Сбрасываем старые ПВЗ.
        */
        setCdekPoints([])
        setCdekPoint('')
        setCdekPointCode('')
        setCdekPointSearch('')
        setIsChoosingCdekPoint(true)

        setYandexPoints([])
        setYandexPoint('')
        setYandexPointId('')
        setYandexPointSearch('')
        setIsChoosingYandexPoint(true)

        setYandexDelivery(null)

        /*
          Загружаем СДЭК и Яндекс параллельно.
        */
        setIsLoadingCdekPoints(true)
        setIsLoadingYandexPoints(true)

        const [cdekResponse, yandexResponse] =
          await Promise.all([
            fetch(
              `/api/cdek/points?cityCode=${foundCity.code}`,
              {
                signal: controller.signal,
                cache: 'no-store',
              }
            ),

            fetch(
              `/api/yandex/points?city=${encodeURIComponent(query)}`,
              {
                signal: controller.signal,
                cache: 'no-store',
              }
            ),
          ])

        const [cdekData, yandexData] =
          await Promise.all([
            cdekResponse.json(),
            yandexResponse.json(),
          ])

        if (controller.signal.aborted) return

        if (
          cdekData.success &&
          Array.isArray(cdekData.points)
        ) {
          setCdekPoints(cdekData.points)
        } else {
          setCdekPoints([])
        }

        if (
          yandexData.success &&
          Array.isArray(yandexData.points)
        ) {
          setYandexPoints(yandexData.points)
        } else {
          setYandexPoints([])
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

        setCdekPoints([])
        setYandexPoints([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCdekPoints(false)
          setIsLoadingYandexPoints(false)
        }
      }
    }, 900)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [city])

  /*
    РАСЧЁТ СДЭК
  */
  useEffect(() => {
    if (cityCode === null || lines.length === 0) {
      setCdekDelivery(null)
      setCdekDeliveryCalculated(null)
      return
    }

    const controller = new AbortController()

    async function calculateCdek() {
      try {
        setIsLoadingCdekDelivery(true)
        setCdekDelivery(null)
        setCdekDeliveryCalculated(null)

        const response = await fetch('/api/cdek/delivery', {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            cityCode,

            items: lines.map((line) => ({
              productId: line.product.id,
              quantity: line.quantity,
            })),
          }),

          signal: controller.signal,
          cache: 'no-store',
        })

        const data = await response.json()

        if (controller.signal.aborted) return

        if (
          response.ok &&
          data.success &&
          data.calculated &&
          data.delivery
        ) {
          setCdekDelivery({
            price: data.delivery.price,
            periodMin: data.delivery.periodMin,
            periodMax: data.delivery.periodMax,
          })

          setCdekDeliveryCalculated(true)
        } else {
          setCdekDelivery(null)
          setCdekDeliveryCalculated(false)
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AbortError'
        ) {
          return
        }

        setCdekDelivery(null)
        setCdekDeliveryCalculated(false)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCdekDelivery(false)
        }
      }
    }

    calculateCdek()

    return () => {
      controller.abort()
    }
  }, [cityCode, lines])

  /*
    ПРЕДВАРИТЕЛЬНЫЙ РАСЧЁТ ЯНДЕКСА ПО ГОРОДУ
  */
  useEffect(() => {
    if (cityCode === null || !city.trim() || lines.length === 0) {
      setYandexCityDelivery(null)
      setIsLoadingYandexCityDelivery(false)
      return
    }

    const controller = new AbortController()

    async function calculateYandexForCity() {
      try {
        setIsLoadingYandexCityDelivery(true)
        setYandexCityDelivery(null)

        const response = await fetch('/api/yandex/delivery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            city: city.trim(),
            items: lines.map((line) => ({
              productId: line.product.id,
              quantity: line.quantity,
            })),
          }),
          signal: controller.signal,
          cache: 'no-store',
        })

        const data = await response.json()

        if (controller.signal.aborted) return

        if (
          response.ok &&
          data.success &&
          data.calculated &&
          data.delivery
        ) {
          setYandexCityDelivery({
            yandexPrice: data.delivery.yandexPrice,
            customerPrice: data.delivery.customerPrice,
            deliveryDays: data.delivery.deliveryDays,
          })
        } else {
          setYandexCityDelivery(null)
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AbortError'
        ) {
          return
        }

        setYandexCityDelivery(null)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingYandexCityDelivery(false)
        }
      }
    }

    calculateYandexForCity()

    return () => {
      controller.abort()
    }
  }, [cityCode, city, lines])

  /*
    ТОЧНЫЙ РАСЧЁТ ЯНДЕКСА ПО ВЫБРАННОМУ ПВЗ
  */
  useEffect(() => {
    if (
      !yandexPointId ||
      lines.length === 0
    ) {
      setYandexDelivery(null)
      setIsLoadingYandexDelivery(false)
      return
    }

    const controller = new AbortController()

    async function calculateYandex() {
      try {
        setIsLoadingYandexDelivery(true)
        setYandexDelivery(null)

        const response = await fetch(
          '/api/yandex/delivery',
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
            },

            body: JSON.stringify({
              destinationStationId:
                yandexPointId,

              items: lines.map((line) => ({
                productId: line.product.id,
                quantity: line.quantity,
              })),
            }),

            signal: controller.signal,
            cache: 'no-store',
          }
        )

        const data = await response.json()

        if (controller.signal.aborted) return

        if (
          response.ok &&
          data.success &&
          data.calculated &&
          data.delivery
        ) {
          setYandexDelivery({
            yandexPrice:
              data.delivery.yandexPrice,

            customerPrice:
              data.delivery.customerPrice,

            deliveryDays:
              data.delivery.deliveryDays,
          })
        } else {
          setYandexDelivery(null)
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AbortError'
        ) {
          return
        }

        setYandexDelivery(null)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingYandexDelivery(false)
        }
      }
    }

    calculateYandex()

    return () => {
      controller.abort()
    }
  }, [yandexPointId, lines])

  const filteredCdekPoints =
    cdekPoints.filter((point) => {
      const query =
        cdekPointSearch.trim().toLowerCase()

      if (!query) return true

      return (
        point.address.toLowerCase().includes(query) ||
        point.name.toLowerCase().includes(query) ||
        point.code.toLowerCase().includes(query)
      )
    })

  const filteredYandexPoints =
    yandexPoints.filter((point) => {
      const query =
        yandexPointSearch.trim().toLowerCase()

      if (!query) return true

      return (
        point.address.toLowerCase().includes(query) ||
        point.name.toLowerCase().includes(query)
      )
    })

  /*
    Для Яндекса доставка оплачивается сейчас.
    Для СДЭКа — при получении.
  */
  const paymentTotal =
    deliveryMethod === 'yandex' &&
    yandexDelivery
      ? total + yandexDelivery.customerPrice
      : total

  const deliveryIsValid =
    deliveryMethod === 'cdek'
      ? cdekPointCode.trim().length > 0
      : yandexPointId.trim().length > 0 &&
        yandexDelivery !== null &&
        !isLoadingYandexDelivery

  const isFormValid =
    fullName.trim().length > 0 &&
    phone.replace(/\D/g, '').length === 11 &&
    email.trim().length > 0 &&
    cityCode !== null &&
    deliveryIsValid &&
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
          <label
            htmlFor="fullName"
            className="text-sm font-medium"
          >
            ФИО
          </label>

          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
            placeholder="Иванова Анна Сергеевна"
            autoComplete="name"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="phone"
            className="text-sm font-medium"
          >
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

              let number =
                digits.startsWith('7')
                  ? digits.slice(1)
                  : digits

              number = number.slice(0, 10)

              let formatted = '+7'

              if (number.length > 0) {
                formatted +=
                  ' ' + number.slice(0, 3)
              }

              if (number.length > 3) {
                formatted +=
                  ' ' + number.slice(3, 6)
              }

              if (number.length > 6) {
                formatted +=
                  '-' + number.slice(6, 8)
              }

              if (number.length > 8) {
                formatted +=
                  '-' + number.slice(8, 10)
              }

              setPhone(formatted)
            }}
            placeholder="+7 999 123-45-67"
            autoComplete="tel"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium"
          >
            Электронная почта
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="example@mail.ru"
            autoComplete="email"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="city"
            className="text-sm font-medium"
          >
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

              setCdekPoints([])
              setCdekPoint('')
              setCdekPointCode('')
              setCdekPointSearch('')
              setIsChoosingCdekPoint(false)

              setYandexPoints([])
              setYandexPoint('')
              setYandexPointId('')
              setYandexPointSearch('')
              setIsChoosingYandexPoint(false)

              setCdekDelivery(null)
              setCdekDeliveryCalculated(null)
              setYandexDelivery(null)
              setYandexCityDelivery(null)
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

          {cityStatus === 'not-found' && (
            <p className="px-1 text-xs text-muted-foreground">
              Не удалось найти город. Проверьте название.
            </p>
          )}
        </div>

        {cityCode !== null && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Способ доставки
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('cdek')}
                  className={`rounded-2xl border p-4 text-left ${
                    deliveryMethod === 'cdek'
                      ? 'border-primary bg-background'
                      : 'border-border bg-background'
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    СДЭК
                  </span>

                  <span className="mt-1 block text-xs font-medium">
                    {isLoadingCdekDelivery
                      ? 'Рассчитываем...'
                      : cdekDelivery
                        ? `${formatPrice(cdekDelivery.price)}${
                            cdekDelivery.periodMin !== undefined &&
                            cdekDelivery.periodMax !== undefined
                              ? ` · примерно ${
                                  cdekDelivery.periodMin + 1 ===
                                  cdekDelivery.periodMax + 1
                                    ? `${cdekDelivery.periodMin + 1} дн.`
                                    : `${cdekDelivery.periodMin + 1}–${
                                        cdekDelivery.periodMax + 1
                                      } дн.`
                                }`
                              : ''
                          }`
                        : 'Стоимость после упаковки'}
                  </span>

                  <span className="mt-1 block text-xs text-muted-foreground">
                    Оплата доставки при получении
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMethod('yandex')}
                  className={`rounded-2xl border p-4 text-left ${
                    deliveryMethod === 'yandex'
                      ? 'border-primary bg-background'
                      : 'border-border bg-background'
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    Яндекс Доставка
                  </span>

                  <span className="mt-1 block text-xs font-medium">
                    {isLoadingYandexCityDelivery
                      ? 'Рассчитываем...'
                      : yandexCityDelivery
                        ? `${formatPrice(yandexCityDelivery.customerPrice)}${
                            yandexCityDelivery.deliveryDays !== undefined &&
                            yandexCityDelivery.deliveryDays !== null
                              ? ` · примерно ${
                                  yandexCityDelivery.deliveryDays + 1
                                } дн.`
                              : ''
                          }`
                        : 'Расчёт недоступен'}
                  </span>

                  <span className="mt-1 block text-xs text-muted-foreground">
                    Оплата доставки сразу
                  </span>
                </button>
              </div>
            </div>

            {deliveryMethod === 'cdek' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  ПВЗ СДЭК
                </label>

                {isLoadingCdekPoints ? (
                  <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                    Загружаем пункты СДЭК...
                  </div>
                ) : cdekPoint &&
                  !isChoosingCdekPoint ? (
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
                        setIsChoosingCdekPoint(true)
                        setCdekPointSearch('')
                      }}
                      className="mt-3 text-sm font-medium underline underline-offset-4"
                    >
                      Изменить ПВЗ
                    </button>
                  </div>
                ) : cdekPoints.length > 0 ? (
                  <>
                    <input
                      type="text"
                      value={cdekPointSearch}
                      onChange={(e) =>
                        setCdekPointSearch(
                          e.target.value
                        )
                      }
                      placeholder="Введите улицу или адрес"
                      autoComplete="off"
                      className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
                    />

                    {cdekPointSearch.trim().length >
                      0 && (
                      <div className="max-h-72 overflow-y-auto rounded-2xl border border-border bg-background">
                        {filteredCdekPoints.length >
                        0 ? (
                          filteredCdekPoints.map(
                            (point) => (
                              <button
                                key={point.code}
                                type="button"
                                onClick={() => {
                                  setCdekPoint(
                                    point.address
                                  )
                                  setCdekPointCode(
                                    point.code
                                  )
                                  setCdekPointSearch('')
                                  setIsChoosingCdekPoint(
                                    false
                                  )
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
                            )
                          )
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

            {deliveryMethod === 'yandex' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  ПВЗ Яндекс
                </label>

                {isLoadingYandexPoints ? (
                  <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                    Загружаем пункты Яндекса...
                  </div>
                ) : yandexPoint &&
                  !isChoosingYandexPoint ? (
                  <div className="rounded-2xl border border-primary bg-background p-4">
                    <p className="text-xs text-muted-foreground">
                      Выбранный ПВЗ
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {yandexPoint}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setIsChoosingYandexPoint(true)
                        setYandexPointSearch('')
                      }}
                      className="mt-3 text-sm font-medium underline underline-offset-4"
                    >
                      Изменить ПВЗ
                    </button>
                  </div>
                ) : yandexPoints.length > 0 ? (
                  <>
                    <input
                      type="text"
                      value={yandexPointSearch}
                      onChange={(e) =>
                        setYandexPointSearch(
                          e.target.value
                        )
                      }
                      placeholder="Введите улицу или адрес"
                      autoComplete="off"
                      className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none"
                    />

                    {yandexPointSearch.trim().length >
                      0 && (
                      <div className="max-h-72 overflow-y-auto rounded-2xl border border-border bg-background">
                        {filteredYandexPoints.length >
                        0 ? (
                          filteredYandexPoints.map(
                            (point) => (
                              <button
                                key={point.id}
                                type="button"
                                onClick={() => {
                                  setYandexPoint(
                                    point.address
                                  )
                                  setYandexPointId(
                                    point.id
                                  )
                                  setYandexPointSearch('')
                                  setIsChoosingYandexPoint(
                                    false
                                  )
                                }}
                                className="flex w-full flex-col border-b border-border px-4 py-3 text-left last:border-b-0"
                              >
                                <span className="text-sm font-medium">
                                  {point.address}
                                </span>

                                {point.name && (
                                  <span className="mt-1 text-xs text-muted-foreground">
                                    {point.name}
                                  </span>
                                )}
                              </button>
                            )
                          )
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
                    В этом городе не удалось найти ПВЗ Яндекса
                  </div>
                )}

                {yandexPointId &&
                  isLoadingYandexDelivery && (
                    <p className="px-1 text-xs text-muted-foreground">
                      Рассчитываем стоимость доставки...
                    </p>
                  )}

                {yandexPointId &&
                  !isLoadingYandexDelivery &&
                  !yandexDelivery && (
                    <p className="px-1 text-xs text-muted-foreground">
                      Для этого ПВЗ не удалось рассчитать доставку. Выберите другой ПВЗ.
                    </p>
                  )}
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-3xl bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Товаров: {count}
        </p>

        {cityCode !== null &&
          deliveryMethod === 'cdek' && (
            <div className="mt-4 border-t border-border pt-4">
              {isLoadingCdekDelivery ? (
                <p className="text-sm text-muted-foreground">
                  Рассчитываем доставку СДЭК...
                </p>
              ) : cdekDeliveryCalculated &&
                cdekDelivery ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm">
                      Доставка СДЭК до ПВЗ
                    </span>

                    <span className="shrink-0 text-sm font-semibold">
                      {formatPrice(
                        cdekDelivery.price
                      )}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Оплата доставки при получении.
                  </p>
                </>
              ) : cdekDeliveryCalculated ===
                false ? (
                <>
                  <p className="text-sm font-medium">
                    Доставка СДЭК — оплата при получении
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Стоимость доставки будет рассчитана после упаковки заказа.
                  </p>
                </>
              ) : null}
            </div>
          )}

        {cityCode !== null &&
          deliveryMethod === 'yandex' &&
          yandexPointId && (
            <div className="mt-4 border-t border-border pt-4">
              {isLoadingYandexDelivery ? (
                <p className="text-sm text-muted-foreground">
                  Рассчитываем Яндекс Доставку...
                </p>
              ) : yandexDelivery ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm">
                      Яндекс Доставка до ПВЗ
                    </span>

                    <span className="shrink-0 text-sm font-semibold">
                      {formatPrice(
                        yandexDelivery.customerPrice
                      )}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Оплачивается сразу вместе с заказом.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Не удалось рассчитать Яндекс Доставку.
                </p>
              )}
            </div>
          )}

        <div className="mt-4 flex items-center justify-between">
          <span className="font-serif text-xl font-semibold">
            Итого к оплате
          </span>

          <span className="text-xl font-semibold">
            {formatPrice(paymentTotal)}
          </span>
        </div>
      </section>

      <button
        type="button"
        disabled={!isFormValid}
        onClick={async () => {
          const response = await fetch(
            '/api/payment',
            {
              method: 'POST',

              headers: {
                'Content-Type': 'application/json',
              },

              body: JSON.stringify({
                fullName,
                phone,
                email,
                city,

                deliveryMethod,

                cityCode,

                cdekPoint:
                  deliveryMethod === 'cdek'
                    ? cdekPoint
                    : '',

                cdekPointCode:
                  deliveryMethod === 'cdek'
                    ? cdekPointCode
                    : '',

                yandexPoint:
                  deliveryMethod === 'yandex'
                    ? yandexPoint
                    : '',

                yandexPointId:
                  deliveryMethod === 'yandex'
                    ? yandexPointId
                    : '',

                items: lines.map((line) => ({
                  productId: line.product.id,
                  quantity: line.quantity,
                })),
              }),
            }
          )

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

                deliveryMethod,

                cityCode,
                cdekPoint,
                cdekPointCode,

                yandexPoint,
                yandexPointId,

                items: lines,

                productsTotal: total,

                deliveryPrice:
                  deliveryMethod === 'yandex'
                    ? yandexDelivery?.customerPrice ??
                      0
                    : 0,

                total:
                  data.total ?? paymentTotal,
              })
            )

            /*
              ВАЖНО:
              оставляем именно этот способ открытия
              оплаты внутри Telegram.
            */
            const telegram =
              (window as any).Telegram?.WebApp

            if (telegram?.openLink) {
              telegram.openLink(
                data.paymentLink
              )
            } else {
              window.location.href =
                data.paymentLink
            }
          } else {
            alert(
              data.error
                ? typeof data.error === 'string'
                  ? data.error
                  : JSON.stringify(
                      data.error,
                      null,
                      2
                    )
                : JSON.stringify(
                    data,
                    null,
                    2
                  )
            )
          }
        }}
        className="flex h-15 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        Перейти к оплате
      </button>
    </main>
  )
}
