import { z } from 'zod';
import * as middlewares from '../middlewares';
import { Auth, Message } from '../models';
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

    const userId = message.chat.id.toString();

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

    await Message.create({
      userId: userId,
      messageId: message.message_id.toString(),
      text: message.text,
      role: 'user',
      type: 'message',
    }).go();

    const authorization = await Auth.query.byUserId({ userId: userId }).go();

    if (authorization.data.length === 0) {
      const { url, authId } = SpotifyProvider.createAuthorizeURL();

      await Auth.create({
        authId,
        userId: userId,
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        scope: '',
        tokenType: '',
      }).go();

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

    const history = await Message.query
      .byUserId({
        userId,
      })
      .go();

    const agent = new SpotifyAgentProvider(userId);

    const response = await agent.run({
      input: message.text,
      history: history.data.map((msg) => ({ role: msg.role, content: msg.text })),
    });
    const replyMessage = await telegramProvider.sendMessage(response, message.chat.id);

    await Message.create({
      userId: userId,
      messageId: replyMessage.result.message_id.toString(),
      text: replyMessage.result.text,
      role: 'assistant',
      type: 'message',
    }).go();

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
