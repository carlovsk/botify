import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import axios from 'axios';
import qs from 'node:querystring';
import { TelegramAuthorization, TelegramAuthorizationSchema } from '../types/spotify';
import { env } from '../utils/env';

export class SpotifyProvider {
  sdk: SpotifyApi;
  private username: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private apiGatewayUrl: string;

  private static scopes = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-read-currently-playing',
    'app-remote-control',
    'streaming',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-private',
    'playlist-modify-public',
    'user-read-playback-position',
    'user-top-read',
    'user-read-recently-played',
    'user-library-modify',
    'user-library-read',
  ];

  constructor() {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, API_GATEWAY_URL } = env();

    this.clientId = SPOTIFY_CLIENT_ID;
    this.clientSecret = SPOTIFY_CLIENT_SECRET;
    this.apiGatewayUrl = API_GATEWAY_URL;

    this.sdk = SpotifyApi.withClientCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SpotifyProvider.scopes);
  }

  static createAuthorizeURL(state = '', showDialog = false, responseType: 'code' | 'token' = 'code'): string {
    const { SPOTIFY_CLIENT_ID, API_GATEWAY_URL } = env();

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: responseType,
      redirect_uri: `${API_GATEWAY_URL}/spotify/callback`,
    });

    if (SpotifyProvider.scopes.length) params.append('scope', SpotifyProvider.scopes.join(' '));

    if (state) params.append('state', state);
    if (showDialog) params.append('show_dialog', 'true');

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  static async exchangeCodeForSdk(code: string): Promise<TelegramAuthorization> {
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

    return TelegramAuthorizationSchema.parse(data);
  }
}
