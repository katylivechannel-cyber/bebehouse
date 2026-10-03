import { redis } from '@/lib/redis'

const YANDEX_API =
  'https://b2b-authproxy.taxi.yandex.net'

const CDEK_API =
  'https://api.cdek.ru'

type DeliveryMethod = 'cdek' | 'yandex'

type StoredOrder = {
  operationId: string
  orderNumber: number
  fullName: string
  phone: string
  email: string
  city: string
  deliveryMethod: DeliveryMethod
  cdekPoint: string | null
  cdekPointCode: string | null
  yandexPoint: string | null
  yandexPointId: string | null
  items: {
    productId: string
    name: string
    price: number
    quantity: number
  }[]
  productsTotal: number
  deliveryPrice: number
  total: number
  status: string
  createdAt: string

  cdekOrderUuid?: string | null
  cdekNumber?: string | null
  cdekShipmentCreated?: boolean

  yandexRequestId?: string | null
  yandexShipmentCreated?: boolean

  shipmentEmailSent?: boolean
  shipmentEmailSentAt?: string | null

  trackingStatus?: string | null
  trackingDescription?: string | null
  trackingUrl?: string | null
  trackingNumber?: string | null
}

type TrackingResult = {
  handedOver: boolean
  status: string
  description: string
  trackingUrl: string | null
  trackingNumber: string | null
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function getYandexTracking(
  order: StoredOrder
): Promise<TrackingResult> {
  const token =
    process.env.YANDEX_DELIVERY_TOKEN

  if (!token) {
    throw new Error(
      'Не настроен YANDEX_DELIVERY_TOKEN'
    )
  }

  if (!order.yandexRequestId) {
    throw new Error(
      'Нет yandexRequestId'
    )
  }

  const params = new URLSearchParams({
    request_id: order.yandexRequestId,
  })

  const response = await fetch(
    `${YANDEX_API}/api/b2b/platform/request/info?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept-Language': 'ru',
      },
      cache: 'no-store',
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.code ||
        'Не удалось получить статус Яндекс Доставки'
    )
  }

  const status =
    String(data?.state?.status || '')

  const description =
    String(
      data?.state?.description ||
        status ||
        'Статус не указан'
    )

  /*
    SORTING_CENTER_AT_START:
    заказ поступил в точку приема.

    Любой более поздний логистический
    статус также означает, что магазин
    уже передал посылку Яндексу.
  */
  const handedOverStatuses = new Set([
    'SORTING_CENTER_AT_START',
    'SORTING_CENTER_PREPARED',
    'SORTING_CENTER_TRANSMITTED',
    'DELIVERY_LOADED',
    'DELIVERY_AT_START',
    'DELIVERY_ARRIVED',
    'DELIVERY_TRANSPORTATION',
    'DELIVERY_AT_DESTINATION',
    'DELIVERY_DELIVERED',
    'RETURN_PREPARING',
    'RETURN_ARRIVED',
    'RETURN_TRANSPORTATION',
    'RETURNED',
  ])

  return {
    handedOver:
      handedOverStatuses.has(status),
    status,
    description,
    trackingUrl:
      data?.sharing_url
        ? String(data.sharing_url)
        : null,
    trackingNumber:
      data?.courier_order_id
        ? String(data.courier_order_id)
        : null,
  }
}

async function getCdekToken() {
  const clientId =
    process.env.CDEK_CLIENT_ID

  const clientSecret =
    process.env.CDEK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Не настроены CDEK_CLIENT_ID / CDEK_CLIENT_SECRET'
    )
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(
    `${CDEK_API}/v2/oauth/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
    }
  )

  const data = await response.json()

  if (!response.ok || !data?.access_token) {
    throw new Error(
      'Не удалось авторизоваться в СДЭК'
    )
  }

  return String(data.access_token)
}

