import { startLogger } from '@/utils/logger';
import { Logger } from '@aws-lambda-powertools/logger';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
export class TelegramProvider {
  private client: AxiosInstance;
  private logger: Logger;

  constructor() {
    const telegramAccessToken = z.string().parse(process.env.TELEGRAM_BOT_TOKEN);

    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${telegramAccessToken}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger = startLogger('services:telegram');
  }

  async sendMessage(text: string, chatId: string | number, replyMarkup?: any): Promise<any> {
    const { data } = await this.client.post('sendMessage', {
      chat_id: chatId,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      text,
      reply_markup: replyMarkup,
    });
    this.logger.debug('message sent');
    return data;
  }

  async editMessage(messageId: string, chatId: string | number, text: string, replyMarkup?: any): Promise<any> {
    const { data } = await this.client.post('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      text,
      reply_markup: replyMarkup,
    });
    this.logger.debug('message edited');
    return data;
  }
}
