import { NextResponse } from 'next/server'

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

    const response = await fetch(
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

    const data = await response.json()

    console.log('TOCHKA PAYMENT STATUS:', {
      operationId,
      httpStatus: response.status,
      data,
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: data },
        { status: response.status }
      )
    }

    return NextResponse.json({
      status: data.Data?.status,
      paid: data.Data?.status === 'APPROVED',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message,
        cause: error?.cause?.message,
      },
      { status: 500 }
    )
  }
}
