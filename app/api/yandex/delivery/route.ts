import { NextRequest, NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog'
import { packOrder } from '@/lib/packing'

const SOURCE_STATION_ID =
  '019e847bdc4a75fa9635a79723f409b8'

const FALLBACK_XL = {
  length: 60,
  width: 40,
  height: 45,
  weight: 20000,
  boxName: 'XL',
}

function parseYandexPrice(value: unknown) {
  const raw = String(value ?? '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')

  const price = Number(raw)

  return Number.isFinite(price) && price > 0
    ? price
    : null
}

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
}

async function findYandexPointForCity(
  token: string,
  city: string
) {
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
    console.error(
      'Yandex pickup points error:',
      data
    )

    return null
  }

  const points = Array.isArray(data?.points)
    ? data.points
    : Array.isArray(data)
      ? data
      : []

  const normalizedCity = normalize(city)

  const cityPoints = points.filter(
    (point: any) =>
      normalize(point?.address?.locality) ===
        normalizedCity &&
      point?.type === 'pickup_point'
  )

  if (!cityPoints.length) {
    return null
  }

  /*
    Для предварительного расчёта стараемся
    взять обычный ПВЗ Яндекса, а не 5Post.

    5Post оставляем покупателю доступным
    при окончательном выборе ПВЗ.
  */
  const regularYandexPoint =
    cityPoints.find((point: any) => {
      const searchableText = normalize(
        [
          point?.name,
          point?.address?.full_address,
          point?.address?.street,
        ]
          .filter(Boolean)
          .join(' ')
      )

      return (
        !searchableText.includes('5post') &&
        !searchableText.includes('пятероч')
      )
    }) ?? cityPoints[0]

  return {
    id: String(
      regularYandexPoint?.id ?? ''
    ),

    address:
      regularYandexPoint?.address
        ?.full_address ??
      '',
  }
}

export async function POST(request: NextRequest) {
  try {
    const token =
      process.env.YANDEX_DELIVERY_TOKEN

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            'YANDEX_DELIVERY_TOKEN не найден',
        },
        { status: 500 }
      )
    }

    const body = await request.json()

    let destinationStationId =
      String(
        body.destinationStationId ?? ''
      ).trim()

    const city =
      String(body.city ?? '').trim()

    const items =
      Array.isArray(body.items)
        ? body.items
        : []

    /*
      Если конкретный ПВЗ ещё не выбран,
      но город уже известен —
      берём обычный ПВЗ Яндекса
      для предварительного расчёта.
    */
    let preliminary = false
    let calculationPointAddress = ''

    if (!destinationStationId && city) {
      const point =
        await findYandexPointForCity(
          token,
          city
        )

      if (!point?.id) {
        return NextResponse.json({
          success: true,
          calculated: false,
          reason: 'point',
        })
      }

      destinationStationId = point.id
      calculationPointAddress =
        point.address

      preliminary = true
    }

    if (!destinationStationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Не выбран ПВЗ Яндекса и не указан город',
        },
        { status: 400 }
      )
    }

    if (!items.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Корзина пустая',
        },
        { status: 400 }
      )
    }

    const catalog = await getCatalog()
    const products = catalog.products

    const packingItems = []

    let assessedPriceRub = 0

    for (const item of items) {
      const quantity =
        Number(item.quantity)

      if (
        !item.productId ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Некорректный товар',
          },
          { status: 400 }
        )
      }

      const product = products.find(
        (product) =>
          product.id === item.productId
      )

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: 'Товар не найден',
          },
          { status: 400 }
        )
      }

      packingItems.push({
        product,
        quantity,
      })

      /*
        Настоящая стоимость товара.
        Используется как объявленная
        стоимость Яндекс Доставки.
      */
      assessedPriceRub +=
        product.price * quantity
    }

    const packing =
      packOrder(packingItems)

    /*
      Если упаковщик не смог подобрать
      коробку или использовал примерные
      данные — считаем по XL.
    */
    const useFallbackXL =
      !packing || packing.estimated

    const shipping = useFallbackXL
      ? FALLBACK_XL
      : {
          length: packing.box.length,
          width: packing.box.width,
          height: packing.box.height,
          weight: packing.weight,
          boxName: packing.box.name,
        }

    /*
      Объявленная стоимость —
      настоящая стоимость товаров.

      Яндекс принимает её в копейках.
    */
    const assessedPriceKopecks =
      Math.round(
        assessedPriceRub * 100
      )

    const response = await fetch(
      'https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/pricing-calculator',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type':
            'application/json',
          'Accept-Language': 'ru',
        },

        body: JSON.stringify({
          source: {
            platform_station_id:
              SOURCE_STATION_ID,
          },

          destination: {
            platform_station_id:
              destinationStationId,
          },

          tariff: 'self_pickup',

          total_weight:
            shipping.weight,

          total_assessed_price:
            assessedPriceKopecks,

          client_price: 0,

          payment_method:
            'already_paid',

          places: [
            {
              physical_dims: {
                weight_gross:
                  shipping.weight,

                dx:
                  shipping.length,

                dy:
                  shipping.width,

                dz:
                  shipping.height,
              },
            },
          ],
        }),

        cache: 'no-store',
      }
    )

    const data =
      await response.json()

    if (!response.ok) {
      console.error(
        'Yandex delivery calculation error:',
        data
      )

      return NextResponse.json({
        success: true,
        calculated: false,
        reason: 'yandex',
      })
    }

    const yandexPrice =
      parseYandexPrice(
        data?.pricing_total
      )

    if (yandexPrice === null) {
      return NextResponse.json({
        success: true,
        calculated: false,
        reason: 'price',
      })
    }

    /*
      Компенсируем налог 7%.

      Цена клиенту =
      цена Яндекса / 0.93

      Округляем вверх до рубля.
    */
    const customerPrice =
      Math.ceil(
        yandexPrice / 0.93
      )

    return NextResponse.json({
      success: true,
      calculated: true,

      /*
        true = предварительный расчёт
        по обычному ПВЗ города.

        false = расчёт уже по
        выбранному покупателем ПВЗ.
      */
      preliminary,

      delivery: {
        yandexPrice,
        customerPrice,

        deliveryDays:
          Number(
            data?.delivery_days
          ) || null,
      },

      calculationPoint: {
        id: destinationStationId,
        address:
          calculationPointAddress,
      },

      packing: {
        box: shipping.boxName,
        length: shipping.length,
        width: shipping.width,
        height: shipping.height,
        weight: shipping.weight,

        fallbackXL:
          useFallbackXL,
      },

      assessedPrice:
        assessedPriceRub,
    })
  } catch (error) {
    console.error(
      'Yandex delivery error:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'Не удалось рассчитать Яндекс Доставку',
      },
      { status: 500 }
    )
  }
}
