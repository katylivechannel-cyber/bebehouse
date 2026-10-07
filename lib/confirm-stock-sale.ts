import { redis } from '@/lib/redis'

type OrderItem = {
  productId: string
  quantity: number
}

export async function confirmStockSale(
  reservationId: string,
  items: OrderItem[]
) {
  if (!reservationId || items.length === 0) {
    return
  }

  const keys: string[] = []

  for (const item of items) {
    keys.push(
      `stock:reservations:${item.productId}`,
      `stock:sold:${item.productId}`
    )
  }

  const args: (string | number)[] = [
    reservationId,
  ]

  for (const item of items) {
    args.push(item.quantity)
  }

  const script = `
    local reservationId = ARGV[1]

    for i = 1, #KEYS, 2 do
      local itemIndex = ((i + 1) / 2)
      local quantity =
        tonumber(ARGV[itemIndex + 1])

      local reservationKey = KEYS[i]
      local soldKey = KEYS[i + 1]

      local member =
        reservationId .. '|' .. quantity

      redis.call(
        'ZREM',
        reservationKey,
        member
      )

      redis.call(
        'INCRBY',
        soldKey,
        quantity
      )
    end

    return 1
  `

  await redis.eval(
    script,
    keys,
    args
  )

  await redis.del(
    `reservation:${reservationId}`
  )
}
