import { NextResponse } from 'next/server'

const SOURCE_STATION_ID =
  '019e847bdc4a75fa9635a79723f409b8'

// Тестовая посылка
const WEIGHT = 1050
const LENGTH = 20
const WIDTH = 20
const HEIGHT = 20

// Реальная объявленная стоимость тестового товара
const ASSESSED_PRICE_RUB = 3000

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

    // Получаем доступные ПВЗ
    const pointsResponse = await fetch(
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

    const pointsData = await pointsResponse.json()

    if (!pointsResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          step: 'points',
          status: pointsResponse.status,
          yandex: pointsData,
        },
        { status: pointsResponse.status }
      )
    }

    const points = Array.isArray(pointsData)
      ? pointsData
      : Array.isArray(pointsData?.points)
        ? pointsData.points
        : []

    // Для теста ищем любой ПВЗ в Екатеринбурге
    const destinationPoint = points.find((point: any) => {
      const locality =
        point?.address?.locality?.trim().toLowerCase() || ''

      return locality === 'екатеринбург' && point?.id
    })

    if (!destinationPoint) {
      return NextResponse.json({
        success: false,
        step: 'find-destination',
        error: 'Не удалось найти ПВЗ Яндекса в Екатеринбурге',
      })
    }

    // Расчёт доставки
    const calculateResponse = await fetch(
      'https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/pricing-calculator',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'ru',
        },
        body: JSON.stringify({
          source: {
            platform_station_id: SOURCE_STATION_ID,
          },

          destination: {
            platform_station_id: destinationPoint.id,
          },

          tariff: 'self_pickup',

          total_weight: WEIGHT,

          // ВАЖНО:
          // Яндекс принимает оценочную стоимость в копейках
          total_assessed_price: ASSESSED_PRICE_RUB * 100,

          client_price: 0,

          payment_method: 'already_paid',

          places: [
            {
              physical_dims: {
                weight_gross: WEIGHT,
                dx: LENGTH,
                dy: WIDTH,
                dz: HEIGHT,
              },
            },
          ],
        }),
        cache: 'no-store',
      }
    )

    const calculateData = await calculateResponse.json()

    if (!calculateResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          step: 'calculate',
          status: calculateResponse.status,

          destination: {
            id: destinationPoint.id,
            address:
              destinationPoint?.address?.full_address ||
              destinationPoint?.address,
          },

          yandex: calculateData,
        },
        { status: calculateResponse.status }
      )
    }

    /*
      pricing_total у Яндекса может прийти строкой.
      Например: "161.10"
    */
    const rawPricing = String(
  calculateData?.pricing_total ?? ''
)
  .replace(',', '.')
  .replace(/[^\d.]/g, '')

const yandexPrice = Number(rawPricing)

    const customerPrice =
      Number.isFinite(yandexPrice) && yandexPrice > 0
        ? Math.ceil(yandexPrice / 0.93)
        : null

    return NextResponse.json({
      success: true,

      test: {
        from:
          'Санкт-Петербург, бульвар Красных Зорь, 8 к1',

        to:
          destinationPoint?.address?.full_address ||
          destinationPoint?.address,

        package: `${LENGTH} × ${WIDTH} × ${HEIGHT} см`,

        weight: `${WEIGHT} г`,

        assessedPrice: `${ASSESSED_PRICE_RUB} ₽`,
      },

      price: {
        yandexPrice,
        customerPrice,
        formula: 'стоимость Яндекса / 0.93',
      },

      yandex: calculateData,
    })
  } catch (error) {
    console.error('Yandex calculate test error:', error)

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
