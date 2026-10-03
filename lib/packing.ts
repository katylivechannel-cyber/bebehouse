import type { Product } from './catalog'

export type ShippingBox = {
  id: string
  name: string
  length: number
  width: number
  height: number
  emptyWeight: number
}

export type PackingItem = {
  product: Product
  quantity: number
}

export type PackingResult = {
  box: ShippingBox
  weight: number
  estimated: boolean
}

type Dimensions = {
  length: number
  width: number
  height: number
}

type Position = {
  x: number
  y: number
  z: number
}

type PlacedItem = Position & Dimensions

export const SHIPPING_BOXES: ShippingBox[] = [
  {
    id: 'box-27-16-5',
    name: '27 × 16 × 5',
    length: 27,
    width: 16,
    height: 5,
    emptyWeight: 100,
  },
  {
    id: 'box-20-20-20',
    name: '20 × 20 × 20',
    length: 20,
    width: 20,
    height: 20,
    emptyWeight: 150,
  },
  {
    id: 'box-35-20-15',
    name: '35 × 20 × 15',
    length: 35,
    width: 20,
    height: 15,
    emptyWeight: 180,
  },
  {
    id: 'box-30-25-17',
    name: '30 × 25 × 17',
    length: 30,
    width: 25,
    height: 17,
    emptyWeight: 180,
  },
  {
    id: 'box-30-30-20',
    name: '30 × 30 × 20',
    length: 30,
    width: 30,
    height: 20,
    emptyWeight: 220,
  },
  {
    id: 'box-40-30-20',
    name: '40 × 30 × 20',
    length: 40,
    width: 30,
    height: 20,
    emptyWeight: 280,
  },
  {
    id: 'box-30-8-25-3-37-7',
    name: '30.8 × 25.3 × 37.7',
    length: 30.8,
    width: 25.3,
    height: 37.7,
    emptyWeight: 320,
  },
]

const DEFAULT_PRODUCT = {
  weight: 500,
  length: 20,
  width: 15,
  height: 10,
}

// Оставляем примерно по 1 см между товаром
// и стенками коробки на пупырку.
const BOX_PADDING = 1

function volume(
  length: number,
  width: number,
  height: number
) {
  return length * width * height
}

function getProductData(product: Product) {
  const estimated =
    product.weight === null ||
    product.length === null ||
    product.width === null ||
    product.height === null

  let length =
    product.length ?? DEFAULT_PRODUCT.length

  let width =
    product.width ?? DEFAULT_PRODUCT.width

  let height =
    product.height ?? DEFAULT_PRODUCT.height

  // У 35-см кукол мягкие ноги подгибаются.
  if (product.packingGroup === 'кукла35') {
    length = 25
    width = 16
    height = 5
  }

  return {
    weight:
      product.weight ?? DEFAULT_PRODUCT.weight,
    length,
    width,
    height,
    estimated,
  }
}

function getOrientations(
  item: Dimensions
): Dimensions[] {
  const variants = [
    [item.length, item.width, item.height],
    [item.length, item.height, item.width],
    [item.width, item.length, item.height],
    [item.width, item.height, item.length],
    [item.height, item.length, item.width],
    [item.height, item.width, item.length],
  ]

  const unique = new Map<string, Dimensions>()

  for (const [length, width, height] of variants) {
    const key = `${length}-${width}-${height}`

    unique.set(key, {
      length,
      width,
      height,
    })
  }

  return [...unique.values()]
}

function overlaps(
  a: PlacedItem,
  b: PlacedItem
) {
  return !(
    a.x + a.length <= b.x ||
    b.x + b.length <= a.x ||
    a.y + a.width <= b.y ||
    b.y + b.width <= a.y ||
    a.z + a.height <= b.z ||
    b.z + b.height <= a.z
  )
}

function fitsInsideBox(
  item: PlacedItem,
  box: Dimensions
) {
  return (
    item.x >= 0 &&
    item.y >= 0 &&
    item.z >= 0 &&
    item.x + item.length <= box.length &&
    item.y + item.width <= box.width &&
    item.z + item.height <= box.height
  )
}

function tryPack(
  products: Dimensions[],
  box: ShippingBox
) {
  // Уменьшаем полезное пространство коробки
  // на 1 см с каждой стороны под упаковочный материал.
  const usableBox: Dimensions = {
    length: Math.max(
      0,
      box.length - BOX_PADDING * 2
    ),
    width: Math.max(
      0,
      box.width - BOX_PADDING * 2
    ),
    height: Math.max(
      0,
      box.height - BOX_PADDING * 2
    ),
  }

  const sortedProducts = [...products].sort(
    (a, b) =>
      volume(b.length, b.width, b.height) -
      volume(a.length, a.width, a.height)
  )

  const placed: PlacedItem[] = []

  for (const product of sortedProducts) {
    const positions: Position[] = [
      {
        x: 0,
        y: 0,
        z: 0,
      },
    ]

    // После каждого уже размещённого предмета
    // пробуем свободные позиции справа, спереди и сверху.
    for (const item of placed) {
      positions.push(
        {
          x: item.x + item.length,
          y: item.y,
          z: item.z,
        },
        {
          x: item.x,
          y: item.y + item.width,
          z: item.z,
        },
        {
          x: item.x,
          y: item.y,
          z: item.z + item.height,
        }
      )
    }

    let found: PlacedItem | null = null

    for (const position of positions) {
      for (const orientation of getOrientations(
        product
      )) {
        const candidate: PlacedItem = {
          ...position,
          ...orientation,
        }

        if (
          !fitsInsideBox(candidate, usableBox)
        ) {
          continue
        }

        const collision = placed.some(
          (other) =>
            overlaps(candidate, other)
        )

        if (!collision) {
          found = candidate
          break
        }
      }

      if (found) {
        break
      }
    }

    if (!found) {
      return false
    }

    placed.push(found)
  }

  return true
}

export function packOrder(
  items: PackingItem[]
): PackingResult | null {
  if (!items.length) {
    return null
  }

  const products: Dimensions[] = []

  let totalProductWeight = 0
  let estimated = false

  for (const item of items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 20
    ) {
      return null
    }

    const data =
      getProductData(item.product)

    if (data.estimated) {
      estimated = true
    }

    totalProductWeight +=
      data.weight * item.quantity

    for (
      let i = 0;
      i < item.quantity;
      i++
    ) {
      products.push({
        length: data.length,
        width: data.width,
        height: data.height,
      })
    }
  }

  // Сначала самые маленькие коробки.
  const boxes = [...SHIPPING_BOXES].sort(
    (a, b) =>
      volume(
        a.length,
        a.width,
        a.height
      ) -
      volume(
        b.length,
        b.width,
        b.height
      )
  )

  for (const box of boxes) {
    if (tryPack(products, box)) {
      return {
        box,
        weight:
          totalProductWeight +
          box.emptyWeight,
        estimated,
      }
    }
  }

  // Если ничего не подошло — заказ всё равно
  // можно оформить. Доставку рассчитаем после упаковки.
  return null
}
