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

  const confirmationKey =
    `stock:confirmed:${reservationId}`

  const keys: string[] = [
    confirmationKey,
  ]

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

  /*
    Всё выполняется одной атомарной Redis-командой.

    Ключ stock:confirmed защищает от повторного
    списания, если Точка пришлёт один webhook
    несколько раз или fulfillOrder запустится повторно.
  */
  const script = `
    local confirmationKey = KEYS[1]
    local reservationId = ARGV[1]

    if redis.call('EXISTS', confirmationKey) == 1 then
      return 0
    end

    redis.call(
      'SET',
      confirmationKey,
      '1'
    )

    for i = 2, #KEYS, 2 do
      local itemIndex = (i / 2)
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
