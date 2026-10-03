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

export async function POST(request: NextRequest) {
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

    const body = await request.json()

    const destinationStationId =
      String(body.destinationStationId ?? '').trim()

    const items =
      Array.isArray(body.items) ? body.items : []

    if (!destinationStationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Не выбран ПВЗ Яндекса',
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
      const quantity = Number(item.quantity)

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
        (product) => product.id === item.productId
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
        Она используется как объявленная стоимость
        для Яндекс Доставки.
      */
      assessedPriceRub +=
        product.price * quantity
    }

    const packing = packOrder(packingItems)

    /*
      Если упаковщик не смог подобрать коробку
      или использовал примерные данные,
      считаем доставку по XL.
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
      Яндекс принимает объявленную стоимость
      в копейках.

      ВАЖНО:
      даже при fallback XL стоимость товаров
      остаётся настоящей.
    */
    const assessedPriceKopecks =
      Math.round(assessedPriceRub * 100)

    const response = await fetch(
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

    const data = await response.json()

    /*
      Если Яндекс не смог рассчитать доставку
      даже с выбранными параметрами,
      просто не предлагаем этот способ.
    */
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
      parseYandexPrice(data?.pricing_total)

    if (yandexPrice === null) {
      return NextResponse.json({
        success: true,
        calculated: false,
        reason: 'price',
      })
    }

    /*
      Покупатель оплачивает Яндекс Доставку
      нам вместе с товаром.

      Чтобы после налога 7% у нас осталась
      полная стоимость доставки:

      цена клиенту = цена Яндекса / 0.93

      Округляем вверх до целого рубля.
    */
    const customerPrice =
      Math.ceil(yandexPrice / 0.93)

    return NextResponse.json({
      success: true,
      calculated: true,

      delivery: {
        yandexPrice,
        customerPrice,

        deliveryDays:
          Number(data?.delivery_days) || null,
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