async function getCdekTracking(
  order: StoredOrder
): Promise<TrackingResult> {
  if (!order.cdekOrderUuid) {
    throw new Error(
      'Нет cdekOrderUuid'
    )
  }

  const token = await getCdekToken()

  const response = await fetch(
    `${CDEK_API}/v2/orders/${encodeURIComponent(order.cdekOrderUuid)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.errors?.[0]?.message ||
        'Не удалось получить статус СДЭК'
    )
  }

  const statuses = Array.isArray(
    data?.entity?.statuses
  )
    ? data.entity.statuses
    : []

  const latest =
    statuses.length > 0
      ? statuses[statuses.length - 1]
      : null

  const status =
    String(latest?.code || '')

  const description =
    String(
      latest?.name ||
        status ||
        'Статус не указан'
    )

  /*
    В письмо "Заказ отправлен" допускаем
    только статусы, которые означают, что
    СДЭК уже физически получил посылку,
    либо она находится дальше по маршруту.

    Если СДЭК вернет новый/неизвестный
    статус — письмо НЕ отправится.
  */
  const handedOverStatuses = new Set([
    'RECEIVED_AT_SHIPMENT_WAREHOUSE',
    'READY_FOR_SHIPMENT_IN_TRANSIT_CITY',
    'RETURNED_TO_SHIPMENT_WAREHOUSE',
    'ACCEPTED_AT_TRANSIT_WAREHOUSE',
    'ACCEPTED_AT_RECIPIENT_CITY_WAREHOUSE',
    'ACCEPTED_AT_PICK_UP_POINT',
    'TAKEN_BY_COURIER',
    'DELIVERED',
  ])

  const cdekNumber =
    data?.entity?.cdek_number
      ? String(data.entity.cdek_number)
      : order.cdekNumber || null

  return {
    handedOver:
      handedOverStatuses.has(status),
    status,
    description,
    trackingUrl: cdekNumber
      ? `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(cdekNumber)}`
      : null,
    trackingNumber: cdekNumber,
  }
}

async function sendShipmentEmail(
  order: StoredOrder,
  tracking: TrackingResult
) {
  if (!order.email) {
    return
  }

  const resendKey =
    process.env.RESEND_API_KEY

  if (!resendKey) {
    throw new Error(
      'Не настроен RESEND_API_KEY'
    )
  }

  const deliveryName =
    order.deliveryMethod === 'cdek'
      ? 'СДЭК'
      : 'Яндекс Доставка'

  const point =
    order.deliveryMethod === 'cdek'
      ? order.cdekPoint
      : order.yandexPoint

  const trackingNumberHtml =
    tracking.trackingNumber
      ? `
        <p style="margin: 8px 0 0;">
          Номер отправления:
          <strong>${escapeHtml(tracking.trackingNumber)}</strong>
        </p>
      `
      : ''

  const trackingButtonHtml =
    tracking.trackingUrl
      ? `
        <div style="margin-top: 22px;">
          <a
            href="${escapeHtml(tracking.trackingUrl)}"
            style="display: inline-block; background: #411D0A; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 12px;"
          >
            Отследить заказ
          </a>
        </div>
      `
      : ''

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: {
        Authorization:
          `Bearer ${resendKey}`,
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        from:
          'bébéhouse <onboarding@resend.dev>',
        to: [order.email],
        subject:
          `Заказ №${order.orderNumber} отправлен — bébéhouse 🤍`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #411D0A; line-height: 1.6; max-width: 600px; margin: 0 auto;">

            <h2>
              Ваш заказ отправлен 🤍
            </h2>

            <p>
              Заказ №${order.orderNumber} передан в ${escapeHtml(deliveryName)}.
            </p>

            <div style="margin-top: 22px; padding: 16px; background: #faf7f2; border-radius: 14px;">
              <strong>
                ${escapeHtml(deliveryName)}
              </strong>

              ${
                point
                  ? `
                    <div style="margin-top: 6px;">
                      ПВЗ: ${escapeHtml(point)}
                    </div>
                  `
                  : ''
              }

              ${trackingNumberHtml}
            </div>

            ${trackingButtonHtml}

            <p style="margin-top: 28px;">
              С любовью,<br />
              <strong>bébéhouse 🤍</strong>
            </p>

          </div>
        `,
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()

    throw new Error(
      `Не удалось отправить письмо об отправке: ${body}`
    )
  }
}

export async function checkDeliveryTracking() {
  const keys =
    await redis.keys('order:*')

  let checked = 0
  let sent = 0
  let skipped = 0
  const errors: {
    key: string
    error: string
  }[] = []

  for (const key of keys) {
    try {
      const order =
        await redis.get<StoredOrder>(key)

      if (!order) {
        skipped++
        continue
      }

      /*
        Нас интересуют только оплаченные
        заказы с email и уже созданной
        накладной/заявкой.
      */
      if (
        order.status !== 'paid' ||
        !order.email ||
        order.shipmentEmailSent
      ) {
        skipped++
        continue
      }

      let tracking:
        | TrackingResult
        | null = null

      if (
        order.deliveryMethod ===
          'yandex' &&
        order.yandexShipmentCreated &&
        order.yandexRequestId
      ) {
        tracking =
          await getYandexTracking(order)
      }

      if (
        order.deliveryMethod ===
          'cdek' &&
        order.cdekShipmentCreated &&
        order.cdekOrderUuid
      ) {
        tracking =
          await getCdekTracking(order)
      }

      if (!tracking) {
        skipped++
        continue
      }

      checked++

      order.trackingStatus =
        tracking.status
      order.trackingDescription =
        tracking.description
      order.trackingUrl =
        tracking.trackingUrl
      order.trackingNumber =
        tracking.trackingNumber

      if (!tracking.handedOver) {
        await redis.set(key, order)
        continue
      }

      /*
        Сначала отправляем письмо.
        Флаг ставим только после успешной
        отправки, поэтому при ошибке Cron
        попробует снова позже.
      */
      await sendShipmentEmail(
        order,
        tracking
      )

      order.shipmentEmailSent = true
      order.shipmentEmailSentAt =
        new Date().toISOString()

      await redis.set(key, order)

      sent++
    } catch (error: any) {
      console.error(
        'DELIVERY TRACKING ERROR:',
        key,
        error
      )

      errors.push({
        key,
        error:
          error?.message ||
          'Неизвестная ошибка',
      })
    }
  }

  return {
    success: true,
    totalKeys: keys.length,
    checked,
    sent,
    skipped,
    errors,
  }
}
