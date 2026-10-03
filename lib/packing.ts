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
  flexible: boolean
}

type Position = {
  x: number
  y: number
  z: number
}

type PlacedItem = Position & {
  length: number
  width: number
  height: number
}

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

// Оставляем примерно по 1 см от стенок
// коробки под пупырчатую плёнку.
const BOX_PADDING = 1

// Для гибких товаров разрешаем запасную
// проверку по объёму, максимум 80% коробки.
const MAX_VOLUME_USAGE = 0.8

function volume(
  length: number,
  width: number,
  height: number
) {
  return length * width * height
}

function sortedDimensions(
  length: number,
  width: number,
  height: number
) {
  return [length, width, height].sort(
    (a, b) => a - b
  )
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

  let flexible = false

  // У 35-см кукол мягкие ноги.
  // Их можно подогнуть при упаковке.
  if (product.packingGroup === 'кукла35') {
    length = 25
    width = 16
    height = 5
    flexible = true
  }

  return {
    weight:
      product.weight ?? DEFAULT_PRODUCT.weight,
    length,
    width,
    height,
    estimated,
    flexible,
  }
}

function getOrientations(
  item: Dimensions
) {
  const variants = [
    [item.length, item.width, item.height],
    [item.length, item.height, item.width],
    [item.width, item.length, item.height],
    [item.width, item.height, item.length],
    [item.height, item.length, item.width],
    [item.height, item.width, item.length],
  ]

  const unique = new Map<
    string,
    {
      length: number
      width: number
      height: number
    }
  >()

  for (const [length, width, height] of variants) {
    const key =
      `${length}-${width}-${height}`

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
  box: {
    length: number
    width: number
    height: number
  }
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

function tryExactPack(
  products: Dimensions[],
  box: ShippingBox
) {
  const usableBox = {
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
      volume(
        b.length,
        b.width,
        b.height
      ) -
      volume(
        a.length,
        a.width,
        a.height
      )
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
      for (
        const orientation of
        getOrientations(product)
      ) {
        const candidate: PlacedItem = {
          ...position,
          ...orientation,
        }

        if (
          !fitsInsideBox(
            candidate,
            usableBox
          )
        ) {
          continue
        }

        const collision =
          placed.some((other) =>
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

// Запасная проверка применяется ТОЛЬКО,
// если в заказе есть гибкий товар.
//
// Жёсткие товары (например кубики)
// не могут попасть в коробку только потому,
// что математически хватает объёма.
function tryFlexibleFallback(
  products: Dimensions[],
  box: ShippingBox
) {
  const hasFlexibleProduct =
    products.some(
      (product) => product.flexible
    )

  if (!hasFlexibleProduct) {
    return false
  }

  const usableBox = {
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

  const usableBoxDimensions =
    sortedDimensions(
      usableBox.length,
      usableBox.width,
      usableBox.height
    )

  // Каждый товар всё равно должен
  // по отдельности физически помещаться.
  const everyProductFits =
    products.every((product) => {
      const productDimensions =
        sortedDimensions(
          product.length,
          product.width,
          product.height
        )

      return (
        productDimensions[0] <=
          usableBoxDimensions[0] &&
        productDimensions[1] <=
          usableBoxDimensions[1] &&
        productDimensions[2] <=
          usableBoxDimensions[2]
      )
    })

  if (!everyProductFits) {
    return false
  }

  const totalProductVolume =
    products.reduce(
      (sum, product) =>
        sum +
        volume(
          product.length,
          product.width,
          product.height
        ),
      0
    )

  const boxVolume = volume(
    box.length,
    box.width,
    box.height
  )

  return (
    totalProductVolume <=
    boxVolume * MAX_VOLUME_USAGE
  )
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
        flexible: data.flexible,
      })
    }
  }

  // От самой маленькой коробки
  // к самой большой по объёму.
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
    // Сначала нормальная 3D-проверка.
    const exactFit =
      tryExactPack(products, box)

    if (exactFit) {
      return {
        box,
        weight:
          totalProductWeight +
          box.emptyWeight,
        estimated,
      }
    }

    // Если точная раскладка не получилась,
    // fallback разрешён только для заказов,
    // где есть гибкий товар.
    const flexibleFit =
      tryFlexibleFallback(
        products,
        box
      )

    if (flexibleFit) {
      return {
        box,
        weight:
          totalProductWeight +
          box.emptyWeight,
        estimated,
      }
    }
  }

  return null
}
