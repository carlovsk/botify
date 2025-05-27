import { z } from 'zod';

export function env() {
  return z
    .object({
      SPOTIFY_CLIENT_ID: z.string(),
      SPOTIFY_CLIENT_SECRET: z.string(),
      SPOTIFY_REDIRECT_URI: z.string().url(),
      API_GATEWAY_URL: z.string().url(),
    })
    .parse(process.env);
}
