import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog'
import { packOrder } from '@/lib/packing'

export async function GET() {
  try {
    const { products } = await getCatalog()

    const results = products.map((product) => {
      const result = packOrder([
        {
          product,
          quantity: 1,
        },
      ])

      return {
        id: product.id,
        product: product.name,
        packingGroup: product.packingGroup,

        productData: {
          weight: product.weight,
          length: product.length,
          width: product.width,
          height: product.height,
        },

        result: result
          ? {
              box: result.box.name,
              shippingWeight: result.weight,
              estimated: result.estimated,
            }
          : 'НЕ ПОМЕСТИЛСЯ',
      }
    })

    return NextResponse.json({
      products: results,
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
