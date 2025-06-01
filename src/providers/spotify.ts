import { AccessToken, Device, MaxInt, SpotifyApi } from '@spotify/web-api-ts-sdk';
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import qs from 'node:querystring';
import { z } from 'zod';
import { Auth } from '../models';
import {
  Playlist,
  PlaylistSchema,
  SpotifyAuthorizationSchema,
  TelegramAuthorization,
  Track,
  TrackSchema,
  User,
  UserSchema,
} from '../types/spotify';
import { env } from '../utils/env';
import { startLogger } from '../utils/logger';

export class SpotifyProvider {
  sdk: SpotifyApi;
  private logger = startLogger('SpotifyProvider');
  private clientId: string;

  public static scopes = [
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

    return SpotifyAuthorizationSchema.parse(data);
  }

  static async refreshAccessToken(userId: string): Promise<void> {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = env();

    const authorization = await Auth.query.byUserId({ userId }).go();

    if (authorization.data.length === 0) {
      throw new Error('No Spotify authorization found. Please connect your Spotify account first.');
    }

    const auth = authorization.data[0];

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

    await Auth.patch({
      userId,
      authId: auth.authId,
    })
      .set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || auth.refreshToken, // Use existing refresh token if not provided
        expiresIn: data.expires_in,
        tokenType: data.token_type,
      })
      .go();
  }

  async getUserProfile(): Promise<{ user: User }> {
    try {
      const user = await this.sdk.currentUser.profile();
      return { user: UserSchema.parse(user) };
    } catch (error) {
      this.logger.debug(`Error setting username: ${error}`);
      throw error;
    }
  }

  async search(
    query: string,
    types: ('track' | 'album' | 'artist' | 'playlist')[],
    limit: MaxInt<50> = 10,
  ): Promise<any> {
    try {
      const results = await this.sdk.search(query, types, undefined, limit);

      if (!results) {
        throw new Error('No search results found.');
      }

      return results;
    } catch (error) {
      this.logger.debug(`Search error: ${error}`);
      throw error;
    }
  }

  async getCurrentTrack(): Promise<{ track: Track; isPlaying: boolean } | null> {
    try {
      const response = await this.sdk.player.getCurrentlyPlayingTrack();
      this.logger.debug('Current track response', { response });

      if (!response) {
        this.logger.debug('No playback session found');
        return null;
      }

      if (response.currently_playing_type !== 'track') {
        this.logger.debug('Current playback is not a track');
        return null;
      }

      const track = TrackSchema.parse(response.item);

      return {
        track,
        isPlaying: response.is_playing,
      };
    } catch (error) {
      this.logger.debug('Error getting current track info', { error });
      throw error;
    }
  }

  async resumePlayback({ spotifyUri, device }: { spotifyUri?: string; device?: Device }): Promise<any> {
    try {
      this.logger.debug(`Starting playback for spotify_uri: ${spotifyUri} on ${device?.name}`);

      const deviceId = z.string().parse(device?.id);

      if (spotifyUri?.startsWith('spotify:track:')) {
        await this.sdk.player.startResumePlayback(deviceId, undefined, [spotifyUri]);
      } else {
        await this.sdk.player.startResumePlayback(deviceId, spotifyUri);
      }

      this.logger.debug('Playback started successfully');
    } catch (error) {
      this.logger.debug('Error starting playback', { error });
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
      this.logger.debug(`Error pausing playback: ${error}`);
    }
  }

  async addToQueue(spotifyUri: string, device?: Device): Promise<void> {
    try {
      this.logger.debug('Adding track to queue', { spotifyUri, device });

      const deviceId = z.string().optional().parse(device?.id);
      await this.sdk.player.addItemToPlaybackQueue(spotifyUri, deviceId);
    } catch (error) {
      this.logger.debug(`Error adding to queue: ${error}`);
      throw error;
    }
  }

  async isTrackPlaying(): Promise<boolean> {
    try {
      const currentTrack = await this.getCurrentTrack();
      return !!currentTrack?.isPlaying;
    } catch (error) {
      this.logger.debug(`Error checking if track is playing: ${error}`);
      return false;
    }
  }

  async getCurrentUserPlaylists(limit: MaxInt<50> = 50): Promise<{ playlists: Playlist[] }> {
    try {
      const response = await this.sdk.currentUser.playlists.playlists(limit);

      if (!response.items.length) {
        throw new Error('No playlists found.');
      }

      return {
        playlists: response.items.map((playlist) => PlaylistSchema.parse(playlist)),
      };
    } catch (error) {
      this.logger.debug(`Error getting playlists: ${error}`);
      throw error;
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<{ tracks: Track[] }> {
    try {
      const playlist = await this.sdk.playlists.getPlaylist(playlistId);
      this.logger.debug('Playlist tracks', { playlist });

      if (!playlist) {
        throw new Error('No playlist found.');
      }

      return {
        tracks: TrackSchema.array().parse(playlist.tracks.items),
      };
    } catch (error) {
      this.logger.debug(`Error getting playlist tracks`, { error });
      throw error;
    }
  }

  async addTracksToPlaylist(playlistId: string, tracksUris: string[], position?: number): Promise<void> {
    if (!playlistId) {
      throw new Error('No playlist ID provided.');
    }
    if (!tracksUris.length) {
      throw new Error('No track IDs provided.');
    }

    try {
      const response = await this.sdk.playlists.addItemsToPlaylist(playlistId, tracksUris, position);
      this.logger.debug(`Added tracks ${tracksUris} to playlist ${playlistId}: ${response}`);
    } catch (error) {
      this.logger.debug(`Error adding tracks to playlist: ${error}`);
      throw error;
    }
  }

  async removeTracksFromPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    if (!playlistId) {
      throw new Error('No playlist ID provided.');
    }
    if (!trackIds.length) {
      throw new Error('No track IDs provided.');
    }

    try {
      const tracks = trackIds.map((uri) => ({ uri }));
      const response = await this.sdk.playlists.removeItemsFromPlaylist(playlistId, { tracks });
      this.logger.debug(`Removed tracks ${trackIds} from playlist ${playlistId}: ${response}`);
    } catch (error) {
      this.logger.debug(`Error removing tracks from playlist: ${error}`);
      throw error;
    }
  }

  async changePlaylistDetails(playlistId: string, name?: string, description?: string): Promise<void> {
    if (!playlistId) {
      throw new Error('No playlist ID provided.');
    }

    try {
      await this.sdk.playlists.changePlaylistDetails(playlistId, {
        name,
        description,
      });
      this.logger.debug('Playlist details changed successfully');
    } catch (error) {
      this.logger.debug(`Error changing playlist details: ${error}`);
      throw error;
    }
  }

  async createPlaylist(params: {
    userId: string;
    name: string;
    public?: boolean;
    collaborative?: boolean;
    description?: string;
  }): Promise<any> {
    try {
      this.logger.debug('Creating playlist', { params });

      const response = await this.sdk.playlists.createPlaylist(params.userId, params);

      this.logger.debug('Playlist created successfully', { response });

      return response;
    } catch (error) {
      this.logger.error('Error creating playlist', { error });
      return 'Could not create playlist. Please try again later.';
    }
  }

  async getDevices(): Promise<Device[]> {
    try {
      const devices = await this.sdk.player.getAvailableDevices();
      return devices.devices;
    } catch (error) {
      this.logger.debug(`Error getting devices: ${error}`);
      throw error;
    }
  }

  async findActiveDevice(): Promise<Device | null> {
    try {
      const devices = await this.getDevices();
      return devices.find((device) => device.is_active) || null;
    } catch (error) {
      this.logger.debug(`Error getting devices: ${error}`);
      return null;
    }
  }

  async skipTrack(n: number = 1, deviceId: string): Promise<void> {
    try {
      for (let i = 0; i < n; i++) {
        await this.sdk.player.skipToNext(deviceId);
      }
    } catch (error) {
      this.logger.debug(`Error skipping track: ${error}`);
      throw error;
    }
  }

  async previousTrack(deviceId: string): Promise<void> {
    try {
      await this.sdk.player.skipToPrevious(deviceId);
    } catch (error) {
      this.logger.debug(`Error going to previous track: ${error}`);
      throw error;
    }
  }
}
