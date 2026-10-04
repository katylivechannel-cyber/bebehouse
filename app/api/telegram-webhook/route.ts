import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

type TelegramUpdate = {
  message?: {
    message_id: number
    chat: {
      id: number
      type: string
    }
    from?: {
      id: number
      first_name?: string
      last_name?: string
      username?: string
    }
    text?: string
  }
  callback_query?: {
    id: string
    from: {
      id: number
    }
    data?: string
    message?: {
      chat: {
        id: number
      }
    }
  }
}

async function telegramRequest(
  token: string,
  method: string,
  body: Record<string, unknown>
) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(
      `Telegram ${method}: ${error}`
    )
  }

  return response.json()
}

export async function POST(request: Request) {
  try {
    const token =
      process.env.TELEGRAM_BOT_TOKEN

    const ownerChatId =
      process.env.TELEGRAM_CHAT_ID

    if (!token || !ownerChatId) {
      throw new Error(
        'Не настроены переменные Telegram'
      )
    }

    const update =
      (await request.json()) as TelegramUpdate

    /*
      Нажатие владельцем кнопки
      "Ответить покупателю"
    */
    if (update.callback_query) {
      const callback = update.callback_query
      const data = callback.data ?? ''

      await telegramRequest(
        token,
        'answerCallbackQuery',
        {
          callback_query_id: callback.id,
        }
      )

      if (
        String(callback.from.id) !==
        String(ownerChatId)
      ) {
        return NextResponse.json({ ok: true })
      }

      if (data.startsWith('reply:')) {
        const customerChatId =
          data.slice('reply:'.length)

        await redis.set(
          `telegram:reply:${ownerChatId}`,
          customerChatId
        )

        await telegramRequest(
          token,
          'sendMessage',
          {
            chat_id: ownerChatId,
            text:
              '✍️ Напишите ответ покупателю следующим сообщением.\n\nДля отмены отправьте /cancel',
          }
        )
      }

      return NextResponse.json({ ok: true })
    }

    const message = update.message

    if (!message?.text) {
      return NextResponse.json({ ok: true })
    }

    const senderChatId = String(
      message.chat.id
    )

    /*
      Сообщение от владельца.
      Если сейчас открыт режим ответа —
      отправляем текст покупателю.
    */
    if (senderChatId === String(ownerChatId)) {
      if (message.text === '/cancel') {
        await redis.del(
          `telegram:reply:${ownerChatId}`
        )

        await telegramRequest(
          token,
          'sendMessage',
          {
            chat_id: ownerChatId,
            text: 'Ответ отменён.',
          }
        )

        return NextResponse.json({ ok: true })
      }

      const customerChatId =
        await redis.get<string>(
          `telegram:reply:${ownerChatId}`
        )

      if (!customerChatId) {
        return NextResponse.json({ ok: true })
      }

      await telegramRequest(
        token,
        'sendMessage',
        {
          chat_id: customerChatId,
          text: message.text,
        }
      )

      await redis.del(
        `telegram:reply:${ownerChatId}`
      )

      await telegramRequest(
        token,
        'sendMessage',
        {
          chat_id: ownerChatId,
          text: '✅ Ответ отправлен покупателю',
        }
      )

      return NextResponse.json({ ok: true })
    }

    /*
      Команда /start от покупателя
    */
    if (message.text.startsWith('/start')) {
      await telegramRequest(
        token,
        'sendMessage',
        {
          chat_id: senderChatId,
          text:
            'Здравствуйте! 🤍\n\nЭто поддержка bébéhouse. Напишите ваш вопрос одним сообщением — мы ответим вам здесь.',
        }
      )

      return NextResponse.json({ ok: true })
    }

    /*
      Обычное сообщение покупателя
      пересылаем владельцу.
    */
    const firstName =
      message.from?.first_name ?? ''

    const lastName =
      message.from?.last_name ?? ''

    const name =
      `${firstName} ${lastName}`.trim() ||
      'Покупатель'

    const username =
      message.from?.username
        ? `@${message.from.username}`
        : 'username не указан'

    const text = [
      '💬 Новое сообщение в bébéhouse',
      '',
      `👤 ${name}`,
      `Telegram: ${username}`,
      '',
      message.text,
    ].join('\n')

    await telegramRequest(
      token,
      'sendMessage',
      {
        chat_id: ownerChatId,
        text,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Ответить покупателю',
                callback_data: `reply:${senderChatId}`,
              },
            ],
          ],
        },
      }
    )

    await telegramRequest(
      token,
      'sendMessage',
      {
        chat_id: senderChatId,
        text:
          'Спасибо! 🤍 Сообщение передано bébéhouse. Ответим вам здесь.',
      }
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(
      'TELEGRAM WEBHOOK ERROR:',
      error
    )

    return NextResponse.json({ ok: true })
  }
}
