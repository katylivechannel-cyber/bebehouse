import { redis } from '@/lib/redis'

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
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function fulfillOrder(operationId: string) {
  const order = await redis.get<StoredOrder>(`order:${operationId}`)

  if (!order) {
    throw new Error(`Заказ ${operationId} не найден в Redis`)
  }

  const isCdek = order.deliveryMethod === 'cdek'

  const deliveryName = isCdek
    ? 'СДЭК'
    : 'Яндекс Доставка'

  const deliveryPoint = isCdek
    ? order.cdekPoint
    : order.yandexPoint

  /*
    Отправляем уведомление о новом оплаченном
    заказе в Telegram.
  */
  if (!order.telegramSent) {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!telegramToken || !chatId) {
      throw new Error('Не настроен Telegram')
    }

    const deliveryLines = isCdek
      ? [
          `🚚 Доставка: СДЭК`,
          `📦 ПВЗ: ${deliveryPoint || 'не указан'}`,
          `💳 Доставка оплачивается при получении`,
        ]
      : [
          `🚚 Доставка: Яндекс Доставка`,
          `📦 ПВЗ: ${deliveryPoint || 'не указан'}`,
          `💳 Доставка оплачена вместе с заказом: ${order.deliveryPrice.toLocaleString('ru-RU')} ₽`,
        ]

    const packingLines = order.packing
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

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      }
    )

    if (!telegramResponse.ok) {
      throw new Error('Не удалось отправить заказ в Telegram')
    }

    order.telegramSent = true

    /*
      Сохраняем сразу, чтобы повторный webhook
      не отправил Telegram второй раз.
    */
    await redis.set(`order:${operationId}`, order)
  }

  /*
    Отправляем письмо покупателю.
  */
  if (!order.emailSent && order.email) {
    const resendKey = process.env.RESEND_API_KEY

    if (!resendKey) {
      throw new Error('Не настроен Resend')
    }

    const itemsHtml = order.items
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

    const deliveryPaymentText = isCdek
      ? 'Доставка оплачивается при получении.'
      : `Доставка оплачена вместе с заказом — ${order.deliveryPrice.toLocaleString('ru-RU')} ₽.`

    const emailResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'bébéhouse <onboarding@resend.dev>',
          to: [order.email],
          subject: `Заказ №${order.orderNumber} — bébéhouse 🤍`,
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
                <strong>Доставка — ${escapeHtml(deliveryName)}</strong>

                <div style="margin-top: 6px;">
                  ${escapeHtml(deliveryPoint || 'ПВЗ не указан')}
                </div>

                <div style="margin-top: 6px; color: #7a6a61;">
                  ${escapeHtml(deliveryPaymentText)}
                </div>
              </div>

              <p style="margin-top: 28px;">
                Мы передадим ваш заказ в службу доставки в течение 1–2 дней.
                Как только посылка будет отправлена, трек-номер придёт на эту электронную почту.
              </p>

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
      throw new Error('Не удалось отправить email')
    }

    order.emailSent = true

    /*
      Сохраняем сразу после успешного email,
      чтобы повторный webhook не отправил письмо ещё раз.
    */
    await redis.set(`order:${operationId}`, order)
  }

  order.status = 'paid'
  await redis.set(`order:${operationId}`, order)

  return order
}

