import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const resendKey =
      process.env.RESEND_API_KEY

    if (!resendKey) {
      throw new Error('Не настроен Resend')
    }

    const emailResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:
            'bébéhouse <onboarding@resend.dev>',

          // ВРЕМЕННО:
          // сюда потом подставим твою почту
          to: ['katylivechannel@gmail.com'],

          subject:
            'Заказ №1057 — bébéhouse 🤍',

          html: `
            <div style="font-family: Arial, sans-serif; color: #411D0A; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px 16px;">

              <div style="text-align: center; margin-bottom: 32px;">
                <div style="font-family: Georgia, serif; font-size: 36px; font-weight: 600;">
                  bébéhouse
                </div>

                <div style="font-size: 13px; color: #7a6a61; margin-top: 6px;">
                  Детские европейские бренды в одном месте
                </div>
              </div>

              <div style="background: #FAF7F2; border-radius: 20px; padding: 24px; margin-bottom: 28px;">
                <div style="font-family: Georgia, serif; font-size: 24px; font-weight: 600;">
                  Спасибо за заказ 🤍
                </div>

                <p style="margin: 10px 0 0;">
                  Екатерина, оплата прошла успешно.
                  Мы уже готовим ваш заказ к отправке.
                </p>
              </div>

              <div style="font-size: 14px; color: #7a6a61;">
                Заказ №1057
              </div>

              <h3 style="font-family: Georgia, serif; font-size: 21px; margin-top: 24px; margin-bottom: 4px;">
                Ваш заказ
              </h3>

              <div style="padding: 12px 0; border-bottom: 1px solid #eee8e3;">
                <div style="font-weight: 600;">
                  Кукла Rosa — 35 см
                </div>
                <div style="font-size: 14px; color: #7a6a61; margin-top: 4px;">
                  1 шт. × 4 990 ₽
                </div>
              </div>

              <div style="padding: 12px 0; border-bottom: 1px solid #eee8e3;">
                <div style="font-weight: 600;">
                  Пластыри Cherry
                </div>
                <div style="font-size: 14px; color: #7a6a61; margin-top: 4px;">
                  2 шт. × 590 ₽
                </div>
              </div>

              <div style="margin-top: 18px;">
                Товары: 6 170 ₽
              </div>

              <div style="margin-top: 8px; font-size: 18px;">
                <strong>
                  Оплачено: 6 170 ₽
                </strong>
              </div>

              <div style="margin-top: 28px; padding: 18px; background: #FAF7F2; border-radius: 16px;">
                <strong>
                  Доставка — СДЭК
                </strong>

                <div style="margin-top: 6px;">
                  Санкт-Петербург, Невский проспект, 100
                </div>

                <div style="margin-top: 6px; color: #7a6a61;">
                  Доставка оплачивается при получении — 390 ₽.
                </div>
              </div>

              <p style="margin-top: 28px;">
                Номер отправления СДЭК:
                <strong>1234567890</strong>
              </p>

              <div style="margin-top: 32px; padding-top: 26px; border-top: 1px solid #eee8e3; text-align: center;">
                <div style="font-family: Georgia, serif; font-size: 20px; font-weight: 600;">
                  Остались вопросы?
                </div>

                <p style="color: #7a6a61; font-size: 14px; margin: 8px 0 18px;">
                  Напишите нам в Telegram — мы всегда на связи 🤍
                </p>

                <a
                  href="https://t.me/bebe_house_bot"
                  style="display: inline-block; background: #411D0A; color: #ffffff; text-decoration: none; padding: 13px 24px; border-radius: 999px; font-weight: 600;"
                >
                  Написать нам
                </a>
              </div>

              <p style="margin-top: 32px; text-align: center; color: #7a6a61; font-size: 14px;">
                С любовью,<br />
                <strong style="color: #411D0A;">
                  bébéhouse 🤍
                </strong>
              </p>

            </div>
          `,
        }),
      }
    )

    const result =
      await emailResponse.json()

    if (!emailResponse.ok) {
      console.error(
        'TEST EMAIL ERROR:',
        result
      )

      return NextResponse.json(
        {
          ok: false,
          error: result,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Тестовое письмо отправлено 🤍',
    })
  } catch (error: any) {
    console.error(
      'TEST EMAIL ERROR:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          'Не удалось отправить письмо',
      },
      { status: 500 }
    )
  }
}
