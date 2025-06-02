import { TelegramProvider } from '../providers/telegram';
import { MessageRepository } from '../repositories/message.repository';
import { TelegramMessage } from '../types/telegram';

export class MessageService {
  private telegramProvider: TelegramProvider;
  private messageRepository: MessageRepository;

  constructor() {
    this.telegramProvider = new TelegramProvider();
    this.messageRepository = new MessageRepository();
  }

  public async saveMessage(message: TelegramMessage) {
    const userId = message.chat.id.toString();
    const messageId = message.message_id.toString();

    await this.messageRepository.create({
      userId,
      messageId,
      text: message.text,
      role: 'user',
      type: 'message',
    });
  }

  public async sendMessage(text: string, userId: string | number, replyMarkup?: any) {
    const rseponse = await this.telegramProvider.sendMessage(text, userId, replyMarkup);

    await this.messageRepository.create({
      userId: userId.toString(),
      messageId: rseponse.result.message_id.toString(),
      text: rseponse.result.text,
      role: 'assistant',
      type: 'message',
    });
  }

  public async findMessageById(userId: string, messageId: string) {
    return await this.messageRepository.findById(userId, messageId);
  }
}
