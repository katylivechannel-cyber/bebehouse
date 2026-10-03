const url = process.env.KV_REST_API_URL
const token = process.env.KV_REST_API_TOKEN

async function command<T = unknown>(
  args: (string | number)[]
): Promise<T> {
  if (!url || !token) {
    throw new Error(
      'Redis environment variables are not configured'
    )
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `Redis returned ${response.status}`
    )
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error)
  }

  return data.result as T
}

export const redis = {
  async set(key: string, value: unknown) {
    return command([
      'SET',
      key,
      JSON.stringify(value),
    ])
  },

  async get<T>(
    key: string
  ): Promise<T | null> {
    const result =
      await command<string | null>([
        'GET',
        key,
      ])

    if (result === null) {
      return null
    }

    return JSON.parse(result) as T
  },

  async incr(key: string): Promise<number> {
    return command<number>(['INCR', key])
  },

  async scan(
    cursor = '0',
    match = 'order:*',
    count = 100
  ): Promise<[string, string[]]> {
    return command<[string, string[]]>([
      'SCAN',
      cursor,
      'MATCH',
      match,
      'COUNT',
      count,
    ])
  },

  async keys(
    match = 'order:*'
  ): Promise<string[]> {
    const keys: string[] = []
    let cursor = '0'

    do {
      const result = await this.scan(
        cursor,
        match,
        100
      )

      cursor = String(result[0])

      keys.push(...(result[1] || []))
    } while (cursor !== '0')

    return keys
  },
}
