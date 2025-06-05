import { SpotifyAgentProvider } from '@/agents/spotify';
import { Middlewares } from '@/middlewares';
import { TelegramProvider } from '@/providers/telegram';
import { AuthRepository } from '@/repositories/auth.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { SpotifyAuthService } from '@/services/auth';
import { MessageService } from '@/services/message';
import { TelegramMessageSchema } from '@/types/telegram';
import { DateTime } from 'luxon';
import { z } from 'zod';

const BodySchema = z.object({
  message: TelegramMessageSchema,
});

type BodyType = z.infer<typeof BodySchema>;

export class Handler {
  telegramProvider: TelegramProvider;
  messageService: MessageService;
  authRepository: AuthRepository;
  messageRepository: MessageRepository;

  constructor() {
    this.telegramProvider = new TelegramProvider();
    this.messageService = new MessageService();
    this.authRepository = new AuthRepository();
    this.messageRepository = new MessageRepository();
  }

  public webhook = Middlewares.http(async (event) => {
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

    const authorization = await this.authRepository.findByUserId(userId);

    if (authorization.length === 0) {
      const { url, authId } = SpotifyAuthService.createAuthorizeURL();

      await this.authRepository.create({
        authId,
        userId: userId,
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        scope: '',
        tokenType: '',
      });

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

    const expiresIn = DateTime.fromSeconds(authorization[0].expiresIn);

    if (expiresIn < DateTime.now()) {
      await SpotifyAuthService.refreshAccessToken(userId);
    }

    const history = await this.messageRepository.findByUserId(userId);

    const agent = new SpotifyAgentProvider(userId, this.messageService, message.chat.id);

    const response = await agent.run({
      input: message.text,
      history: history.map((msg: any) => ({ role: msg.role, content: msg.text })),
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
