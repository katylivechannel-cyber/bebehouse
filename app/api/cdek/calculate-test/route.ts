import { NextResponse } from 'next/server'

async function getCdekToken() {
  const clientId = process.env.CDEK_CLIENT_ID
  const clientSecret = process.env.CDEK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Нет CDEK_CLIENT_ID или CDEK_CLIENT_SECRET')
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
        'Content-Type':
          'application/x-www-form-urlencoded',
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

export async function GET() {
  try {
    const token = await getCdekToken()

    const response = await fetch(
      'https://api.cdek.ru/v2/calculator/tarifflist',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 1,

          from_location: {
            city: 'Санкт-Петербург',
          },

          to_location: {
            city: 'Москва',
          },

          packages: [
            {
              weight: 1050,
              length: 20,
              width: 20,
              height: 20,
            },
          ],
        }),
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

    // Нам интересны тарифы,
    // где клиент получает заказ в ПВЗ.
    const tariffs = Array.isArray(data.tariff_codes)
      ? data.tariff_codes
          .filter(
            (tariff: any) =>
              tariff.delivery_mode === 3 ||
              tariff.delivery_mode === 4
          )
          .sort(
            (a: any, b: any) =>
              Number(a.delivery_sum ?? Infinity) -
              Number(b.delivery_sum ?? Infinity)
          )
      : []

    return NextResponse.json({
      success: true,

      test: {
        from: 'Санкт-Петербург',
        to: 'Москва',
        package: {
          weight: 1050,
          length: 20,
          width: 20,
          height: 20,
        },
      },

      tariffs,
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
