import { NextResponse } from 'next/server'

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

async function findCity(
  token: string,
  city: string
) {
  const params = new URLSearchParams({
    country_codes: 'RU',
    city,
    size: '10',
  })

  const response = await fetch(
    `https://api.cdek.ru/v2/location/cities?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      `Ошибка поиска города ${city}: ${response.status} ${JSON.stringify(data)}`
    )
  }

  return data
}

export async function GET() {
  try {
    const token = await getCdekToken()

    const [spb, moscow] = await Promise.all([
      findCity(token, 'Санкт-Петербург'),
      findCity(token, 'Москва'),
    ])

    return NextResponse.json({
      success: true,
      spb,
      moscow,
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
