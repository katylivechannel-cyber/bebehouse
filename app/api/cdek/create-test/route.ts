import { NextRequest, NextResponse } from 'next/server'

const CDEK_API = 'https://api.cdek.ru'

const SHIPMENT_POINT = 'SPB311'
const DELIVERY_POINT = 'SPB1183'

const RECIPIENT_NAME = 'Егорова Екатерина Валерьевна'
const RECIPIENT_PHONE = '+79618560931'

const TEST_PACKAGE = {
  weight: 1050,
  length: 20,
  width: 20,
  height: 20,
}

async function getCdekToken() {
  const clientId = process.env.CDEK_CLIENT_ID
  const clientSecret = process.env.CDEK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Не настроены CDEK_CLIENT_ID / CDEK_CLIENT_SECRET')
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(
    `${CDEK_API}/v2/oauth/token?parameters`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
    }
  )

  const data = await response.json()

  if (!response.ok || !data?.access_token) {
    console.error('CDEK TOKEN ERROR:', data)
    throw new Error('Не удалось получить токен СДЭК')
  }

  return String(data.access_token)
}

function customerDeliveryPrice(cdekPrice: number) {
  /*
    Наша формула для СДЭК:
    тариф × 1.07 × 1.0321,
    затем округление вверх до 10 ₽.
  */
  return Math.ceil(
    (cdekPrice * 1.07 * 1.0321) / 10
  ) * 10
}

export async function GET(request: NextRequest) {
  try {
    const confirm =
      request.nextUrl.searchParams.get('confirm')

    /*
      Защита от случайного создания настоящей накладной.
    */
    if (confirm !== 'CREATE') {
      return NextResponse.json({
        success: true,
        created: false,
        message:
          'Тест готов. Чтобы СОЗДАТЬ настоящую тестовую накладную, добавьте ?confirm=CREATE к адресу.',
        test: {
          shipmentPoint: SHIPMENT_POINT,
          deliveryPoint: DELIVERY_POINT,
          recipient: RECIPIENT_NAME,
          phone: RECIPIENT_PHONE,
          package: TEST_PACKAGE,
          tariffCode: 136,
        },
      })
    }

    const token = await getCdekToken()

    /*
      1. Сначала узнаём реальную стоимость тарифа
      по нашему договору.

      Оба тестовых ПВЗ находятся в Санкт-Петербурге,
      поэтому код города отправления и получения — 137.
    */
    const calculatorResponse = await fetch(
      `${CDEK_API}/v2/calculator/tariff`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tariff_code: 136,
          from_location: {
            code: 137,
          },
          to_location: {
            code: 137,
          },
          packages: [
            {
              weight: TEST_PACKAGE.weight,
              length: TEST_PACKAGE.length,
              width: TEST_PACKAGE.width,
              height: TEST_PACKAGE.height,
            },
          ],
        }),
        cache: 'no-store',
      }
    )

    const calculatorData =
      await calculatorResponse.json()

    if (!calculatorResponse.ok) {
      console.error(
        'CDEK CALCULATOR TEST ERROR:',
        calculatorData
      )

      return NextResponse.json(
        {
          success: false,
          stage: 'calculator',
          error: calculatorData,
        },
        { status: 400 }
      )
    }

    const cdekPrice =
      Number(calculatorData?.delivery_sum)

    if (!Number.isFinite(cdekPrice) || cdekPrice <= 0) {
      return NextResponse.json(
        {
          success: false,
          stage: 'calculator',
          error: 'СДЭК не вернул стоимость доставки',
          raw: calculatorData,
        },
        { status: 400 }
      )
    }

    const recipientDeliveryPrice =
      customerDeliveryPrice(cdekPrice)

    /*
      2. Создаём НАСТОЯЩУЮ тестовую накладную.

      delivery_recipient_cost — сумма,
      которую указываем к получению с получателя
      за доставку.

      Товар уже оплачен, поэтому payment у вложения = 0.
    */
    const orderPayload = {
      number: `BEBEHOUSE-TEST-${Date.now()}`,

      tariff_code: 136,

      shipment_point: SHIPMENT_POINT,
      delivery_point: DELIVERY_POINT,

      recipient: {
        name: RECIPIENT_NAME,
        phones: [
          {
            number: RECIPIENT_PHONE,
          },
        ],
      },

      delivery_recipient_cost: {
        value: recipientDeliveryPrice,
      },

     packages: [
  {
    number: '1',
    weight: TEST_PACKAGE.weight,
    length: TEST_PACKAGE.length,
    width: TEST_PACKAGE.width,
    height: TEST_PACKAGE.height,

    items: [
      {
        name: 'Тестовый товар bébéhouse',
        ware_key: 'BEBEHOUSE-TEST',
        payment: {
          value: 0,
        },
        cost: 10,
        weight: TEST_PACKAGE.weight,
        amount: 1,
      },
    ],
  },
],
    }

    const orderResponse = await fetch(
      `${CDEK_API}/v2/orders`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
        cache: 'no-store',
      }
    )

    const orderData =
      await orderResponse.json()

    if (!orderResponse.ok) {
      console.error(
        'CDEK CREATE TEST ERROR:',
        orderData
      )

      return NextResponse.json(
        {
          success: false,
          stage: 'create',
          cdekPrice,
          recipientDeliveryPrice,
          error: orderData,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      created: true,

      test: {
        shipmentPoint: SHIPMENT_POINT,
        deliveryPoint: DELIVERY_POINT,
        recipient: RECIPIENT_NAME,
        phone: RECIPIENT_PHONE,
        package: TEST_PACKAGE,
        tariffCode: 136,
      },

      price: {
        cdekPrice,
        recipientDeliveryPrice,
        formula:
          'CDEK × 1.07 × 1.0321, округление вверх до 10 ₽',
      },

      cdek: orderData,

      next:
        'Откройте созданный заказ в ЛК СДЭК и проверьте сумму к получению с получателя.',
    })
  } catch (error: any) {
    console.error('CDEK CREATE TEST ERROR:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Не удалось создать тестовую накладную СДЭК',
      },
      { status: 500 }
    )
  }
}
