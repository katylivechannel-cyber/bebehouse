import { NextResponse } from 'next/server'
import { fulfillOrder } from '@/lib/fulfill-order'

export async function POST(request: Request) {
  try {
    const { operationId } = await request.json()

    if (!operationId) {
      return NextResponse.json(
        { error: 'Не указан operationId' },
        { status: 400 }
      )
    }

    const token = process.env.TOCHKA_JWT?.trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Не настроен токен Точки' },
        { status: 500 }
      )
    }

    // Проверяем реальный статус платежа в Точке
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

    const paymentStatus =
      paymentData.Data?.status ??
      paymentData.Data?.Operation?.[0]?.status

    if (paymentStatus !== 'APPROVED') {
      return NextResponse.json(
        {
          paid: false,
          status: paymentStatus,
        },
        { status: 400 }
      )
    }

    const order = await fulfillOrder(operationId)

    return NextResponse.json({
      ok: true,
      paid: true,
      order: {
        operationId: order.operationId,
        total: order.total,
      },
    })
  } catch (error: any) {
    console.error('COMPLETE ORDER ERROR:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Не удалось завершить заказ',
      },
      { status: 500 }
    )
  }
}
