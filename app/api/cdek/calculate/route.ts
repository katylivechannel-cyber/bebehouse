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

// Итоговая стоимость доставки для покупателя
function calculateCustomerDeliveryPrice(cdekPrice: number) {
  // НДС 7%
  const withVat = cdekPrice * 1.07

  // 3% посредническое вознаграждение
  // + НДС 7% на эту комиссию = 3.21%
  const withCommission = withVat * 1.0321

  // Округляем вверх до ближайших 10 ₽
  return Math.ceil(withCommission / 10) * 10
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const cityCode = Number(body.cityCode)
    const weight = Number(body.weight)
    const length = Number(body.length)
    const width = Number(body.width)
    const height = Number(body.height)

    if (
      !Number.isFinite(cityCode) ||
      !Number.isFinite(weight) ||
      !Number.isFinite(length) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      cityCode <= 0 ||
      weight <= 0 ||
      length <= 0 ||
      width <= 0 ||
      height <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Некорректные данные для расчёта доставки',
        },
        {
          status: 400,
        }
      )
    }

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
            code: cityCode,
          },

          packages: [
            {
              weight: Math.ceil(weight),
              length: Math.ceil(length),
              width: Math.ceil(width),
              height: Math.ceil(height),
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

    // Наш тариф:
    // 136 = "Посылка склад-склад"
    const tariff = data.tariff_codes?.find(
      (item: any) => item.tariff_code === 136
    )

    if (!tariff) {
      return NextResponse.json({
        success: false,
        error:
          'Для выбранного города тариф "Посылка склад-склад" недоступен',
      })
    }

    const cdekPrice = Number(tariff.delivery_sum)

    if (!Number.isFinite(cdekPrice)) {
      throw new Error(
        'СДЭК вернул некорректную стоимость доставки'
      )
    }

    const customerPrice =
      calculateCustomerDeliveryPrice(cdekPrice)

    return NextResponse.json({
      success: true,

      delivery: {
        tariffCode: tariff.tariff_code,
        tariffName: tariff.tariff_name,

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
