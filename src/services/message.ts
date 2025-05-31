import { Message } from '../models';
import { TelegramProvider } from '../providers/telegram';
import { TelegramMessage } from '../types/telegram';

export class MessageService {
  private telegramProvider: TelegramProvider;

  constructor() {
    this.telegramProvider = new TelegramProvider();
  }

  public async saveMessage(message: TelegramMessage) {
    const userId = message.chat.id.toString();
    const messageId = message.message_id.toString();

    await Message.create({
      userId,
      messageId,
      text: message.text,
      role: 'user',
      type: 'message',
    }).go();
  }

  public async sendMessage(text: string, userId: string | number, replyMarkup?: any) {
    const rseponse = await this.telegramProvider.sendMessage(text, userId, replyMarkup);

    await Message.create({
      userId: userId.toString(),
      messageId: rseponse.result.message_id.toString(),
      text: rseponse.result.text,
      role: 'assistant',
      type: 'message',
    }).go();
  }

  public async findMessageById(userId: string, messageId: string) {
    const message = await Message.get({ userId, messageId }).go();

    if (!message.data) {
      return null;
    }

    return message.data;
  }
}
