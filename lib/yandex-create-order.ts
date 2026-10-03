const YANDEX_API =
  'https://b2b-authproxy.taxi.yandex.net'

const YANDEX_SOURCE_STATION_ID =
  '019e847bdc4a75fa9635a79723f409b8'

type YandexItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

type YandexPacking = {
  box: string
  length: number
  width: number
  height: number
  weight: number
  fallbackXL: boolean
}

export type CreateYandexOrderInput = {
  orderNumber: number
  fullName: string
  phone: string
  email: string
  destinationStationId: string
  items: YandexItem[]
  productsTotal: number
  packing: YandexPacking
}

export type CreateYandexOrderResult = {
  requestId: string
}

function splitFullName(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  /*
    В форме у нас одно поле ФИО.
    Для обычного российского ФИО:
    Фамилия Имя Отчество.
  */
  const lastName = parts[0] || ''
  const firstName = parts[1] || parts[0] || ''
  const patronymic =
    parts.length > 2
      ? parts.slice(2).join(' ')
      : ''

  return {
    firstName,
    lastName:
      parts.length > 1
        ? lastName
        : '',
    patronymic,
  }
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 11) {
    if (digits.startsWith('8')) {
      return `+7${digits.slice(1)}`
    }

    if (digits.startsWith('7')) {
      return `+${digits}`
    }
  }

  if (digits.length === 10) {
    return `+7${digits}`
  }

  return phone.trim()
}

export async function createYandexOrder(
  input: CreateYandexOrderInput
): Promise<CreateYandexOrderResult> {
  const token =
    process.env.YANDEX_DELIVERY_TOKEN

  const sellerInn =
    process.env.YANDEX_SELLER_INN?.replace(
      /\s/g,
      ''
    )

  if (!token) {
    throw new Error(
      'Не настроен YANDEX_DELIVERY_TOKEN'
    )
  }

  if (!sellerInn) {
    throw new Error(
      'Не настроен YANDEX_SELLER_INN'
    )
  }

  if (!/^\d{10}(\d{2})?$/.test(sellerInn)) {
    throw new Error(
      'Некорректный YANDEX_SELLER_INN'
    )
  }

  if (!input.destinationStationId) {
    throw new Error(
      'Не выбран ПВЗ Яндекс Доставки'
    )
  }

  if (
    !input.packing ||
    input.packing.fallbackXL
  ) {
    throw new Error(
      'Нельзя автоматически создать Яндекс Доставку: упаковка рассчитана приблизительно'
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

  const {
    firstName,
    lastName,
    patronymic,
  } = splitFullName(input.fullName)

  const placeBarcode =
    `BEBEHOUSE-${input.orderNumber}-1`

  const items = input.items.map(
    (item) => ({
      count: item.quantity,
      name: item.name.slice(0, 255),
      article: item.productId,
      billing_details: {
        inn: sellerInn,
        nds: -1,
        unit_price:
          Math.round(item.price * 100),
        assessed_unit_price:
          Math.round(item.price * 100),
      },
      place_barcode: placeBarcode,
      fitting: false,
      refused_count: 0,
    })
  )

  const recipientInfo: Record<
    string,
    string
  > = {
    first_name: firstName,
    phone: normalizePhone(input.phone),
  }

  if (lastName) {
    recipientInfo.last_name = lastName
  }

  if (patronymic) {
    recipientInfo.patronymic =
      patronymic
  }

  if (input.email) {
    recipientInfo.email =
      input.email.trim()
  }

  const payload = {
    info: {
      /*
        Должен быть уникальным для заказа.
        При повторной попытке используем тот же
        номер bébéhouse.
      */
      operator_request_id:
        `BEBEHOUSE-${input.orderNumber}`,

      comment:
        `Заказ bébéhouse №${input.orderNumber}`,
    },

    source: {
      platform_station: {
        platform_id:
          YANDEX_SOURCE_STATION_ID,
      },
    },

    destination: {
      type: 'platform_station',
      platform_station: {
        platform_id:
          input.destinationStationId,
      },
    },

    items,

    places: [
      {
        physical_dims: {
          weight_gross:
            input.packing.weight,
          dx:
            input.packing.length,
          dy:
            input.packing.width,
          dz:
            input.packing.height,
        },
        barcode: placeBarcode,
      },
    ],

    billing_info: {
      /*
        Товар + доставка уже оплачены
        покупателем через Точку.
        При получении Яндекс не должен
        брать с покупателя деньги.
      */
      payment_method: 'already_paid',
      delivery_cost: 0,
    },

    recipient_info: recipientInfo,

    last_mile_policy: 'self_pickup',

    particular_items_refuse: false,
    forbid_unboxing: false,
  }

  const response = await fetch(
    `${YANDEX_API}/api/b2b/platform/request/create`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type':
          'application/json',
        'Accept-Language': 'ru',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error(
      'YANDEX CREATE ORDER ERROR:',
      data
    )

    throw new Error(
      data?.message ||
        data?.code ||
        'Яндекс не принял отправление'
    )
  }

  const requestId = String(
    data?.request_id ?? ''
  )

  if (!requestId) {
    console.error(
      'YANDEX CREATE ORDER WITHOUT ID:',
      data
    )

    throw new Error(
      'Яндекс не вернул request_id'
    )
  }

  return {
    requestId,
  }
}
