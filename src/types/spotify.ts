import { z } from 'zod';

export const TelegramAuthorizationSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  token_type: z.string(),
});

export type TelegramAuthorization = z.infer<typeof TelegramAuthorizationSchema>;
