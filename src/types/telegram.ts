import { z } from 'zod';

export const TelegramUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
});

export type User = z.infer<typeof TelegramUserSchema>;
