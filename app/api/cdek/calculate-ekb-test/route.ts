import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const baseUrl =
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'https://bebehouse-6b95.vercel.app'

    const response = await fetch(
      `${baseUrl}/api/cdek/calculate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityCode: 250, // Екатеринбург
          weight: 1050,
          length: 20,
          width: 20,
          height: 20,
        }),
        cache: 'no-store',
      }
    )

    const data = await response.json()

    return NextResponse.json({
      test: {
        from: 'Санкт-Петербург',
        to: 'Екатеринбург',
        cityCode: 250,
        package: '20 × 20 × 20 см',
        weight: '1050 г',
      },
      result: data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Неизвестная ошибка',
      },
      {
        status: 500,
      }
    )
  }
}
