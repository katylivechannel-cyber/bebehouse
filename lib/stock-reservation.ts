import { redis } from '@/lib/redis'

export const RESERVATION_SECONDS = 5 * 60

export type ReservationItem = {
  productId: string
  quantity: number
  stock: number
}

type ReserveResult =
  | {
      ok: true
    }
  | {
      ok: false
      productId: string
      available: number
    }

export async function reserveStock(
  reservationId: string,
  items: ReservationItem[]
): Promise<ReserveResult> {
  if (items.length === 0) {
    return {
      ok: false,
      productId: '',
      available: 0,
    }
  }

  const keys = items.map(
    (item) => `stock:reserved:${item.productId}`
  )

  const args: (string | number)[] = [
    RESERVATION_SECONDS,
    reservationId,
  ]

  for (const item of items) {
    args.push(item.stock, item.quantity)
  }

  const script = `
    local ttl = tonumber(ARGV[1])
    local reservationId = ARGV[2]

    for i = 1, #KEYS do
      local stock =
        tonumber(ARGV[2 + ((i - 1) * 2) + 1])

      local requested =
        tonumber(ARGV[2 + ((i - 1) * 2) + 2])

      local reserved =
        tonumber(redis.call('GET', KEYS[i]) or '0')

      local available = stock - reserved

      if requested > available then
        return {0, i, available}
      end
    end

    for i = 1, #KEYS do
      local requested =
        tonumber(ARGV[2 + ((i - 1) * 2) + 2])

      redis.call('INCRBY', KEYS[i], requested)
      redis.call('EXPIRE', KEYS[i], ttl)
    end

    return {1}
  `

  const result = await redis.eval<number[]>(
    script,
    keys,
    args
  )

  if (result[0] === 1) {
    await redis.setEx(
      `reservation:${reservationId}`,
      RESERVATION_SECONDS,
      {
        reservationId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        createdAt: new Date().toISOString(),
      }
    )

    return { ok: true }
  }

  const failedIndex = Number(result[1]) - 1
  const failedItem = items[failedIndex]

  return {
    ok: false,
    productId: failedItem?.productId ?? '',
    available: Math.max(Number(result[2]) || 0, 0),
  }
}
