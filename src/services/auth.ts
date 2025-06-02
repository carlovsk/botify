import { AccessToken } from '@spotify/web-api-ts-sdk';
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import qs from 'node:querystring';
import { SpotifyProvider } from '../providers/spotify';
import { AuthRepository } from '../repositories/auth.repository';
import { SpotifyAuthorization, SpotifyAuthorizationSchema } from '../types/spotify';
import { env } from '../utils/env';

export class SpotifyAuthService {
  private static authRepository = new AuthRepository();

  static createAuthorizeURL(): { url: string; authId: string } {
    const { SPOTIFY_CLIENT_ID, API_GATEWAY_URL } = env();

    const authId = randomUUID();

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: `${API_GATEWAY_URL}/spotify/callback`,
      show_dialog: 'false',
      state: authId,
    });

    if (SpotifyProvider.scopes.length) params.append('scope', SpotifyProvider.scopes.join(' '));

    return {
      url: `https://accounts.spotify.com/authorize?${params.toString()}`,
      authId,
    };
  }

  static async exchangeCodeForToken(code: string): Promise<SpotifyAuthorization> {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_CLIENT_SECRET } = env();

    const payload = qs.stringify({
      grant_type: 'authorization_code',
      code, // the ?code= you got on /spotify/callback
      redirect_uri: SPOTIFY_REDIRECT_URI,
    });

    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    // Spotify returns the AccessToken JSON the SDK already understands
    const { data } = await axios.post('https://accounts.spotify.com/api/token', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
    });

    return SpotifyAuthorizationSchema.parse(data);
  }

  static async refreshAccessToken(userId: string): Promise<void> {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = env();

    const authorization = await SpotifyAuthService.authRepository.findByUserId(userId);

    if (authorization.length === 0) {
      throw new Error('No Spotify authorization found. Please connect your Spotify account first.');
    }

    const auth = authorization[0];

    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
    });

    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    const { data } = await axios.post('https://accounts.spotify.com/api/token', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
    });

    await SpotifyAuthService.authRepository.update(userId, auth.authId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || auth.refreshToken, // Use existing refresh token if not provided
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    });
  }

  /**
   * Finds a Spotify authorization token by Telegram's user ID.
   */
  static async findTokenByUserId(userId: string): Promise<AccessToken | null> {
    const response = await SpotifyAuthService.authRepository.findByUserId(userId);

    if (response.length === 0) {
      return null;
    }

    const authorization = response[0];

    return {
      access_token: authorization.accessToken,
      refresh_token: authorization.refreshToken,
      expires_in: authorization.expiresIn,
      token_type: authorization.tokenType,
    };
  }
}
