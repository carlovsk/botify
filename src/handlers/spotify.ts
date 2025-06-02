import { Middlewares } from '@/middlewares';
import { AuthRepository } from '@/repositories/auth.repository';
import { SpotifyAuthService } from '@/services/auth';
import { DateTime } from 'luxon';
import { z } from 'zod';

export const callback = Middlewares.base(async (event) => {
  const authRepository = new AuthRepository();

  const code = z.string().parse(event.queryStringParameters?.code);
  const state = z.string().parse(event.queryStringParameters?.state);

  const auth = await authRepository.findByAuthId(state);

  if (auth.length === 0) {
    return {
      statusCode: 400,
      body: 'Invalid authorization state.',
    };
  }

  const token = await SpotifyAuthService.exchangeCodeForToken(code);
  const expiresIn = Math.round(DateTime.now().toSeconds() + token.expires_in);

  await authRepository.update(auth[0].userId, auth[0].authId, {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresIn,
    scope: token.scope,
    tokenType: token.token_type,
  });

  return {
    statusCode: 200,
    body: 'Successfully authenticated with Spotify.',
  };
});
