import { NextRequest, NextResponse } from 'next/server'

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
}

export async function GET(request: NextRequest) {
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

    const city =
      request.nextUrl.searchParams.get('city')?.trim() || ''

    if (city.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Не указан город',
        },
        { status: 400 }
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
        body: JSON.stringify({}),
        cache: 'no-store',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Яндекс не вернул список ПВЗ',
          status: response.status,
        },
        { status: response.status }
      )
    }

    const allPoints = Array.isArray(data)
      ? data
      : Array.isArray(data?.points)
        ? data.points
        : []

    const normalizedCity = normalize(city)

    const points = allPoints
      .filter((point: any) => {
        const locality = normalize(
          point?.address?.locality || ''
        )

        return (
          locality === normalizedCity &&
          point?.id &&
          point?.type === 'pickup_point'
        )
      })
      .map((point: any) => ({
        id: point.id,

        name:
          point.name ||
          'Пункт выдачи Яндекс',

        address:
          point?.address?.full_address ||
          [
            point?.address?.street,
            point?.address?.house,
          ]
            .filter(Boolean)
            .join(', '),

        street:
          point?.address?.street || '',

        house:
          point?.address?.house || '',

        latitude:
          point?.position?.latitude ?? null,

        longitude:
          point?.position?.longitude ?? null,

        paymentMethods:
          Array.isArray(point?.payment_methods)
            ? point.payment_methods
            : [],
      }))

    return NextResponse.json({
      success: true,
      city,
      count: points.length,
      points,
    })
  } catch (error) {
    console.error('Yandex points error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Не удалось загрузить ПВЗ Яндекса',
      },
      { status: 500 }
    )
  }
}
