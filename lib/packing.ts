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

// Для нескольких разных групп товаров
// не используем коробку на 100% математического объёма.
const MAX_VOLUME_USAGE = 0.8

// Пупырка примерно по 1 см с каждой стороны.
// Эти 2 см добавляются к СТОПКЕ одинаковых товаров,
// а не к каждому экземпляру отдельно.
const PACKING_PADDING = 2

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
  return [length, width, height].sort((a, b) => a - b)
}

function itemFitsBox(
  itemLength: number,
  itemWidth: number,
  itemHeight: number,
  box: ShippingBox
) {
  const item = sortedDimensions(
    itemLength,
    itemWidth,
    itemHeight
  )

  const boxDimensions = sortedDimensions(
    box.length,
    box.width,
    box.height
  )

  return (
    item[0] <= boxDimensions[0] &&
    item[1] <= boxDimensions[1] &&
    item[2] <= boxDimensions[2]
  )
}

// Получаем реальные размеры одного товара.
// Здесь пупырку пока НЕ добавляем.
function getProductBaseData(product: Product) {
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

// Собираем несколько одинаковых товаров в одну стопку.
// Выбираем наиболее компактный вариант:
// можно складывать по длине, ширине или высоте.
function makeProductStack(
  product: Product,
  quantity: number
) {
  const data = getProductBaseData(product)

  const variants = [
    {
      length: data.length * quantity,
      width: data.width,
      height: data.height,
    },
    {
      length: data.length,
      width: data.width * quantity,
      height: data.height,
    },
    {
      length: data.length,
      width: data.width,
      height: data.height * quantity,
    },
  ]

  // Выбираем вариант с наименьшей самой длинной стороной.
  // При равенстве — с меньшей второй стороной.
  variants.sort((a, b) => {
    const aDims = sortedDimensions(
      a.length,
      a.width,
      a.height
    ).reverse()

    const bDims = sortedDimensions(
      b.length,
      b.width,
      b.height
    ).reverse()

    if (aDims[0] !== bDims[0]) {
      return aDims[0] - bDims[0]
    }

    return aDims[1] - bDims[1]
  })

  const best = variants[0]

  return {
    // Пупырку добавляем один раз вокруг всей стопки.
    length: best.length + PACKING_PADDING,
    width: best.width + PACKING_PADDING,
    height: best.height + PACKING_PADDING,

    weight: data.weight * quantity,
    estimated: data.estimated,
  }
}

export function packOrder(
  items: PackingItem[]
): PackingResult | null {
  if (!items.length) return null

  let totalProductVolume = 0
  let totalProductWeight = 0
  let estimated = false

  const stacks: {
    length: number
    width: number
    height: number
  }[] = []

  for (const item of items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 20
    ) {
      return null
    }

    const stack = makeProductStack(
      item.product,
      item.quantity
    )

    if (stack.estimated) {
      estimated = true
    }

    totalProductWeight += stack.weight

    totalProductVolume += volume(
      stack.length,
      stack.width,
      stack.height
    )

    stacks.push({
      length: stack.length,
      width: stack.width,
      height: stack.height,
    })
  }

  // От самой маленькой коробки к самой большой.
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
    // Каждая стопка должна физически помещаться
    // в коробку с учётом поворота.
    const everyStackFits = stacks.every(
      (stack) =>
        itemFitsBox(
          stack.length,
          stack.width,
          stack.height,
          box
        )
    )

    if (!everyStackFits) {
      continue
    }

    const boxVolume = volume(
      box.length,
      box.width,
      box.height
    )

    // Если в заказе только одна группа одинакового товара,
    // достаточно того, что стопка физически помещается.
    if (stacks.length === 1) {
      return {
        box,
        weight:
          totalProductWeight +
          box.emptyWeight,
        estimated,
      }
    }

    // Если товаров разных несколько —
    // оставляем дополнительный запас на укладку.
    const usableVolume =
      boxVolume * MAX_VOLUME_USAGE

    if (
      totalProductVolume <= usableVolume
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

  return null
}
