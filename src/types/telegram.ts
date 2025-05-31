import { z } from 'zod';

export const TelegramUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
});

export type TelegramUser = z.infer<typeof TelegramUserSchema>;

export const TelegramMessageSchema = z.object({
  message_id: z.number(),
  text: z.string(),
  date: z.coerce.date(),
  chat: TelegramUserSchema,
});
export type TelegramMessage = z.infer<typeof TelegramMessageSchema>;
