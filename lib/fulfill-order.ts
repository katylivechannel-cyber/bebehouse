import { redis } from '@/lib/redis'
import {
  createCdekOrder,
} from '@/lib/cdek-create-order'
import {
  createYandexOrder,
} from '@/lib/yandex-create-order'

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
  yandexPrice: number | null
  assessedPrice: number | null

  packing: {
    box: string
    length: number
    width: number
    height: number
    weight: number
    fallbackXL: boolean
  } | null

  total: number
  status: string
  telegramSent: boolean
  emailSent: boolean
  createdAt: string

  cdekOrderUuid?: string | null
  cdekNumber?: string | null
  cdekPrice?: number | null
  cdekRecipientDeliveryPrice?: number | null
  cdekShipmentCreated?: boolean
  cdekShipmentError?: string | null

  yandexRequestId?: string | null
  yandexShipmentCreated?: boolean
  yandexShipmentError?: string | null
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function fulfillOrder(
  operationId: string
) {
  const order =
    await redis.get<StoredOrder>(
      `order:${operationId}`
    )

  if (!order) {
    throw new Error(
      `Заказ ${operationId} не найден в Redis`
    )
  }

  const isCdek =
    order.deliveryMethod === 'cdek'

  const isYandex =
    order.deliveryMethod === 'yandex'

  /*
    СДЭК
  */
  if (
    isCdek &&
    !order.cdekShipmentCreated &&
    !order.cdekOrderUuid
  ) {
    try {
      if (!order.cdekPointCode) {
        throw new Error(
          'Не сохранён код ПВЗ СДЭК'
        )
      }

      if (!order.packing) {
        throw new Error(
          'Не сохранена упаковка заказа'
        )
      }

      const cdek =
        await createCdekOrder({
          orderNumber:
            order.orderNumber,
          fullName:
            order.fullName,
          phone:
            order.phone,
          deliveryPointCode:
            order.cdekPointCode,
          items:
            order.items,
          productsTotal:
            order.productsTotal,
          packing:
            order.packing,
        })

      order.cdekOrderUuid =
        cdek.uuid

      order.cdekNumber =
        cdek.cdekNumber

      order.cdekPrice =
        cdek.cdekPrice

      order.cdekRecipientDeliveryPrice =
        cdek.recipientDeliveryPrice

      order.cdekShipmentCreated = true
      order.cdekShipmentError = null

      await redis.set(
        `order:${operationId}`,
        order
      )
    } catch (error: any) {
      console.error(
        'CDEK AUTO CREATE ERROR:',
        error
      )

      order.cdekShipmentCreated = false
      order.cdekShipmentError =
        error?.message ||
        'Не удалось создать накладную СДЭК'

      await redis.set(
        `order:${operationId}`,
        order
      )
    }
  }

  /*
    ЯНДЕКС ДОСТАВКА

    Покупатель уже оплатил и товары,
    и доставку через Точку.
  */
  if (
    isYandex &&
    !order.yandexShipmentCreated &&
    !order.yandexRequestId
  ) {
    try {
      if (!order.yandexPointId) {
        throw new Error(
          'Не сохранён ID ПВЗ Яндекса'
        )
      }

      if (!order.packing) {
        throw new Error(
          'Не сохранена упаковка заказа'
        )
      }

      const yandex =
        await createYandexOrder({
          orderNumber:
            order.orderNumber,
          fullName:
            order.fullName,
          phone:
            order.phone,
          email:
            order.email,
          destinationStationId:
            order.yandexPointId,
          items:
            order.items,
          productsTotal:
            order.productsTotal,
          packing:
            order.packing,
        })

      order.yandexRequestId =
        yandex.requestId

      order.yandexShipmentCreated = true
      order.yandexShipmentError = null

      await redis.set(
        `order:${operationId}`,
        order
      )
    } catch (error: any) {
      console.error(
        'YANDEX AUTO CREATE ERROR:',
        error
      )

      order.yandexShipmentCreated = false
      order.yandexShipmentError =
        error?.message ||
        'Не удалось создать Яндекс Доставку'

      await redis.set(
        `order:${operationId}`,
        order
      )
    }
  }

  const deliveryName = isCdek
    ? 'СДЭК'
    : 'Яндекс Доставка'

  const deliveryPoint = isCdek
    ? order.cdekPoint
    : order.yandexPoint

  /*
    Telegram
  */
  if (!order.telegramSent) {
    const telegramToken =
      process.env.TELEGRAM_BOT_TOKEN

    const chatId =
      process.env.TELEGRAM_CHAT_ID

    if (!telegramToken || !chatId) {
      throw new Error(
        'Не настроен Telegram'
      )
    }

    const cdekShipmentLines =
      isCdek
        ? order.cdekShipmentCreated
          ? [
              `✅ Накладная СДЭК создана`,
              ...(order.cdekNumber
                ? [
                    `🔎 Трек СДЭК: ${order.cdekNumber}`,
                  ]
                : []),
              `💳 С получателя за доставку: ${(order.cdekRecipientDeliveryPrice ?? 0).toLocaleString('ru-RU')} ₽`,
            ]
          : [
              `⚠️ Накладная СДЭК не создана автоматически`,
              `Ошибка: ${order.cdekShipmentError || 'неизвестная ошибка'}`,
            ]
        : []

    const yandexShipmentLines =
      isYandex
        ? order.yandexShipmentCreated
          ? [
              `✅ Яндекс Доставка создана`,
              `🔎 ID отправления: ${order.yandexRequestId}`,
            ]
          : [
              `⚠️ Яндекс Доставка не создана автоматически`,
              `Ошибка: ${order.yandexShipmentError || 'неизвестная ошибка'}`,
            ]
        : []

    const deliveryLines = isCdek
      ? [
          `🚚 Доставка: СДЭК`,
          `📦 ПВЗ: ${deliveryPoint || 'не указан'}`,
          ...cdekShipmentLines,
        ]
      : [
          `🚚 Доставка: Яндекс Доставка`,
          `📦 ПВЗ: ${deliveryPoint || 'не указан'}`,
          `💳 Доставка оплачена вместе с заказом: ${order.deliveryPrice.toLocaleString('ru-RU')} ₽`,
          ...yandexShipmentLines,
        ]

    const packingLines =
      order.packing
        ? [
            '',
            `📐 Упаковка: ${order.packing.box}`,
            `Размер: ${order.packing.length} × ${order.packing.width} × ${order.packing.height} см`,
            `Вес: ${order.packing.weight} г`,
          ]
        : []

    const text = [
      '🛍 Новый заказ bébéhouse',
      `Заказ №${order.orderNumber}`,
      '',
      `👤 ФИО: ${order.fullName}`,
      `📞 Телефон: ${order.phone}`,
      `✉️ Email: ${order.email}`,
      `🏙 Город: ${order.city}`,
      ...deliveryLines,
      ...packingLines,
      '',
      'Товары:',
      ...order.items.map(
        (item) =>
          `• ${item.name} — ${item.quantity} шт. × ${item.price.toLocaleString('ru-RU')} ₽`
      ),
      '',
      `🧸 Товары: ${order.productsTotal.toLocaleString('ru-RU')} ₽`,
      ...(isCdek
        ? []
        : [
            `🚚 Доставка: ${order.deliveryPrice.toLocaleString('ru-RU')} ₽`,
          ]),
      `💰 Оплачено: ${order.total.toLocaleString('ru-RU')} ₽`,
    ].join('\n')

    const telegramResponse =
      await fetch(
        `https://api.telegram.org/bot${telegramToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text,
          }),
        }
      )

    if (!telegramResponse.ok) {
      throw new Error(
        'Не удалось отправить заказ в Telegram'
      )
    }

    order.telegramSent = true

    await redis.set(
      `order:${operationId}`,
      order
    )
  }

  /*
    Email покупателю
  */
  if (!order.emailSent && order.email) {
    const resendKey =
      process.env.RESEND_API_KEY

    if (!resendKey) {
      throw new Error(
        'Не настроен Resend'
      )
    }

    const itemsHtml =
      order.items
        .map(
          (item) => `
            <div style="padding: 12px 0; border-bottom: 1px solid #eee8e3;">
              <div style="font-weight: 600;">
                ${escapeHtml(item.name)}
              </div>
              <div style="font-size: 14px; color: #7a6a61; margin-top: 4px;">
                ${item.quantity} шт. × ${item.price.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          `
        )
        .join('')

    const deliveryPaymentText =
      isCdek
        ? order.cdekShipmentCreated
          ? `Доставка оплачивается при получении — ${(order.cdekRecipientDeliveryPrice ?? 0).toLocaleString('ru-RU')} ₽.`
          : 'Доставка оплачивается при получении.'
        : `Доставка оплачена вместе с заказом — ${order.deliveryPrice.toLocaleString('ru-RU')} ₽.`

    const trackingText =
      isCdek && order.cdekNumber
        ? `
          <p style="margin-top: 28px;">
            Номер отправления СДЭК:
            <strong>${escapeHtml(order.cdekNumber)}</strong>
          </p>
        `
        : `
          <p style="margin-top: 28px;">
            Мы передадим ваш заказ в службу доставки в течение 1–2 дней.
            Как только посылка будет отправлена, трек-номер придёт на эту электронную почту.
          </p>
        `

    const emailResponse =
      await fetch(
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
              `Заказ №${order.orderNumber} — bébéhouse 🤍`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #411D0A; line-height: 1.6; max-width: 600px; margin: 0 auto;">

                <h2 style="margin-bottom: 8px;">
                  Спасибо за заказ, ${escapeHtml(order.fullName)}! 🤍
                </h2>

                <p style="margin-top: 0; color: #7a6a61;">
                  Заказ №${order.orderNumber}
                </p>

                <p>
                  Оплата прошла успешно.
                </p>

                <h3 style="margin-top: 28px; margin-bottom: 4px;">
                  Ваш заказ
                </h3>

                ${itemsHtml}

                <div style="margin-top: 18px;">
                  Товары: ${order.productsTotal.toLocaleString('ru-RU')} ₽
                </div>

                ${
                  isCdek
                    ? ''
                    : `
                      <div style="margin-top: 4px;">
                        Доставка: ${order.deliveryPrice.toLocaleString('ru-RU')} ₽
                      </div>
                    `
                }

                <div style="margin-top: 8px; font-size: 18px;">
                  <strong>
                    Оплачено: ${order.total.toLocaleString('ru-RU')} ₽
                  </strong>
                </div>

                <div style="margin-top: 28px; padding: 16px; background: #faf7f2; border-radius: 14px;">
                  <strong>
                    Доставка — ${escapeHtml(deliveryName)}
                  </strong>

                  <div style="margin-top: 6px;">
                    ${escapeHtml(deliveryPoint || 'ПВЗ не указан')}
                  </div>

                  <div style="margin-top: 6px; color: #7a6a61;">
                    ${escapeHtml(deliveryPaymentText)}
                  </div>
                </div>

                ${trackingText}

                <p style="margin-top: 28px;">
                  С любовью,<br />
                  <strong>bébéhouse 🤍</strong>
                </p>

              </div>
            `,
          }),
        }
      )

    if (!emailResponse.ok) {
      throw new Error(
        'Не удалось отправить email'
      )
    }

    order.emailSent = true

    await redis.set(
      `order:${operationId}`,
      order
    )
  }

  order.status = 'paid'

  await redis.set(
    `order:${operationId}`,
    order
  )

  return order
}
