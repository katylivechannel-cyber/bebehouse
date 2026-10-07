import { redis } from '@/lib/redis'
import { confirmStockSale } from '@/lib/confirm-stock-sale'
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
  reservationId?: string
  stockConfirmed?: boolean
  stockSheetSynced?: boolean
  stockSheetSyncError?: string | null
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

async function syncStockToGoogleSheet(
  operationId: string,
  items: StoredOrder['items']
) {
  const url =
    process.env.GOOGLE_STOCK_WEBHOOK_URL

  const secret =
    process.env.GOOGLE_STOCK_SECRET

  if (!url || !secret) {
    throw new Error(
      'Не настроена синхронизация остатков с Google Sheets'
    )
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secret,
      orderId: operationId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `Google Sheets вернул HTTP ${response.status}`
    )
  }

  const result = await response.json()

  if (!result?.success) {
    throw new Error(
      result?.error ||
        'Google Sheets не подтвердил списание остатков'
    )
  }

  return result
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

  /*
    ОСТАТКИ

    После подтверждённой оплаты превращаем
    временный резерв в проданное количество.
  */
  if (
    order.reservationId &&
    !order.stockConfirmed
  ) {
    await confirmStockSale(
      order.reservationId,
      order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    )

    order.stockConfirmed = true

    await redis.set(
      `order:${operationId}`,
      order
    )
  }

  /*
    GOOGLE SHEETS

    После подтверждённой оплаты списываем товар
    из столбца «Количество» в Google Таблице.

    Apps Script сам защищает заказ от повторного
    списания по operationId.
  */
  if (!order.stockSheetSynced) {
    try {
      await syncStockToGoogleSheet(
        operationId,
        order.items
      )

      order.stockSheetSynced = true
      order.stockSheetSyncError = null
    } catch (error: any) {
      console.error(
        'GOOGLE STOCK SYNC ERROR:',
        error
      )

      /*
        Не отменяем выполнение оплаченного заказа,
        если Google временно недоступен.

        stock:sold в Redis уже защищает этот товар
        от повторной продажи.
      */
      order.stockSheetSynced = false
      order.stockSheetSyncError =
        error?.message ||
        'Не удалось обновить остаток в Google Sheets'
    }

    await redis.set(
      `order:${operationId}`,
      order
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
            Мы уже готовим ваш заказ к отправке 🤍
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
              <div style="font-family: Arial, sans-serif; color: #411D0A; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px 16px;">

                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="font-family: Georgia, serif; font-size: 36px; font-weight: 600;">
                    bébéhouse
                  </div>

                  <div style="font-size: 13px; color: #7a6a61; margin-top: 6px;">
                    Детские европейские бренды в одном месте
                  </div>
                </div>

                <div style="background: #FAF7F2; border-radius: 20px; padding: 24px; margin-bottom: 28px;">
                  <div style="font-family: Georgia, serif; font-size: 24px; font-weight: 600;">
                    Спасибо за заказ 🤍
                  </div>

                  <p style="margin: 10px 0 0;">
                    ${escapeHtml(order.fullName)}, оплата прошла успешно.
                    Мы уже готовим ваш заказ к отправке.
                  </p>
                </div>

                <div style="font-size: 14px; color: #7a6a61;">
                  Заказ №${order.orderNumber}
                </div>

                <h3 style="font-family: Georgia, serif; font-size: 21px; margin-top: 24px; margin-bottom: 4px;">
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

                <div style="margin-top: 28px; padding: 18px; background: #FAF7F2; border-radius: 16px;">
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

                <div style="margin-top: 32px; padding-top: 26px; border-top: 1px solid #eee8e3; text-align: center;">
                  <div style="font-family: Georgia, serif; font-size: 20px; font-weight: 600;">
                    Остались вопросы?
                  </div>

                  <p style="color: #7a6a61; font-size: 14px; margin: 8px 0 18px;">
                    Напишите нам в Telegram — мы всегда на связи 🤍
                  </p>

                  <a
                    href="https://t.me/bebe_house_bot?start=order_${order.orderNumber}"
                    style="display: inline-block; background: #411D0A; color: #ffffff; text-decoration: none; padding: 13px 24px; border-radius: 999px; font-weight: 600;"
                  >
                    Написать нам
                  </a>
                </div>

                <p style="margin-top: 32px; text-align: center; color: #7a6a61; font-size: 14px;">
                  С любовью,<br />
                  <strong style="color: #411D0A;">bébéhouse 🤍</strong>
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
