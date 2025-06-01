import { DateTime } from 'luxon';
import { z } from 'zod';
import { Middlewares } from '../middlewares';
import { Auth } from '../models';
import { SpotifyProvider } from '../providers/spotify';

export const callback = Middlewares.base(async (event) => {
  const code = z.string().parse(event.queryStringParameters?.code);
  const state = z.string().parse(event.queryStringParameters?.state);

  const auth = await Auth.query.byAuthId({ authId: state }).go();

  if (auth.data.length === 0) {
    return {
      statusCode: 400,
      body: 'Invalid authorization state.',
    };
  }

  const token = await SpotifyProvider.exchangeCodeForSdk(code);
  const expiresIn = Math.round(DateTime.now().toSeconds() + token.expires_in);

  await Auth.patch({
    userId: auth.data[0].userId,
    authId: auth.data[0].authId,
  })
    .set({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn,
      scope: token.scope,
      tokenType: token.token_type,
    })
    .go();

  return {
    statusCode: 200,
    body: 'Successfully authenticated with Spotify.',
  };
});
