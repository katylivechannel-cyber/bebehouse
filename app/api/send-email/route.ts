import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, fullName } = await request.json()

    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Resend API key is not configured' },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'bébéhouse <onboarding@resend.dev>',
        to: [email],
        subject: 'Спасибо за заказ в bébéhouse 🤍',
        html: `
          <div style="font-family: Arial, sans-serif; color: #411D0A; line-height: 1.6;">
            <h2>Спасибо за заказ, ${fullName}! 🤍</h2>

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
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data },
        { status: response.status }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Не удалось отправить письмо' },
      { status: 500 }
    )
  }
}
