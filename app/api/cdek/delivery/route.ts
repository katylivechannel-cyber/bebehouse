import { NextRequest, NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog'
import { packOrder } from '@/lib/packing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const cityCode = Number(body.cityCode)
    const items = Array.isArray(body.items) ? body.items : []

    if (!Number.isFinite(cityCode) || cityCode <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Некорректный город',
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
    }

    const packing = packOrder(packingItems)

    // Если упаковщик не смог подобрать коробку,
    // не придумываем стоимость доставки.
    if (!packing) {
      return NextResponse.json({
        success: true,
        calculated: false,
      })
    }

    const baseUrl = request.nextUrl.origin

    const response = await fetch(
      `${baseUrl}/api/cdek/calculate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityCode,
          weight: packing.weight,
          length: packing.box.length,
          width: packing.box.width,
          height: packing.box.height,
        }),
        cache: 'no-store',
      }
    )

    const data = await response.json()

    if (
      !response.ok ||
      !data.success ||
      !data.delivery
    ) {
      return NextResponse.json({
        success: true,
        calculated: false,
      })
    }

    return NextResponse.json({
      success: true,
      calculated: true,

      delivery: {
        price: data.delivery.customerPrice,
        periodMin: data.delivery.periodMin,
        periodMax: data.delivery.periodMax,
      },

      packing: {
        box: packing.box.name,
        weight: packing.weight,
        estimated: packing.estimated,
      },
    })
  } catch (error) {
    console.error('CDEK delivery error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Не удалось рассчитать доставку',
      },
      { status: 500 }
    )
  }
}
