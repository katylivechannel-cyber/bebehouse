import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const clientId = process.env.CDEK_CLIENT_ID
    const clientSecret = process.env.CDEK_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Не настроены ключи СДЭК' },
        { status: 500 }
      )
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    })

    const response = await fetch(
      'https://api.cdek.ru/v2/oauth/token?parameters',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        cache: 'no-store',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'СДЭК не принял данные авторизации',
          details: data,
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'СДЭК подключён 🤍',
      expiresIn: data.expires_in,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Ошибка подключения к СДЭК',
      },
      { status: 500 }
    )
  }
}
