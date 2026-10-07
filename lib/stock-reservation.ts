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

  const now = Date.now()
  const expiresAt =
    now + RESERVATION_SECONDS * 1000

  const keys = items.map(
    (item) => `stock:reservations:${item.productId}`
  )

  const args: (string | number)[] = [
    now,
    expiresAt,
    reservationId,
  ]

  for (const item of items) {
    args.push(item.stock, item.quantity)
  }

  const script = `
    local now = tonumber(ARGV[1])
    local expiresAt = tonumber(ARGV[2])
    local reservationId = ARGV[3]

    for i = 1, #KEYS do
      redis.call(
        'ZREMRANGEBYSCORE',
        KEYS[i],
        '-inf',
        now
      )

      local members =
        redis.call('ZRANGE', KEYS[i], 0, -1)

      local reserved = 0

      for _, member in ipairs(members) do
        local separator =
          string.find(member, '|', 1, true)

        if separator then
          local quantity =
            tonumber(
              string.sub(member, separator + 1)
            ) or 0

          reserved = reserved + quantity
        end
      end

      local stock =
        tonumber(
          ARGV[3 + ((i - 1) * 2) + 1]
        )

      local requested =
        tonumber(
          ARGV[3 + ((i - 1) * 2) + 2]
        )

      local sold =
        tonumber(
          redis.call(
            'GET',
            'stock:sold:' ..
            string.sub(
              KEYS[i],
              string.len('stock:reservations:') + 1
            )
          ) or '0'
        )

      local available =
        stock - sold - reserved

      if requested > available then
        return {0, i, available}
      end
    end

    for i = 1, #KEYS do
      local requested =
        tonumber(
          ARGV[3 + ((i - 1) * 2) + 2]
        )

      local member =
        reservationId .. '|' .. requested

      redis.call(
        'ZADD',
        KEYS[i],
        expiresAt,
        member
      )

      redis.call(
        'PEXPIRE',
        KEYS[i],
        86400000
      )
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
        expiresAt: new Date(expiresAt).toISOString(),
      }
    )

    return { ok: true }
  }

  const failedIndex =
    Number(result[1]) - 1

  const failedItem =
    items[failedIndex]

  return {
    ok: false,

    productId:
      failedItem?.productId ?? '',

    available:
      Math.max(
        Number(result[2]) || 0,
        0
      ),
  }
}
