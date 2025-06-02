import { z } from 'zod';
import { Message } from '../models';

// Zod schemas for validation
export const CreateMessageDataSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  messageId: z.string().min(1, 'Message ID is required'),
  text: z.string().min(1, 'Text is required'),
  role: z.enum(['user', 'system', 'assistant'], {
    errorMap: () => ({ message: 'Role must be user, system, or assistant' }),
  }),
  type: z.literal('message', {
    errorMap: () => ({ message: 'Type must be message' }),
  }),
});

export const MessageDataSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  messageId: z.string().min(1, 'Message ID is required'),
  text: z.string().min(1, 'Text is required'),
  role: z.enum(['user', 'system', 'assistant'], {
    errorMap: () => ({ message: 'Role must be user, system, or assistant' }),
  }),
  type: z.literal('message', {
    errorMap: () => ({ message: 'Type must be message' }),
  }),
});

export const UpdateMessageDataSchema = z.object({
  text: z.string().min(1, 'Text is required').optional(),
  role: z
    .enum(['user', 'system', 'assistant'], {
      errorMap: () => ({ message: 'Role must be user, system, or assistant' }),
    })
    .optional(),
  type: z
    .literal('message', {
      errorMap: () => ({ message: 'Type must be message' }),
    })
    .optional(),
});

// Type inference from Zod schemas
export type CreateMessageData = z.infer<typeof CreateMessageDataSchema>;
export type MessageData = z.infer<typeof MessageDataSchema>;
export type UpdateMessageData = z.infer<typeof UpdateMessageDataSchema>;

export class MessageRepository {
  private entity = Message;

  async create(data: CreateMessageData): Promise<MessageData> {
    // Validate input data
    const validatedData = CreateMessageDataSchema.parse(data);

    const result = await this.entity.create(validatedData).go();

    // Validate and return result
    return MessageDataSchema.parse(result.data);
  }

  async findById(userId: string, messageId: string): Promise<MessageData | null> {
    // Validate inputs
    z.string().min(1, 'User ID is required').parse(userId);
    z.string().min(1, 'Message ID is required').parse(messageId);

    try {
      const result = await this.entity.get({ userId, messageId }).go();

      // Validate and return result
      return result.data ? MessageDataSchema.parse(result.data) : null;
    } catch {
      return null;
    }
  }

  async findByUserId(userId: string): Promise<MessageData[]> {
    // Validate input
    z.string().min(1, 'User ID is required').parse(userId);

    const result = await this.entity.query.byUserId({ userId }).go();

    // Validate each item in the result
    return result.data.map((item) => MessageDataSchema.parse(item));
  }

  async update(userId: string, messageId: string, updates: UpdateMessageData): Promise<MessageData> {
    // Validate inputs
    z.string().min(1, 'User ID is required').parse(userId);
    z.string().min(1, 'Message ID is required').parse(messageId);
    const validatedUpdates = UpdateMessageDataSchema.parse(updates);

    const result = await this.entity.patch({ userId, messageId }).set(validatedUpdates).go();

    // Validate and return result
    return MessageDataSchema.parse(result.data);
  }

  async delete(userId: string, messageId: string): Promise<void> {
    // Validate inputs
    z.string().min(1, 'User ID is required').parse(userId);
    z.string().min(1, 'Message ID is required').parse(messageId);

    await this.entity.delete({ userId, messageId }).go();
  }

  async deleteByUserId(userId: string): Promise<void> {
    // Validate input
    z.string().min(1, 'User ID is required').parse(userId);

    const messages = await this.findByUserId(userId);
    for (const message of messages) {
      await this.delete(message.userId, message.messageId);
    }
  }
}
