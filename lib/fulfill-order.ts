import { redis } from '@/lib/redis'

type StoredOrder = {
  operationId: string
  orderNumber: number
  fullName: string
  phone: string
  email: string
  cdekPoint: string
  items: {
    productId: string
    name: string
    price: number
    quantity: number
  }[]
  total: number
  status: string
  telegramSent: boolean
  emailSent: boolean
  createdAt: string
}

export async function fulfillOrder(operationId: string) {
  const order = await redis.get<StoredOrder>(`order:${operationId}`)

  if (!order) {
    throw new Error(`Заказ ${operationId} не найден в Redis`)
  }

  // Отправляем заказ в Telegram
  if (!order.telegramSent) {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!telegramToken || !chatId) {
      throw new Error('Не настроен Telegram')
    }

    const text = [
      '🛍 Новый заказ bébéhouse',
      `Заказ №${order.orderNumber}`,
      '',
      `👤 ФИО: ${order.fullName}`,
      `📞 Телефон: ${order.phone}`,
      `✉️ Email: ${order.email}`,
      `📦 ПВЗ СДЭК: ${order.cdekPoint}`,
      '',
      'Товары:',
      ...order.items.map(
        (item) =>
          `• ${item.name} — ${item.quantity} шт. × ${item.price.toLocaleString('ru-RU')} ₽`
      ),
      '',
      `💰 Итого: ${order.total.toLocaleString('ru-RU')} ₽`,
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

    // Сохраняем сразу после успешной отправки,
    // чтобы повторный вызов не отправил Telegram ещё раз.
    await redis.set(`order:${operationId}`, order)
  }

  // Отправляем письмо покупателю
  if (!order.emailSent && order.email) {
    const resendKey = process.env.RESEND_API_KEY

    if (!resendKey) {
      throw new Error('Не настроен Resend')
    }

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
    <div style="font-family: Arial, sans-serif; color: #411D0A; line-height: 1.6;">
      <h2>Спасибо за заказ, ${order.fullName}! 🤍</h2>

      <p><strong>Заказ №${order.orderNumber}</strong></p>

      <p>Оплата прошла успешно.</p>

      <p>
        Мы передадим ваш заказ в СДЭК в течение 1–2 дней.
        Как только посылка будет отправлена, трек-номер придёт на эту электронную почту.
      </p>

      <p>
        С любовью,<br />
        bébéhouse
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
    await redis.set(`order:${operationId}`, order)
  }

  order.status = 'paid'
  await redis.set(`order:${operationId}`, order)

  return order
}
