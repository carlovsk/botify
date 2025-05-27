import { DateTime } from 'luxon';
import { z } from 'zod';
import * as middlewares from '../middlewares';
import { Auth } from '../models';
import { SpotifyProvider } from '../providers/spotify';

export const callback = middlewares.base(async (event) => {
  const code = z.string().parse(event.queryStringParameters?.code);

  const auth = await SpotifyProvider.exchangeCodeForSdk(code);

  const expiresIn = Math.round(DateTime.now().toSeconds() + auth.expires_in);

  await Auth.create({
    type: 'spotify',
    accessToken: auth.access_token,
    refreshToken: auth.refresh_token,
    expiresIn,
    scope: auth.scope,
    tokenType: auth.token_type,
  }).go();

  return {
    statusCode: 200,
    body: 'Successfully authenticated with Spotify.',
  };
});
