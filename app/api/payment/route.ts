import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { total } = await request.json()

    const token = process.env.TOCHKA_JWT
    const customerCode = process.env.TOCHKA_CUSTOMER_CODE

    if (!token || !customerCode) {
      return NextResponse.json(
        { error: 'Не настроены данные Точки' },
        { status: 500 }
      )
    }

    const response = await fetch(
      'https://enter.tochka.com/uapi/acquiring/v1.0/payments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          Data: {
            customerCode,
            amount: total,
            purpose: 'Заказ bébéhouse',
            paymentMode: ['sbp', 'card'],
            redirectUrl:
              'https://bebehouse-6b95.vercel.app/payment-success',
            failRedirectUrl:
              'https://bebehouse-6b95.vercel.app/checkout',
          },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data },
        { status: response.status }
      )
    }

    return NextResponse.json({
      paymentLink: data.Data.paymentLink,
      operationId: data.Data.operationId,
    })
} catch (error) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : String(error),
    },
    { status: 500 }
  )
}
}
