import { NextResponse } from 'next/server'
import { getCatalog, Product } from '@/lib/catalog'
import { packOrder } from '@/lib/packing'

type TestItem = {
  product: Product
  quantity: number
}

function makeResult(
  name: string,
  items: TestItem[]
) {
  const result = packOrder(items)

  return {
    test: name,

    items: items.map((item) => ({
      product: item.product.name,
      quantity: item.quantity,
      dimensions: {
        length: item.product.length,
        width: item.product.width,
        height: item.product.height,
      },
      weight: item.product.weight,
    })),

    result: result
      ? {
          box: result.box.name,
          shippingWeight: result.weight,
          estimated: result.estimated,
        }
      : 'НЕ ПОМЕСТИЛСЯ',
  }
}

export async function GET() {
  try {
    const { products } = await getCatalog()

    // Берём товары из твоего реального каталога
    const doll = products.find(
      (product) => product.id === 'rosa-little-dutch'
    )

    const drum = products.find(
      (product) => product.id === 'drum-little-dutch'
    )

    const cubes = products.find(
      (product) =>
        product.id === 'tower-fairy-garden-little-dutch'
    )

    const bandages = products.find(
      (product) => product.id === 'bandage-konges-slojd'
    )

    if (!doll || !drum || !cubes || !bandages) {
      return NextResponse.json(
        {
          error:
            'Не удалось найти один из тестовых товаров в каталоге',
        },
        {
          status: 400,
        }
      )
    }

    const tests = [
      makeResult('1 кукла', [
        {
          product: doll,
          quantity: 1,
        },
      ]),

      makeResult('2 куклы', [
        {
          product: doll,
          quantity: 2,
        },
      ]),

      makeResult('3 куклы', [
        {
          product: doll,
          quantity: 3,
        },
      ]),

      makeResult('Кукла + барабан', [
        {
          product: doll,
          quantity: 1,
        },
        {
          product: drum,
          quantity: 1,
        },
      ]),

      makeResult('1 кубики', [
        {
          product: cubes,
          quantity: 1,
        },
      ]),

      makeResult('2 кубиков', [
        {
          product: cubes,
          quantity: 2,
        },
      ]),

      makeResult('3 кубиков', [
        {
          product: cubes,
          quantity: 3,
        },
      ]),

      makeResult('5 пластырей', [
        {
          product: bandages,
          quantity: 5,
        },
      ]),

      makeResult('Кукла + кубики + барабан', [
        {
          product: doll,
          quantity: 1,
        },
        {
          product: cubes,
          quantity: 1,
        },
        {
          product: drum,
          quantity: 1,
        },
      ]),
    ]

    return NextResponse.json({
      tests,
    })
  } catch (error) {
    console.error('Packing test failed:', error)

    return NextResponse.json(
      {
        error: 'Не удалось проверить упаковку',
      },
      {
        status: 500,
      }
    )
  }
}
