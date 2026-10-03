import { NextRequest, NextResponse } from 'next/server'

async function getCdekToken() {
  const clientId = process.env.CDEK_CLIENT_ID
  const clientSecret = process.env.CDEK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Нет CDEK_CLIENT_ID или CDEK_CLIENT_SECRET'
    )
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(
    'https://api.cdek.ru/v2/oauth/token?parameters',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const text = await response.text()

    throw new Error(
      `Ошибка авторизации СДЭК: ${response.status} ${text}`
    )
  }

  const data = await response.json()

  return data.access_token as string
}

export async function GET(request: NextRequest) {
  try {
    const cityCode = Number(
      request.nextUrl.searchParams.get('cityCode')
    )

    if (!Number.isFinite(cityCode) || cityCode <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Не указан корректный cityCode',
        },
        {
          status: 400,
        }
      )
    }

    const token = await getCdekToken()

    const params = new URLSearchParams({
      city_code: String(cityCode),

      // Только ПВЗ, куда можно доставить заказ
      is_handout: 'true',

      // Только работающие пункты
      allowed_cod: 'true',
    })

    const response = await fetch(
      `https://api.cdek.ru/v2/deliverypoints?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          cdek: data,
        },
        {
          status: response.status,
        }
      )
    }

    const points = Array.isArray(data)
      ? data.map((point: any) => ({
          code: point.code,

          name:
            point.name ||
            `ПВЗ СДЭК ${point.code}`,

          address:
            point.location?.address_full ||
            point.location?.address ||
            '',

          latitude:
            point.location?.latitude ?? null,

          longitude:
            point.location?.longitude ?? null,

          workTime:
            point.work_time || '',

          type: point.type || '',

          haveCashless:
            point.have_cashless ?? null,

          haveCash:
            point.have_cash ?? null,
        }))
      : []

    return NextResponse.json({
      success: true,
      cityCode,
      count: points.length,
      points,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Неизвестная ошибка',
      },
      {
        status: 500,
      }
    )
  }
}
