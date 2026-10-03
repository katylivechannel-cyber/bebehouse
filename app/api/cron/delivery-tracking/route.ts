import { NextResponse } from 'next/server'
import {
  checkDeliveryTracking,
} from '@/lib/delivery-tracking'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: Request
) {
  const secret =
    process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        error:
          'CRON_SECRET is not configured',
      },
      {
        status: 500,
      }
    )
  }

  const authorization =
    request.headers.get(
      'authorization'
    )

  if (
    authorization !==
    `Bearer ${secret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      {
        status: 401,
      }
    )
  }

  try {
    const result =
      await checkDeliveryTracking()

    return NextResponse.json(result)
  } catch (error: any) {
    console.error(
      'DELIVERY TRACKING CRON ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Tracking check failed',
      },
      {
        status: 500,
      }
    )
  }
}
