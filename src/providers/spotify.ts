import { AccessToken, Device, SpotifyApi } from '@spotify/web-api-ts-sdk';
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import qs from 'node:querystring';
import { z } from 'zod';
import { Auth } from '../models';
import { ParsedTrack, TelegramAuthorization, TelegramAuthorizationSchema } from '../types/spotify';
import { env } from '../utils/env';
import * as SpotifyUtils from '../utils/spotify';

export class SpotifyProvider {
  sdk: SpotifyApi;
  private username: string | null = null;
  private clientId: string;

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

  constructor(token: AccessToken) {
    const { SPOTIFY_CLIENT_ID } = env();

    this.clientId = SPOTIFY_CLIENT_ID;

    this.sdk = SpotifyApi.withAccessToken(this.clientId, token);
  }

  static async buildClientWithAuth(userId: string): Promise<SpotifyProvider> {
    const authorization = await Auth.query.byUserId({ userId }).go();

    if (authorization.data.length === 0) {
      throw new Error('No Spotify authorization found. Please connect your Spotify account first.');
    }

    const auth = authorization.data[0];
    return new SpotifyProvider({
      access_token: auth.accessToken,
      refresh_token: auth.refreshToken,
      expires_in: auth.expiresIn,
      token_type: auth.tokenType,
    });
  }

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

  async setUsername(): Promise<void> {
    try {
      const user = await this.sdk.currentUser.profile();

      this.username = user.display_name || null;
    } catch (error) {
      console.log(`Error setting username: ${error}`);
      throw error;
    }
  }

  async getCurrentTrack(): Promise<ParsedTrack | null> {
    try {
      const current = await this.sdk.player.getCurrentlyPlayingTrack();

      if (!current) {
        console.log('No playback session found');
        return null;
      }

      if (current.currently_playing_type !== 'track') {
        console.log('Current playback is not a track');
        return null;
      }

      const trackInfo = SpotifyUtils.parseTrack(current.item);

      if (!trackInfo) {
        console.log('Failed to parse current track');
        return null;
      }

      if (current.is_playing !== undefined) {
        trackInfo.is_playing = current.is_playing;
      }

      console.log(`Current track: ${trackInfo.name || 'Unknown'} by ${trackInfo.artist || 'Unknown'}`);
      return trackInfo;
    } catch (error) {
      console.log('Error getting current track info');
      throw error;
    }
  }

  async pausePlayback(device?: Device): Promise<void> {
    try {
      const playback = await this.sdk.player.getPlaybackState();
      if (playback?.is_playing) {
        const deviceId = z.string().parse(device?.id);
        await this.sdk.player.pausePlayback(deviceId);
      }
    } catch (error) {
      console.log(`Error pausing playback: ${error}`);
    }
  }

  async getDevices(): Promise<Device[]> {
    try {
      const devices = await this.sdk.player.getAvailableDevices();
      return devices.devices;
    } catch (error) {
      console.log(`Error getting devices: ${error}`);
      throw error;
    }
  }

  async findActiveDevice(): Promise<Device | null> {
    try {
      const devices = await this.getDevices();
      return devices.find((device) => device.is_active) || null;
    } catch (error) {
      console.log(`Error getting devices: ${error}`);
      return null;
    }
  }

  async skipTrack(n: number = 1, deviceId: string): Promise<void> {
    try {
      for (let i = 0; i < n; i++) {
        await this.sdk.player.skipToNext(deviceId);
      }
    } catch (error) {
      console.log(`Error skipping track: ${error}`);
      throw error;
    }
  }
}
