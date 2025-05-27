import { z } from 'zod';
import * as middlewares from '../middlewares';
import { Auth } from '../models';
import { SpotifyAgentProvider } from '../providers/agents/spotify';
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

type BodyType = z.infer<typeof BodySchema>;

export class Handler {
  telegramProvider: TelegramProvider;

  constructor() {
    this.telegramProvider = new TelegramProvider();
  }

  public webhook = middlewares.http(async (event) => {
    const telegramProvider = new TelegramProvider();

    const { message } = BodySchema.parse(event.body);

    if (await this.checkUserId(message)) {
      await telegramProvider.sendMessage(
        `Hello ${message.chat.first_name},\n\nYou said: ${message.text}`,
        message.chat.id,
      );

      return {
        statusCode: 200,
        body: 'Success',
      };
    }

    // await Message.create({
    //   authorId: message.chat.id.toString(),
    //   messageId: message.message_id.toString(),
    //   text: message.text,
    //   role: 'user',
    //   type: 'message',
    // }).go();

    const authorization = await Auth.query.byType({ type: 'spotify' }).go();

    if (authorization.data.length === 0) {
      const url = SpotifyProvider.createAuthorizeURL();

      await telegramProvider.sendMessage(
        `Hello ${message.chat.first_name},\n\nIt seems you haven't connected your Spotify account yet. Please click the button below to connect your Spotify account so we can proceed with your request.`,
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
        body: 'Success',
      };
    }

    const agent = new SpotifyAgentProvider();

    await agent.run(message.text);

    return {
      statusCode: 200,
      body: 'Success',
    };
  });

  private async checkUserId(message: BodyType['message']): Promise<boolean> {
    return message.chat.id !== z.coerce.number().parse(process.env.TELEGRAM_USER_ID);
  }
}

export const webhook = new Handler().webhook;
