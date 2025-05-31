import { AccessToken, Device, MaxInt, SpotifyApi } from '@spotify/web-api-ts-sdk';
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import qs from 'node:querystring';
import { z } from 'zod';
import { Auth } from '../models';
import { ParsedTrack, TelegramAuthorization, TelegramAuthorizationSchema } from '../types/spotify';
import { env } from '../utils/env';
import { startLogger } from '../utils/logger';
import * as SpotifyUtils from '../utils/spotify';

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

    return TelegramAuthorizationSchema.parse(data);
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

  async getUserProfile(): Promise<{
    display_name: string;
    email: string;
    href: string;
    id: string;
    type: string;
    uri: string;
  }> {
    try {
      const user = await this.sdk.currentUser.profile();
      return user;
    } catch (error) {
      console.log(`Error setting username: ${error}`);
      throw error;
    }
  }

  async search(query: string, qtype: string = 'track', limit: MaxInt<50> = 10): Promise<any> {
    const user = await this.getUserProfile();

    try {
      const types = qtype.split(',') as Array<'track' | 'album' | 'artist' | 'playlist'>;
      const results = await this.sdk.search(query, types, 'US', limit);

      if (!results) {
        throw new Error('No search results found.');
      }

      return SpotifyUtils.parseSearchResults(results, qtype, user.display_name);
    } catch (error) {
      console.log(`Search error: ${error}`);
      throw error;
    }
  }

  async recommendations(artists?: string[], tracks?: string[], limit: MaxInt<50> = 20): Promise<any> {
    try {
      const recommendations = await this.sdk.recommendations.get({
        seed_artists: artists,
        seed_tracks: tracks,
        limit,
      });
      return recommendations;
    } catch (error) {
      console.log(`Recommendations error: ${error}`);
      throw error;
    }
  }

  async getInfo(itemUri: string): Promise<any> {
    const [, qtype, itemId] = itemUri.split(':');

    try {
      switch (qtype) {
        case 'track': {
          const track = await this.sdk.tracks.get(itemId);
          return SpotifyUtils.parseTrack ? SpotifyUtils.parseTrack(track, true) : track;
        }
        case 'album': {
          const album = await this.sdk.albums.get(itemId);
          return SpotifyUtils.parseAlbum ? SpotifyUtils.parseAlbum(album, true) : album;
        }
        case 'artist': {
          const [artist, albums, topTracks] = await Promise.all([
            this.sdk.artists.get(itemId),
            this.sdk.artists.albums(itemId),
            this.sdk.artists.topTracks(itemId, 'US'),
          ]);

          const artistInfo = SpotifyUtils.parseArtist ? SpotifyUtils.parseArtist(artist, true) : artist;

          const albumsAndTracks = {
            albums,
            tracks: { items: topTracks.tracks },
          };

          const parsedInfo = SpotifyUtils.parseSearchResults
            ? SpotifyUtils.parseSearchResults(albumsAndTracks, 'album,track')
            : albumsAndTracks;

          return {
            ...artistInfo,
            top_tracks: parsedInfo.tracks,
            albums: parsedInfo.albums,
          };
        }
        case 'playlist': {
          const user = await this.getUserProfile();
          const playlist = await this.sdk.playlists.getPlaylist(itemId);
          console.log(`Playlist info: ${JSON.stringify(playlist)}`);
          return SpotifyUtils.parsePlaylist ? SpotifyUtils.parsePlaylist(playlist, user.display_name, true) : playlist;
        }
        default:
          throw new Error(`Unknown qtype: ${qtype}`);
      }
    } catch (error) {
      console.log(`Get info error: ${error}`);
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

  async resumePlayback({ spotifyUri, device }: { spotifyUri?: string; device?: Device }): Promise<any> {
    try {
      console.log(`Starting playback for spotify_uri: ${spotifyUri} on ${device?.name}`);

      if (!spotifyUri) {
        if (await this.isTrackPlaying()) {
          return 'Playback is already active, no need to resume.';
        }
        if (!(await this.getCurrentTrack())) {
          throw new Error('No track_id provided and no current playback to resume.');
        }
      }

      const deviceId = z.string().parse(device?.id);

      if (spotifyUri) {
        if (spotifyUri.startsWith('spotify:track:')) {
          await this.sdk.player.startResumePlayback(deviceId, undefined, [spotifyUri]);
        } else {
          await this.sdk.player.startResumePlayback(deviceId, spotifyUri);
        }
      } else {
        await this.sdk.player.startResumePlayback(deviceId);
      }

      console.log('Playback started successfully');
    } catch (error) {
      console.log(`Error starting playback: ${error}`);
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

  async addToQueue(spotifyUri: string, device?: Device): Promise<void> {
    try {
      this.logger.debug('Adding track to queue', { spotifyUri, device });

      const deviceId = z.string().optional().parse(device?.id);
      await this.sdk.player.addItemToPlaybackQueue(spotifyUri, deviceId);
    } catch (error) {
      console.log(`Error adding to queue: ${error}`);
      throw error;
    }
  }

  async getQueue(): Promise<any> {
    try {
      const queueInfo = await this.sdk.player.getUsersQueue();
      const currentTrack = await this.getCurrentTrack();

      return {
        currently_playing: currentTrack,
        queue: queueInfo.queue.map((track) => (SpotifyUtils.parseTrack ? SpotifyUtils.parseTrack(track) : track)),
      };
    } catch (error) {
      console.log(`Error getting queue: ${error}`);
      throw error;
    }
  }

  async isTrackPlaying(): Promise<boolean> {
    try {
      const currentTrack = await this.getCurrentTrack();
      return currentTrack?.is_playing || false;
    } catch (error) {
      console.log(`Error checking if track is playing: ${error}`);
      return false;
    }
  }

  async getCurrentUserPlaylists(limit: MaxInt<50> = 50): Promise<any[]> {
    try {
      const user = await this.getUserProfile();
      const playlists = await this.sdk.currentUser.playlists.playlists(limit);
      if (!playlists.items.length) {
        throw new Error('No playlists found.');
      }
      return playlists.items.map((playlist) =>
        SpotifyUtils.parsePlaylist ? SpotifyUtils.parsePlaylist(playlist, user.display_name) : playlist,
      );
    } catch (error) {
      console.log(`Error getting playlists: ${error}`);
      throw error;
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<any[]> {
    try {
      const playlist = await this.sdk.playlists.getPlaylist(playlistId);
      if (!playlist) {
        throw new Error('No playlist found.');
      }
      return SpotifyUtils.parseTracks ? SpotifyUtils.parseTracks(playlist.tracks.items) : playlist.tracks.items;
    } catch (error) {
      console.log(`Error getting playlist tracks: ${error}`);
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
      console.log(`Added tracks ${tracksUris} to playlist ${playlistId}: ${response}`);
    } catch (error) {
      console.log(`Error adding tracks to playlist: ${error}`);
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
      console.log(`Removed tracks ${trackIds} from playlist ${playlistId}: ${response}`);
    } catch (error) {
      console.log(`Error removing tracks from playlist: ${error}`);
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
      console.log('Playlist details changed successfully');
    } catch (error) {
      console.log(`Error changing playlist details: ${error}`);
      throw error;
    }
  }

  async createPlaylist(params: {
    name: string;
    public?: boolean;
    collaborative?: boolean;
    description?: string;
  }): Promise<any> {
    try {
      this.logger.debug('Creating playlist', { params });

      const user = await this.getUserProfile();

      const response = await this.sdk.playlists.createPlaylist(user.id, params);

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

  async previousTrack(deviceId: string): Promise<void> {
    try {
      await this.sdk.player.skipToPrevious(deviceId);
    } catch (error) {
      console.log(`Error going to previous track: ${error}`);
      throw error;
    }
  }
}
