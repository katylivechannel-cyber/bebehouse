import { NextRequest, NextResponse } from 'next/server'

type PopularCity = {
  code: number
  city: string
  region: string
  subRegion?: string
}

const popularCities: PopularCity[] = [
  {
    code: 44,
    city: 'Москва',
    region: 'Москва',
  },
  {
    code: 137,
    city: 'Санкт-Петербург',
    region: 'Санкт-Петербург',
  },
  {
    code: 250,
    city: 'Екатеринбург',
    region: 'Свердловская область',
  },
]

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const city =
      searchParams.get('city')?.trim() || ''

    if (city.length < 2) {
      return NextResponse.json({
        success: true,
        cities: [],
      })
    }

    const query = city.toLowerCase().replace(/ё/g, 'е')

    //
    // Сначала ищем среди известных городов.
    // Благодаря этому "ека", "моск", "санкт" работают
    // сразу как autocomplete.
    //
    const localMatches = popularCities.filter((item) => {
      const cityName = item.city
        .toLowerCase()
        .replace(/ё/g, 'е')

      return (
        cityName.startsWith(query) ||
        cityName.includes(query)
      )
    })

    if (localMatches.length > 0) {
      return NextResponse.json({
        success: true,
        cities: localMatches,
      })
    }

    //
    // Если среди быстрых подсказок ничего нет,
    // спрашиваем СДЭК.
    //
    const token = await getCdekToken()

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

    const cities = Array.isArray(data)
      ? data.map((item: any) => ({
          code: item.code,
          city: item.city,
          region: item.region,
          subRegion: item.sub_region || '',
        }))
      : []

    return NextResponse.json({
      success: true,
      cities,
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
