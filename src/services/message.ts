import { TelegramProvider } from '@/providers/telegram';
import { MessageRepository } from '@/repositories/message.repository';
import { TelegramMessage } from '@/types/telegram';

export class MessageService {
  private telegramProvider: TelegramProvider;
  private messageRepository: MessageRepository;
  private activeStatusMessages: Map<string, string> = new Map(); // userId -> messageId

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

  public async sendMessage(text: string, userId: string | number, replyMarkup?: any): Promise<string> {
    const response = await this.telegramProvider.sendMessage(text, userId, replyMarkup);

    const messageData = await this.messageRepository.create({
      userId: userId.toString(),
      messageId: response.result.message_id.toString(),
      text: response.result.text,
      role: 'assistant',
      type: 'message',
    });

    return messageData.messageId;
  }

  public async findMessageById(userId: string, messageId: string) {
    return await this.messageRepository.findById(userId, messageId);
  }

  // Status message management methods
  public async createStatusMessage(
    userId: string,
    chatId: string | number,
    initialText: string = '🔄 Processing your request...',
  ): Promise<string> {
    const messageId = await this.sendMessage(initialText, chatId);
    this.activeStatusMessages.set(userId, messageId);
    return messageId;
  }

  public async updateStatusMessage(userId: string, chatId: string | number, text: string): Promise<void> {
    const messageId = this.activeStatusMessages.get(userId);
    if (!messageId) {
      // If no active status message, create one
      await this.createStatusMessage(userId, chatId, text);
      return;
    }

    try {
      await this.telegramProvider.editMessage(messageId, chatId, text);

      // Update the message in DynamoDB
      await this.messageRepository.update(userId, messageId, {
        text: text,
      });
    } catch {
      // If edit fails (message too old, etc.), send a new message
      await this.createStatusMessage(userId, chatId, text);
    }
  }

  public async finalizeStatusMessage(userId: string, chatId: string | number, finalText: string): Promise<void> {
    await this.updateStatusMessage(userId, chatId, finalText);
    this.activeStatusMessages.delete(userId);
  }

  public getActiveStatusMessageId(userId: string): string | undefined {
    return this.activeStatusMessages.get(userId);
  }

  public clearActiveStatusMessage(userId: string): void {
    this.activeStatusMessages.delete(userId);
  }
}
