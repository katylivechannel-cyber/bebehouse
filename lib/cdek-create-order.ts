const CDEK_API = 'https://api.cdek.ru'

const CDEK_SHIPMENT_POINT = 'SPB23'
const CDEK_TARIFF_CODE = 136

type CdekItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

type CdekPacking = {
  box: string
  length: number
  width: number
  height: number
  weight: number
  fallbackXL: boolean
}

export type CreateCdekOrderInput = {
  orderNumber: number
  fullName: string
  phone: string
  deliveryPointCode: string
  items: CdekItem[]
  productsTotal: number
  packing: CdekPacking
}

export type CreateCdekOrderResult = {
  uuid: string
  cdekPrice: number
  recipientDeliveryPrice: number
  cdekNumber: string | null
}

async function getCdekToken() {
  const clientId = process.env.CDEK_CLIENT_ID
  const clientSecret = process.env.CDEK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Не настроены CDEK_CLIENT_ID / CDEK_CLIENT_SECRET'
    )
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
        'Content-Type':
          'application/x-www-form-urlencoded',
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
  return (
    Math.ceil(
      (cdekPrice * 1.07 * 1.0321) / 10
    ) * 10
  )
}

async function getDeliveryPoint(
  token: string,
  code: string
) {
  const response = await fetch(
    `${CDEK_API}/v2/deliverypoints?code=${encodeURIComponent(
      code
    )}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error(
      'CDEK DELIVERY POINT ERROR:',
      data
    )
    throw new Error(
      'Не удалось получить данные ПВЗ СДЭК'
    )
  }

  const point = Array.isArray(data)
    ? data[0]
    : null

  const cityCode = Number(
    point?.location?.city_code
  )

  if (!point || !Number.isFinite(cityCode)) {
    throw new Error(
      `ПВЗ СДЭК ${code} не найден`
    )
  }

  return {
    point,
    cityCode,
  }
}

function buildCdekItems(
  items: CdekItem[],
  packageWeight: number
) {
  const totalUnits = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  let remainingWeight = packageWeight

  return items.map((item, index) => {
    const isLast =
      index === items.length - 1

    const proportionalWeight = Math.max(
      1,
      Math.round(
        packageWeight *
          (item.quantity / totalUnits)
      )
    )

    const itemWeight = isLast
      ? Math.max(1, remainingWeight)
      : Math.min(
          proportionalWeight,
          Math.max(
            1,
            remainingWeight -
              (items.length - index - 1)
          )
        )

    remainingWeight -= itemWeight

    return {
      name: item.name.slice(0, 255),
      ware_key: item.productId,
      payment: {
        value: 0,
      },
      cost: item.price,
      weight: itemWeight,
      amount: item.quantity,
    }
  })
}

export async function createCdekOrder(
  input: CreateCdekOrderInput
): Promise<CreateCdekOrderResult> {
  if (!input.deliveryPointCode) {
    throw new Error(
      'Не указан ПВЗ получения СДЭК'
    )
  }

  if (
    !input.packing ||
    input.packing.fallbackXL
  ) {
    throw new Error(
      'Нельзя автоматически создать СДЭК: упаковка рассчитана приблизительно'
    )
  }

  if (
    input.packing.weight <= 0 ||
    input.packing.length <= 0 ||
    input.packing.width <= 0 ||
    input.packing.height <= 0
  ) {
    throw new Error(
      'Некорректные параметры упаковки'
    )
  }

  if (
    !Array.isArray(input.items) ||
    input.items.length === 0
  ) {
    throw new Error(
      'В заказе нет товаров'
    )
  }

  const token = await getCdekToken()

  const { cityCode } =
    await getDeliveryPoint(
      token,
      input.deliveryPointCode
    )

  /*
    Перед созданием накладной повторно считаем
    стоимость по договору СДЭК.

    Отправление идёт из Санкт-Петербурга
    (код города 137) из ПВЗ SPB23.
  */
  const calculatorResponse = await fetch(
    `${CDEK_API}/v2/calculator/tariff`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        tariff_code: CDEK_TARIFF_CODE,
        from_location: {
          code: 137,
        },
        to_location: {
          code: cityCode,
        },
        packages: [
          {
            weight: input.packing.weight,
            length: input.packing.length,
            width: input.packing.width,
            height: input.packing.height,
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
      'CDEK CALCULATOR ERROR:',
      calculatorData
    )
    throw new Error(
      'Не удалось рассчитать доставку СДЭК'
    )
  }

  const cdekPrice = Number(
    calculatorData?.delivery_sum
  )

  if (
    !Number.isFinite(cdekPrice) ||
    cdekPrice <= 0
  ) {
    throw new Error(
      'СДЭК не вернул стоимость доставки'
    )
  }

  const recipientDeliveryPrice =
    customerDeliveryPrice(cdekPrice)

  const cdekItems = buildCdekItems(
    input.items,
    input.packing.weight
  )

  const payload = {
    /*
      Номер bébéhouse используется как внешний
      номер заказа. Это также помогает увидеть
      повторную попытку создания одного заказа.
    */
    number: `BEBEHOUSE-${input.orderNumber}`,

    tariff_code: CDEK_TARIFF_CODE,

    shipment_point:
      CDEK_SHIPMENT_POINT,

    delivery_point:
      input.deliveryPointCode,

    recipient: {
      name: input.fullName,
      phones: [
        {
          number: input.phone,
        },
      ],
    },

    /*
      Покупатель оплачивает при получении
      только доставку.
    */
    delivery_recipient_cost: {
      value: recipientDeliveryPrice,
    },

    packages: [
      {
        number: '1',
        weight: input.packing.weight,
        length: input.packing.length,
        width: input.packing.width,
        height: input.packing.height,
        items: cdekItems,
      },
    ],
  }

  const response = await fetch(
    `${CDEK_API}/v2/orders`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error(
      'CDEK CREATE ORDER ERROR:',
      data
    )
    throw new Error(
      'СДЭК не принял накладную'
    )
  }

  const request =
    Array.isArray(data?.requests)
      ? data.requests[0]
      : null

  if (
    request?.state &&
    request.state !== 'ACCEPTED'
  ) {
    console.error(
      'CDEK CREATE ORDER INVALID:',
      data
    )

    const message =
      request?.errors?.[0]?.message ||
      'СДЭК отклонил накладную'

    throw new Error(message)
  }

  const uuid = String(
    data?.entity?.uuid ?? ''
  )

  if (!uuid) {
    console.error(
      'CDEK CREATE ORDER WITHOUT UUID:',
      data
    )
    throw new Error(
      'СДЭК не вернул UUID накладной'
    )
  }

  /*
    После CREATE номер СДЭК может появиться
    не сразу. Пробуем один раз получить
    актуальную карточку заказа.
  */
  let cdekNumber: string | null = null

  try {
    const orderResponse = await fetch(
      `${CDEK_API}/v2/orders/${encodeURIComponent(
        uuid
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    )

    if (orderResponse.ok) {
      const orderData =
        await orderResponse.json()

      const value =
        orderData?.entity?.cdek_number

      if (value) {
        cdekNumber = String(value)
      }
    }
  } catch (error) {
    console.error(
      'CDEK NUMBER READ ERROR:',
      error
    )
  }

  return {
    uuid,
    cdekPrice,
    recipientDeliveryPrice,
    cdekNumber,
  }
}
