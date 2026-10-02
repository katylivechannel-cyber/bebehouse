import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

type StoredOrder = {
  operationId: string
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

export async function POST(request: Request) {
  try {
    const { operationId } = await request.json()

    if (!operationId) {
      return NextResponse.json(
        { error: 'Не указан operationId' },
        { status: 400 }
      )
    }

    const order = await redis.get<StoredOrder>(`order:${operationId}`)

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      )
    }

    // Ещё раз независимо проверяем оплату в Точке
    const token = process.env.TOCHKA_JWT?.trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Не настроен токен Точки' },
        { status: 500 }
      )
    }

    const paymentResponse = await fetch(
      `https://enter.tochka.com/uapi/acquiring/v1.0/payments/${operationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      return NextResponse.json(
        { error: paymentData },
        { status: paymentResponse.status }
      )
    }

    const paymentStatus = paymentData.Data?.Operation?.[0]?.status

    if (paymentStatus !== 'APPROVED') {
      return NextResponse.json(
        {
          error: 'Оплата не подтверждена',
          paid: false,
        },
        { status: 400 }
      )
    }

    // Telegram
    if (!order.telegramSent) {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID

      if (!telegramToken || !chatId) {
        return NextResponse.json(
          { error: 'Не настроен Telegram' },
          { status: 500 }
        )
      }

      const text = [
        '🛍 Новый заказ bébéhouse',
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
        const error = await telegramResponse.json()

        return NextResponse.json(
          { error },
          { status: 500 }
        )
      }

      order.telegramSent = true
      await redis.set(`order:${operationId}`, order)
    }

    // Email
    if (!order.emailSent && order.email) {
      const resendKey = process.env.RESEND_API_KEY

      if (!resendKey) {
        return NextResponse.json(
          { error: 'Не настроен Resend' },
          { status: 500 }
        )
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
            subject: 'Спасибо за заказ в bébéhouse 🤍',
            html: `
              <div style="font-family: Arial, sans-serif; color: #411D0A; line-height: 1.6;">
                <h2>Спасибо за заказ, ${order.fullName}! 🤍</h2>

                <p>Оплата прошла успешно.</p>

                <p>
                  Мы передадим ваш заказ в СДЭК в течение 1–2 дней.
                  Как только посылка будет отправлена, трек-номер придёт на эту электронную почту.
                </p>

                <p>
                  С любовью,<br>
                  bébéhouse
                </p>
              </div>
            `,
          }),
        }
      )

      if (!emailResponse.ok) {
        const error = await emailResponse.json()

        return NextResponse.json(
          { error },
          { status: 500 }
        )
      }

      order.emailSent = true
    }

    order.status = 'paid'

    await redis.set(`order:${operationId}`, order)

    return NextResponse.json({
      ok: true,
      paid: true,
      order: {
        operationId: order.operationId,
        total: order.total,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Не удалось завершить заказ',
      },
      { status: 500 }
    )
  }
}
