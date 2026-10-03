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

// Все реальные коробки bébéhouse.
// Порядок здесь не важен — ниже они автоматически сортируются
// от меньшей к большей.
export const SHIPPING_BOXES: ShippingBox[] = [
  {
    id: 'stickers',
    name: '27 × 16 × 5',
    length: 27,
    width: 16,
    height: 5,
    emptyWeight: 100,
  },
  {
    id: 'cubes',
    name: '20 × 20 × 20',
    length: 20,
    width: 20,
    height: 20,
    emptyWeight: 150,
  },
  {
    id: 'dolls',
    name: '35 × 20 × 15',
    length: 35,
    width: 20,
    height: 15,
    emptyWeight: 180,
  },
  {
    id: 'popular',
    name: '30 × 25 × 17',
    length: 30,
    width: 25,
    height: 17,
    emptyWeight: 180,
  },
  {
    id: 'medium',
    name: '30 × 30 × 20',
    length: 30,
    width: 30,
    height: 20,
    emptyWeight: 220,
  },
  {
    id: 'large',
    name: '40 × 30 × 20',
    length: 40,
    width: 30,
    height: 20,
    emptyWeight: 280,
  },
  {
    id: 'large-tall',
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

// Оставляем внутри коробки запас.
// Это защищает от слишком оптимистичного расчёта.
const MAX_VOLUME_USAGE = 0.75

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

// Проверяем, может ли предмет физически войти в коробку.
// Поворот предмета разрешён.
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

function findBox(id: string) {
  return SHIPPING_BOXES.find((box) => box.id === id)
}

export function packOrder(
  items: PackingItem[]
): PackingResult | null {
  if (!items.length) return null

  // -----------------------------
  // СПЕЦИАЛЬНЫЕ ПРАВИЛА
  // -----------------------------

  const totalQuantity = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  const groups = items.map(
    (item) => item.product.packingGroup
  )

  // Только наклейки
  if (groups.every((group) => group === 'наклейки')) {
    const box = findBox('stickers')

    if (box) {
      const productsWeight = items.reduce(
        (sum, item) => {
          const data = getProductShippingData(item.product)

          return sum + data.weight * item.quantity
        },
        0
      )

      return {
        box,
        weight: productsWeight + box.emptyWeight,
        estimated: items.some(
          (item) =>
            getProductShippingData(item.product).estimated
        ),
      }
    }
  }

  // Кубики — отдельная коробка.
  // Пока правило рассчитано на одну упаковку кубиков.
  if (
    items.length === 1 &&
    groups[0] === 'кубики' &&
    totalQuantity === 1
  ) {
    const box = findBox('cubes')

    if (box) {
      const data = getProductShippingData(items[0].product)

      return {
        box,
        weight: data.weight + box.emptyWeight,
        estimated: data.estimated,
      }
    }
  }

  // Куклы 35 см — до трёх штук помещаются
  // в коробку 35 × 20 × 15.
  if (
    groups.every((group) => group === 'кукла35') &&
    totalQuantity <= 3
  ) {
    const box = findBox('dolls')

    if (box) {
      const productsWeight = items.reduce(
        (sum, item) => {
          const data = getProductShippingData(item.product)

          return sum + data.weight * item.quantity
        },
        0
      )

      return {
        box,
        weight: productsWeight + box.emptyWeight,
        estimated: items.some(
          (item) =>
            getProductShippingData(item.product).estimated
        ),
      }
    }
  }

  // -----------------------------
  // ОБЫЧНЫЙ АЛГОРИТМ
  // -----------------------------

  let totalProductVolume = 0
  let totalProductWeight = 0
  let estimated = false

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

  // Сортируем именно по полезному объёму коробки:
  // от самой маленькой к самой большой.
  const boxes = [...SHIPPING_BOXES].sort(
    (a, b) =>
      volume(a.length, a.width, a.height) -
      volume(b.length, b.width, b.height)
  )

  for (const box of boxes) {
    // Специализированные коробки не используем
    // для обычных смешанных заказов.
    if (
      box.id === 'stickers' ||
      box.id === 'cubes' ||
      box.id === 'dolls'
    ) {
      continue
    }

    // Каждый товар должен хотя бы сам по себе
    // физически помещаться в эту коробку.
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

    const usableVolume =
      volume(box.length, box.width, box.height) *
      MAX_VOLUME_USAGE

    if (totalProductVolume <= usableVolume) {
      return {
        box,
        weight:
          totalProductWeight + box.emptyWeight,
        estimated,
      }
    }
  }

  // Если ни одна коробка не подошла —
  // ничего не выдумываем.
  return null
}
