import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog'
import { packOrder } from '@/lib/packing'
import { redis } from '@/lib/redis'

type CartItem = {
  productId: string
  quantity: number
}

type DeliveryMethod = 'cdek' | 'yandex'

const YANDEX_SOURCE_STATION_ID =
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

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const items = body.items as CartItem[]
    const fullName = String(body.fullName ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const email = String(body.email ?? '').trim()
    const city = String(body.city ?? '').trim()

    const deliveryMethod =
      body.deliveryMethod as DeliveryMethod

    const cdekPoint =
      String(body.cdekPoint ?? '').trim()

    const cdekPointCode =
      String(body.cdekPointCode ?? '').trim()

    const yandexPoint =
      String(body.yandexPoint ?? '').trim()

    const yandexPointId =
      String(body.yandexPointId ?? '').trim()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Корзина пуста' },
        { status: 400 }
      )
    }

    if (
      deliveryMethod !== 'cdek' &&
      deliveryMethod !== 'yandex'
    ) {
      return NextResponse.json(
        { error: 'Не выбран способ доставки' },
        { status: 400 }
      )
    }

    if (deliveryMethod === 'cdek' && !cdekPointCode) {
      return NextResponse.json(
        { error: 'Не выбран ПВЗ СДЭК' },
        { status: 400 }
      )
    }

    if (deliveryMethod === 'yandex' && !yandexPointId) {
      return NextResponse.json(
        { error: 'Не выбран ПВЗ Яндекса' },
        { status: 400 }
      )
    }

    const { products } = await getCatalog()

    let productsTotal = 0

    const validatedItems: {
      product: (typeof products)[number]
      quantity: number
    }[] = []

    for (const item of items) {
      const product = products.find(
        (product) => product.id === item.productId
      )

      if (!product) {
        return NextResponse.json(
          {
            error:
              'Один из товаров больше недоступен',
          },
          { status: 400 }
        )
      }

      const quantity =
        Math.floor(Number(item.quantity))

     if (
  !Number.isInteger(quantity) ||
  quantity < 1
) {
  return NextResponse.json(
    {
      error:
        'Некорректное количество товара',
    },
    { status: 400 }
  )
}

if (product.quantity <= 0) {
  return NextResponse.json(
    {
      error: `${product.name} закончился`,
    },
    { status: 400 }
  )
}

if (quantity > product.quantity) {
  return NextResponse.json(
    {
      error: `В наличии только ${product.quantity} шт.: ${product.name}`,
    },
    { status: 400 }
  )
}

      productsTotal +=
        product.price * quantity

      validatedItems.push({
        product,
        quantity,
      })
    }

    if (productsTotal <= 0) {
      return NextResponse.json(
        { error: 'Некорректная сумма заказа' },
        { status: 400 }
      )
    }

    const hasFreeDelivery =
      productsTotal >= 10000

    /*
      По умолчанию сумма оплаты —
      только стоимость товаров.

      Для Яндекса ниже добавим доставку.
    */
    let deliveryPrice = 0
    let yandexPrice = 0

    let packingInfo:
      | {
          box: string
          length: number
          width: number
          height: number
          weight: number
          fallbackXL: boolean
        }
      | null = null

    /*
      УПАКОВКА

      Считаем её для обоих способов доставки,
      чтобы после оплаты у нас уже были
      сохранены коробка, размеры и вес.
    */
    const packing = packOrder(
      validatedItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      }))
    )

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

    packingInfo = {
      box: shipping.boxName,
      length: shipping.length,
      width: shipping.width,
      height: shipping.height,
      weight: shipping.weight,
      fallbackXL: useFallbackXL,
    }

    /*
      ЯНДЕКС ДОСТАВКА

      Стоимость рассчитываем повторно прямо
      перед созданием платежа.

      Никакую цену из checkout не принимаем.
    */
    if (deliveryMethod === 'yandex') {
      const yandexToken =
        process.env.YANDEX_DELIVERY_TOKEN

      if (!yandexToken) {
        return NextResponse.json(
          {
            error:
              'Не настроена Яндекс Доставка',
          },
          { status: 500 }
        )
      }

      /*
        Реальная стоимость товаров
        в качестве объявленной стоимости.

        Яндекс принимает её в копейках.
      */
      const assessedPriceKopecks =
        Math.round(productsTotal * 100)

      const yandexResponse = await fetch(
        'https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/pricing-calculator',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${yandexToken}`,
            'Content-Type':
              'application/json',
            'Accept-Language': 'ru',
          },

          body: JSON.stringify({
            source: {
              platform_station_id:
                YANDEX_SOURCE_STATION_ID,
            },

            destination: {
              platform_station_id:
                yandexPointId,
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

      const yandexData =
        await yandexResponse.json()

      if (!yandexResponse.ok) {
        console.error(
          'Yandex payment calculation error:',
          yandexData
        )

        return NextResponse.json(
          {
            error:
              'Не удалось рассчитать Яндекс Доставку. Выберите другой ПВЗ или СДЭК.',
          },
          { status: 400 }
        )
      }

      const calculatedYandexPrice =
        parseYandexPrice(
          yandexData?.pricing_total
        )

      if (calculatedYandexPrice === null) {
        return NextResponse.json(
          {
            error:
              'Яндекс не вернул стоимость доставки',
          },
          { status: 400 }
        )
      }

      yandexPrice =
        calculatedYandexPrice

      /*
        Компенсируем налог 7%.

        Например:
        Яндекс = 488 ₽
        Покупатель = ceil(488 / 0.93)
                   = 525 ₽
      */
      deliveryPrice =
        hasFreeDelivery
          ? 0
          : Math.ceil(yandexPrice / 0.93)

      packingInfo = {
        box: shipping.boxName,
        length: shipping.length,
        width: shipping.width,
        height: shipping.height,
        weight: shipping.weight,
        fallbackXL: useFallbackXL,
      }
    }

    /*
      СДЭК:
      total = только товары.

      Яндекс:
      total = товары + доставка.
    */
    const total =
      productsTotal + deliveryPrice

    const token =
      process.env.TOCHKA_JWT?.trim()

    const customerCode =
      process.env.TOCHKA_CUSTOMER_CODE

    if (!token || !customerCode) {
      return NextResponse.json(
        {
          error:
            'Не настроены данные Точки',
        },
        { status: 500 }
      )
    }

    const response = await fetch(
      'https://enter.tochka.com/uapi/acquiring/v1.0/payments',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${token}`,
          'Content-Type':
            'application/json',
          Accept:
            'application/json',
        },

        body: JSON.stringify({
          Data: {
            customerCode,
            amount: total,

            purpose:
              'Заказ bébéhouse',

            paymentMode: [
              'sbp',
            ],

            redirectUrl:
              'https://bebehouse-6b95.vercel.app/payment-success',

            failRedirectUrl:
              'https://bebehouse-6b95.vercel.app/checkout',
          },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data },
        { status: response.status }
      )
    }

    const operationId =
      data.Data.operationId

    const counter =
      await redis.incr(
        'order-number-counter'
      )

    const orderNumber =
      1000 + counter

    const orderItems =
      validatedItems.map(
        ({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
        })
      )

    /*
      Сохраняем всю информацию о доставке
      вместе с заказом.
    */
    await redis.set(
      `order:${operationId}`,
      {
        operationId,
        orderNumber,

        fullName,
        phone,
        email,
        city,

        deliveryMethod,

        cdekPoint:
          deliveryMethod === 'cdek'
            ? cdekPoint
            : null,

        cdekPointCode:
          deliveryMethod === 'cdek'
            ? cdekPointCode
            : null,

        yandexPoint:
          deliveryMethod === 'yandex'
            ? yandexPoint
            : null,

        yandexPointId:
          deliveryMethod === 'yandex'
            ? yandexPointId
            : null,

        items: orderItems,

        productsTotal,

        deliveryPrice,

        yandexPrice:
          deliveryMethod === 'yandex'
            ? yandexPrice
            : null,

        assessedPrice:
          deliveryMethod === 'yandex'
            ? productsTotal
            : null,

        packing: packingInfo,

        total,

        status: 'pending',

        telegramSent: false,
        emailSent: false,

        createdAt:
          new Date().toISOString(),
      }
    )

    return NextResponse.json({
      paymentLink:
        data.Data.paymentLink,

      operationId,

      productsTotal,
      deliveryPrice,
      total,
    })
  } catch (error: any) {
    console.error(
      'Payment creation error:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Не удалось создать оплату',
      },
      { status: 500 }
    )
  }
}
