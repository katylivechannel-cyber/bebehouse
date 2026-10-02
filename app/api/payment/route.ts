import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog'
import { redis } from '@/lib/redis'

type CartItem = {
  productId: string
  quantity: number
}

export async function POST(request: Request) {
  try {
    const { items, fullName, phone, email, cdekPoint } = await request.json() as {
  items: CartItem[]
  fullName: string
  phone: string
  email: string
  cdekPoint: string
}

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Корзина пуста' },
        { status: 400 }
      )
    }

    const { products } = await getCatalog()

    let total = 0

    for (const item of items) {
      const product = products.find(
        (product) => product.id === item.productId
      )

      if (!product) {
        return NextResponse.json(
          { error: 'Один из товаров больше недоступен' },
          { status: 400 }
        )
      }

      const quantity = Math.floor(Number(item.quantity))

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return NextResponse.json(
          { error: 'Некорректное количество товара' },
          { status: 400 }
        )
      }

      total += product.price * quantity
    }

    if (total <= 0) {
      return NextResponse.json(
        { error: 'Некорректная сумма заказа' },
        { status: 400 }
      )
    }

    const token = process.env.TOCHKA_JWT?.trim()
    const customerCode = process.env.TOCHKA_CUSTOMER_CODE

    if (!token || !customerCode) {
      return NextResponse.json(
        { error: 'Не настроены данные Точки' },
        { status: 500 }
      )
    }

    const response = await fetch(
      'https://enter.tochka.com/uapi/acquiring/v1.0/payments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          Data: {
            customerCode,
            amount: total,
            purpose: 'Заказ bébéhouse',
            paymentMode: ['sbp', 'card'],
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
const operationId = data.Data.operationId

const orderItems = items.map((item) => {
  const product = products.find(
    (product) => product.id === item.productId
  )!

  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity: item.quantity,
  }
})

await redis.set(`order:${operationId}`, {
  operationId,
  fullName,
  phone,
  email,
  cdekPoint,
  items: orderItems,
  total,
  status: 'pending',
  telegramSent: false,
  emailSent: false,
  createdAt: new Date().toISOString(),
})
    return NextResponse.json({
      paymentLink: data.Data.paymentLink,
      operationId: data.Data.operationId,
      total,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Не удалось создать оплату',
      },
      { status: 500 }
    )
  }
}
