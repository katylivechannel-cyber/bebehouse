import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { fullName, phone, cdekPoint, items, total } = await request.json()

    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!token) {
      return NextResponse.json(
        { error: 'Telegram bot token is not configured' },
        { status: 500 }
      )
    }

    const text = [
      '🛍 Новый заказ bébéhouse',
      '',
      `👤 ФИО: ${fullName}`,
      `📞 Телефон: ${phone}`,
      `📦 ПВЗ СДЭК: ${cdekPoint}`,
      '',
      'Товары:',
      ...items.map(
        (item: { name: string; quantity: number; price: number }) =>
          `• ${item.name} — ${item.quantity} шт. × ${item.price.toLocaleString('ru-RU')} ₽`
      ),
      '',
      `💰 Итого: ${total.toLocaleString('ru-RU')} ₽`,
    ].join('\n')

    const telegramResponse = await fetch(
  `https://api.telegram.org/bot${token}/sendMessage`,
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
  const telegramError = await telegramResponse.json()
  return NextResponse.json(
   { error: telegramError },
    { status: 500 }
  )
}
    return NextResponse.json({ ok: true, text })
  } catch {
    return NextResponse.json(
      { error: 'Не удалось обработать заказ' },
      { status: 500 }
    )
  }
}
