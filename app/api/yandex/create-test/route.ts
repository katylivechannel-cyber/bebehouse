import { NextResponse } from 'next/server'
import {
  createYandexOrder,
} from '@/lib/yandex-create-order'

export const dynamic = 'force-dynamic'

const TEST = {
  destinationStationId:
    '40162d04-b84a-4b08-ab3e-d91923b76ec2',
  destination:
    'Санкт-Петербург, Русановская улица, 18 к3',

  /*
    Тестовые данные получателя — те же,
    что использовали для проверки СДЭК.
  */
  fullName:
    'Егорова Екатерина Валерьевна',
  phone:
    '+79618560931',

  package: {
    weight: 1050,
    length: 20,
    width: 20,
    height: 20,
  },

  product: {
    productId: 'YANDEX-TEST-10',
    name: 'Тестовый товар bébéhouse',
    price: 10,
    quantity: 1,
  },
}

export async function GET(
  request: Request
) {
  const url = new URL(request.url)

  const confirmed =
    url.searchParams.get('confirm') ===
    'CREATE'

  if (!confirmed) {
    return NextResponse.json({
      success: true,
      created: false,
      message:
        'Это предварительный просмотр. Ничего не создано. Чтобы создать реальную тестовую отправку, добавьте ?confirm=CREATE',
      test: {
        destination:
          TEST.destination,
        destinationStationId:
          TEST.destinationStationId,
        recipient:
          TEST.fullName,
        phone:
          TEST.phone,
        package:
          `${TEST.package.length} × ${TEST.package.width} × ${TEST.package.height} см`,
        weight:
          `${TEST.package.weight} г`,
        productPrice:
          `${TEST.product.price} ₽`,
        payment:
          'already_paid — с получателя 0 ₽',
      },
    })
  }

  /*
    Уникальный номер нужен Яндексу
    для operator_request_id.
    Date.now() используется только в
    ручном тестовом маршруте.
  */
  const testOrderNumber =
    Number(
      String(Date.now()).slice(-9)
    )

  try {
    const result =
      await createYandexOrder({
        orderNumber:
          testOrderNumber,
        fullName:
          TEST.fullName,
        phone:
          TEST.phone,
        email: '',
        destinationStationId:
          TEST.destinationStationId,
        items: [
          TEST.product,
        ],
        productsTotal:
          TEST.product.price,
        packing: {
          box: '20 × 20 × 20',
          length:
            TEST.package.length,
          width:
            TEST.package.width,
          height:
            TEST.package.height,
          weight:
            TEST.package.weight,
          fallbackXL: false,
        },
      })

    return NextResponse.json({
      success: true,
      created: true,
      test: {
        orderNumber:
          testOrderNumber,
        destination:
          TEST.destination,
        destinationStationId:
          TEST.destinationStationId,
        recipient:
          TEST.fullName,
        phone:
          TEST.phone,
        package:
          `${TEST.package.length} × ${TEST.package.width} × ${TEST.package.height} см`,
        weight:
          `${TEST.package.weight} г`,
        productPrice:
          `${TEST.product.price} ₽`,
        payment:
          'already_paid — с получателя 0 ₽',
      },
      yandex: result,
    })
  } catch (error: any) {
    console.error(
      'YANDEX CREATE TEST ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        created: false,
        error:
          error?.message ||
          'Не удалось создать тестовую отправку Яндекс',
      },
      {
        status: 500,
      }
    )
  }
}
