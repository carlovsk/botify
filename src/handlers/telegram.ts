import { z } from 'zod';
import * as middlewares from '../middlewares';
import { Message } from '../models';
import { SpotifyProvider } from '../providers/spotify';
import { TelegramProvider } from '../providers/telegram';
import { TelegramUserSchema } from '../types/telegram';

const BodySchema = z.object({
  message: z.object({
    message_id: z.number(),
    text: z.string(),
    date: z.coerce.date(),
    chat: TelegramUserSchema,
  }),
});

export const webhook = middlewares.http(async (event) => {
  const telegramProvider = new TelegramProvider();

  const { message } = BodySchema.parse(event.body);

  if (message.chat.id !== z.coerce.number().parse(process.env.TELEGRAM_USER_ID)) {
    // TODO: change message to unauthorized user
    return await telegramProvider.sendMessage(
      `Hello ${message.chat.first_name},\n\nYou said: ${message.text}`,
      message.chat.id,
    );
  }

  await Message.create({
    authorId: message.chat.id.toString(),
    messageId: message.message_id.toString(),
    text: message.text,
    role: 'user',
    type: 'message',
  }).go();

  const url = SpotifyProvider.createAuthorizeURL();

  await telegramProvider.sendMessage(
    `Hello ${message.chat.first_name},\n\nPlease authorize the bot to access your Spotify account by clicking the link below.`,
    message.chat.id,
    {
      inline_keyboard: [
        [
          {
            text: '🔗  Connect Spotify',
            url,
          },
        ],
      ],
    },
  );

  return {
    statusCode: 200,
  };
});
