import { SpotifyAuthService } from '@/services/auth';
import { Track, TrackSchema, User, UserSchema } from '@/types/spotify';
import { env } from '@/utils/env';
import { startLogger } from '@/utils/logger';
import { AccessToken, Device, MaxInt, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { z } from 'zod';

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
    const authorization = await SpotifyAuthService.findTokenByUserId(userId);

    if (!authorization) {
      throw new Error('No Spotify authorization found. Please connect your Spotify account first.');
    }

    return new SpotifyProvider(authorization);
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

  async findActiveDevice(): Promise<Device | null> {
    try {
      const devices = await this.sdk.player.getAvailableDevices();
      return devices.devices.find((device) => device.is_active) || null;
    } catch (error) {
      this.logger.debug(`Error getting devices: ${error}`);
      return null;
    }
  }
}
