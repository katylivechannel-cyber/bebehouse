import { NextResponse } from 'next/server'
import { createPublicKey, verify } from 'crypto'
import { fulfillOrder } from '@/lib/fulfill-order'

function base64UrlDecode(value: string) {
  return Buffer.from(
    value.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  )
}

export async function POST(request: Request) {
  try {
    // Точка присылает JWT обычным текстом
    const token = (await request.text()).trim()

    const parts = token.split('.')

    if (parts.length !== 3) {
      // Точка проверяет доступность URL тестовым запросом.
      // Отвечаем 200, но ничего не выполняем.
      return NextResponse.json({ ok: true })
    }

    const [headerPart, payloadPart, signaturePart] = parts

    // Получаем актуальный публичный ключ Точки
    const keyResponse = await fetch(
      'https://enter.tochka.com/doc/openapi/static/keys/public',
      { cache: 'no-store' }
    )

    if (!keyResponse.ok) {
      throw new Error('Не удалось получить публичный ключ Точки')
    }

    const jwk = await keyResponse.json()

    const publicKey = createPublicKey({
      key: jwk,
      format: 'jwk',
    })

    const valid = verify(
      'RSA-SHA256',
      Buffer.from(`${headerPart}.${payloadPart}`),
      publicKey,
      base64UrlDecode(signaturePart)
    )

    if (!valid) {
      console.error('TOCHKA WEBHOOK: invalid signature')

      // Не обрабатываем поддельный запрос
      return NextResponse.json({ ok: true })
    }

    const payload = JSON.parse(
      base64UrlDecode(payloadPart).toString('utf8')
    )

   console.log('TOCHKA WEBHOOK VERIFIED:', payload)

const operationId =
  payload?.Data?.operationId ??
  payload?.Data?.Operation?.[0]?.operationId

const paymentStatus =
  payload?.Data?.status ??
  payload?.Data?.Operation?.[0]?.status

console.log('TOCHKA WEBHOOK PAYMENT:', {
  operationId,
  paymentStatus,
})

if (operationId && paymentStatus === 'APPROVED') {
  await fulfillOrder(operationId)
}

return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('TOCHKA WEBHOOK ERROR:', error)

    return NextResponse.json({ ok: true })
  }
}
