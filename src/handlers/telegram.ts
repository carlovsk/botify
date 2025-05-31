import { DateTime } from 'luxon';
import { z } from 'zod';
import * as middlewares from '../middlewares';
import { Auth, Message } from '../models';
import { SpotifyAgentProvider } from '../providers/agents/spotify';
import { SpotifyProvider } from '../providers/spotify';
import { TelegramProvider } from '../providers/telegram';
import { MessageService } from '../services/message';
import { TelegramMessageSchema } from '../types/telegram';

const BodySchema = z.object({
  message: TelegramMessageSchema,
});

type BodyType = z.infer<typeof BodySchema>;

export class Handler {
  telegramProvider: TelegramProvider;
  messageService: MessageService;

  constructor() {
    this.telegramProvider = new TelegramProvider();
    this.messageService = new MessageService();
  }

  public webhook = middlewares.http(async (event) => {
    const telegramProvider = new TelegramProvider();

    const { message } = BodySchema.parse(event.body);

    const userId = message.chat.id.toString();
    const messageId = message.message_id.toString();

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

    if (await this.messageService.findMessageById(userId, messageId)) {
      console.log('Message already been processed');

      return {
        statusCode: 200,
        body: 'Success',
      };
    }

    await this.messageService.saveMessage(message);

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

      await this.messageService.sendMessage(
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

    const expiresIn = DateTime.fromSeconds(authorization.data[0].expiresIn);

    if (expiresIn < DateTime.now()) {
      await SpotifyProvider.refreshAccessToken(userId);
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

    await this.messageService.sendMessage(response, message.chat.id);

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
