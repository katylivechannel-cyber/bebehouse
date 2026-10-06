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

type ProductForPacking = Dimensions & {
  flexible: boolean
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
    name: '27 × 16.5 × 5',
    length: 27,
    width: 16.5,
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

// Оставляем примерно по 1 см от стенок коробки
// под пупырчатую плёнку.
const BOX_PADDING = 1

// Только для гибких товаров (например кукол)
// разрешаем запасную проверку по объёму.
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

  // У 35-см кукол мягкие ноги,
  // поэтому их можно подогнуть.
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
    flexible,
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

function uniquePositions(
  positions: Position[]
) {
  const map = new Map<string, Position>()

  for (const position of positions) {
    const key =
      `${position.x}-${position.y}-${position.z}`

    map.set(key, position)
  }

  return [...map.values()]
}

// Пробуем разместить товары в одном конкретном порядке.
function tryPackInOrder(
  products: ProductForPacking[],
  box: ShippingBox
) {
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

  const placed: PlacedItem[] = []

  for (const product of products) {
    let positions: Position[] = [
      {
        x: 0,
        y: 0,
        z: 0,
      },
    ]

    // Пробуем позиции около всех граней
    // уже размещённых товаров.
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
        },
        {
          x: item.x + item.length,
          y: 0,
          z: 0,
        },
        {
          x: 0,
          y: item.y + item.width,
          z: 0,
        },
        {
          x: 0,
          y: 0,
          z: item.z + item.height,
        }
      )
    }

    positions = uniquePositions(positions)

    // Сначала пробуем позиции ближе к углу коробки.
    positions.sort(
      (a, b) =>
        a.z - b.z ||
        a.y - b.y ||
        a.x - b.x
    )

    let found: PlacedItem | null = null

    for (const position of positions) {
      for (
        const orientation of
        getOrientations(product)
      ) {
        const candidate: PlacedItem = {
          x: position.x,
          y: position.y,
          z: position.z,
          length: orientation.length,
          width: orientation.width,
          height: orientation.height,
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

// Пробуем несколько разумных порядков.
// Это важно: одна и та же комбинация может не
// сложиться в одном порядке, но сложиться в другом.
function tryExactPack(
  products: ProductForPacking[],
  box: ShippingBox
) {
  const byVolumeDescending =
    [...products].sort(
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

  const byLongestSideDescending =
    [...products].sort((a, b) => {
      const aLongest = Math.max(
        a.length,
        a.width,
        a.height
      )

      const bLongest = Math.max(
        b.length,
        b.width,
        b.height
      )

      return bLongest - aLongest
    })

  const byHeightDescending =
    [...products].sort(
      (a, b) => b.height - a.height
    )

  const bySmallestFirst =
    [...byVolumeDescending].reverse()

  const orders = [
    byVolumeDescending,
    byLongestSideDescending,
    byHeightDescending,
    bySmallestFirst,
  ]

  for (const order of orders) {
    if (tryPackInOrder(order, box)) {
      return true
    }
  }

  return false
}

// Запасной вариант нужен только для гибких товаров.
// Например, кукла в жизни может согнуться так,
// как прямоугольник в математической модели не умеет.
function tryFlexibleFallback(
  products: ProductForPacking[],
  box: ShippingBox
) {
  const hasFlexibleProduct =
    products.some(
      (product) => product.flexible
    )

  if (!hasFlexibleProduct) {
    return false
  }

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

  const boxDimensions =
    sortedDimensions(
      usableBox.length,
      usableBox.width,
      usableBox.height
    )

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
          boxDimensions[0] &&
        productDimensions[1] <=
          boxDimensions[1] &&
        productDimensions[2] <=
          boxDimensions[2]
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

  // Специальная упаковка, если в заказе
  // только один товар в количестве 1 шт.
  if (
    items.length === 1 &&
    items[0].quantity === 1
  ) {
    const product = items[0].product
    const data = getProductData(product)

    // Коляски не кладём в коробку.
    // Оборачиваем пупырчатой плёнкой:
    // +2 см к каждому габариту.
    if (product.packingGroup === 'коляска') {
      return {
        box: {
          id: 'stroller-wrap',
          name: 'Коляска — пупырчатая плёнка',
          length: data.length + 2,
          width: data.width + 2,
          height: data.height + 2,
          emptyWeight: 0,
        },
        weight: data.weight,
        estimated: data.estimated,
      }
    }

    // Чайный набор отправляется
    // в собственной коробке.
    if (product.packingGroup === 'чайный-набор') {
      return {
        box: {
          id: 'tea-set-own-box',
          name: 'Чайный набор — своя коробка',
          length: data.length,
          width: data.width,
          height: data.height,
          emptyWeight: 0,
        },
        weight: data.weight,
        estimated: data.estimated,
      }
    }
  }

  const products: ProductForPacking[] = []

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

  // Всегда начинаем с самой маленькой
  // подходящей коробки по объёму.
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
    if (tryExactPack(products, box)) {
      return {
        box,
        weight:
          totalProductWeight +
          box.emptyWeight,
        estimated,
      }
    }

    if (
      tryFlexibleFallback(
        products,
        box
      )
    ) {
      return {
        box,
        weight:
          totalProductWeight +
          box.emptyWeight,
        estimated,
      }
    }
  }

  // Если алгоритм всё равно не уверен,
  // заказ не блокируем.
  // Стоимость СДЭК определим после упаковки.
  return null
}
