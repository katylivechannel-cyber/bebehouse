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

// Считаем итоговую стоимость доставки для покупателя
function calculateCustomerDeliveryPrice(cdekPrice: number) {
  // НДС СДЭК 7%
  const withVat = cdekPrice * 1.07

  // Посредническое вознаграждение:
  // 3% + НДС 7% на эту комиссию = 3.21%
  const withAcquiring = withVat * 1.0321

  // Округляем ВВЕРХ до ближайших 10 ₽
  return Math.ceil(withAcquiring / 10) * 10
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
            code: 137, // Санкт-Петербург
          },

          to_location: {
            code: 44, // Москва
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

    // Тариф 136 = "Посылка склад-склад"
    const tariff = data.tariff_codes?.find(
      (item: any) => item.tariff_code === 136
    )

    if (!tariff) {
      return NextResponse.json({
        success: false,
        error:
          'СДЭК не вернул тариф 136 "Посылка склад-склад"',
      })
    }

    const cdekPrice = Number(tariff.delivery_sum)

    const customerPrice =
      calculateCustomerDeliveryPrice(cdekPrice)

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

      tariff: {
        code: tariff.tariff_code,
        name: tariff.tariff_name,

        cdekPrice,
        customerPrice,

        periodMin: tariff.period_min,
        periodMax: tariff.period_max,
      },
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
