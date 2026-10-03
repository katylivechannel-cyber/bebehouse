import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.TOCHKA_JWT?.trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Не найден TOCHKA_JWT' },
        { status: 500 }
      )
    }

    const clientId = '1e2fb9d2ad4b8ee897bfd0ff6c617086'

    const response = await fetch(
      `https://enter.tochka.com/uapi/webhook/v1.0/${clientId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          webhooksList: ['acquiringInternetPayment'],
          url: 'https://bebehouse-6b95.vercel.app/api/tochka-webhook',
        }),
      }
    )

    const data = await response.json()

    return NextResponse.json({
      status: response.status,
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Не удалось создать вебхук',
      },
      { status: 500 }
    )
  }
}
