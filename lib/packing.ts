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

// Для нескольких товаров оставляем запас,
// потому что реальные предметы не складываются как жидкость :)
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

function getProductShippingData(product: Product) {
  const estimated =
    product.weight === null ||
    product.length === null ||
    product.width === null ||
    product.height === null

  return {
    weight: product.weight ?? DEFAULT_PRODUCT.weight,
    length: product.length ?? DEFAULT_PRODUCT.length,
    width: product.width ?? DEFAULT_PRODUCT.width,
    height: product.height ?? DEFAULT_PRODUCT.height,
    estimated,
  }
}

export function packOrder(
  items: PackingItem[]
): PackingResult | null {
  if (!items.length) return null

  let totalProductVolume = 0
  let totalProductWeight = 0
  let estimated = false
  let totalQuantity = 0

  const expandedProducts: {
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

    const data = getProductShippingData(item.product)

    if (data.estimated) {
      estimated = true
    }

    totalQuantity += item.quantity

    totalProductWeight +=
      data.weight * item.quantity

    totalProductVolume +=
      volume(data.length, data.width, data.height) *
      item.quantity

    for (let i = 0; i < item.quantity; i++) {
      expandedProducts.push({
        length: data.length,
        width: data.width,
        height: data.height,
      })
    }
  }

  // Все коробки доступны для любых товаров.
  // Сортируем от самой маленькой по объёму
  // к самой большой.
  const boxes = [...SHIPPING_BOXES].sort(
    (a, b) =>
      volume(a.length, a.width, a.height) -
      volume(b.length, b.width, b.height)
  )

  for (const box of boxes) {
    // Каждый предмет должен физически входить
    // в выбранную коробку с учётом поворота.
    const everyItemFits = expandedProducts.every(
      (item) =>
        itemFitsBox(
          item.length,
          item.width,
          item.height,
          box
        )
    )

    if (!everyItemFits) {
      continue
    }

    const boxVolume = volume(
      box.length,
      box.width,
      box.height
    )

    // Если товар всего один и он физически входит —
    // дополнительный запас по объёму не нужен.
    if (totalQuantity === 1) {
      return {
        box,
        weight:
          totalProductWeight + box.emptyWeight,
        estimated,
      }
    }

    // Для нескольких товаров используем запас,
    // чтобы алгоритм не пытался набить коробку
    // на 100% математического объёма.
    const usableVolume =
      boxVolume * MAX_VOLUME_USAGE

    if (totalProductVolume <= usableVolume) {
      return {
        box,
        weight:
          totalProductWeight + box.emptyWeight,
        estimated,
      }
    }
  }

  return null
}
