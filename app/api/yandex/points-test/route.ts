import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.YANDEX_DELIVERY_TOKEN

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'YANDEX_DELIVERY_TOKEN не найден',
        },
        { status: 500 }
      )
    }

    const response = await fetch(
      'https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/pickup-points/list',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'ru',
        },
        body: JSON.stringify({
          available_for_dropoff: true,
        }),
        cache: 'no-store',
      }
    )

    const text = await response.text()

    let data

    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          yandex: data,
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      yandex: data,
    })
  } catch (error) {
    console.error('Yandex points test error:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Неизвестная ошибка',
      },
      { status: 500 }
    )
  }
}
