import { tool } from '@langchain/core/tools';
import { MaxInt } from '@spotify/web-api-ts-sdk';
import { z } from 'zod';
import { startLogger } from '../../utils/logger';
import { SpotifyProvider } from '../spotify';

export class SpotifyTools {
  private static logger = startLogger('SpotifyTools');

  static skipTrack = (userId: string) =>
    tool(
      async ({ n }: { n: number }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || !device.id) {
          return 'No active device found';
        }

        await spotify.skipTrack(n, device.id);
        return 'Skipped to next track';
      },
      {
        name: 'skipTrack',
        description: `
				Use this tool to skip the current track on Spotify. It will find the active device and skip to the next track.
      `,
        schema: z.object({
          n: z.number().min(1).max(10).default(1).describe('Number of tracks to skip (default: 1, max: 10)'),
        }),
      },
    );

  static pauseTrack = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || device.id === null) {
          return 'No active device found';
        }

        await spotify.pausePlayback(device);
        return 'Paused the current track';
      },
      {
        name: 'pauseTrack',
        description: `
				Use this tool to pause the current track on Spotify. It will find the active device and pause the track playing on it.
      `,
      },
    );

  static resumeTrack = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();
        if (!device || device.id === null) {
          return 'No active device found';
        }
        await spotify.resumePlayback({ device });
        return 'Resumed the current track';
      },
      {
        name: 'resumeTrack',
        description: `
        Use this tool to resume the current track on Spotify. It will find the active device and resume playback.
      `,
      },
    );

  static previousTrack = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || device.id === null) {
          return 'No active device found';
        }

        await spotify.previousTrack(device.id);
        return 'Skipped to previous track';
      },
      {
        name: 'previousTrack',
        description: `
        Use this tool to skip to the previous track on Spotify. It will find the active device and skip to the previous track.
      `,
      },
    );

  static searchTracks = (userId: string) =>
    tool(
      async ({ query, type = 'track', limit = 10 }: { query: string; type?: string; limit?: MaxInt<50> }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const results = await spotify.search(query, type, limit);
        return JSON.stringify(results);
      },
      {
        name: 'searchTracks',
        description: `
        Search for tracks, albums, artists, or playlists on Spotify. 
        Parameters: query (required), type (track,album,artist,playlist - default: track), limit (default: 10, range 1-50).
        `,
        schema: z.object({
          query: z.string().describe('Search query'),
          type: z
            .enum(['track', 'album', 'artist', 'playlist'])
            .default('track')
            .describe('Type of item to search for (track, album, artist, playlist)'),
          limit: z.number().min(1).max(50).default(10).describe('Number of results to return (1-50)'),
        }),
      },
    );

  static getCurrentTrack = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const track = await spotify.getCurrentTrack();
        return track ? JSON.stringify(track) : 'No track currently playing';
      },
      {
        name: 'getCurrentTrack',
        description: `
        Get information about the currently playing track on Spotify.
        `,
      },
    );

  static playTrack = (userId: string) =>
    tool(
      async ({ spotifyUri }: { spotifyUri?: string }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();
        if (!device || device.id === null) {
          return 'No active device found';
        }
        await spotify.resumePlayback({ spotifyUri, device });
        return spotifyUri ? `Started playing ${spotifyUri}` : 'Resumed playback';
      },
      {
        name: 'playTrack',
        description: `
        Play a specific track or resume playback. Provide spotifyUri to play a specific track, or leave empty to resume current playback.
        `,
      },
    );

  static addToQueue = (userId: string) =>
    tool(
      async ({ spotifyUri }: { spotifyUri: string }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();
        await spotify.addToQueue(spotifyUri, device || undefined);
        return `Added track ${spotifyUri} to queue`;
      },
      {
        name: 'addToQueue',
        description: `
          Add a track to the playback queue. Requires spotifyUri parameter.
        `,
        schema: z.object({
          spotifyUri: z.string().describe('Spotify track ID to add to the queue'),
        }),
      },
    );

  static getQueue = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const queue = await spotify.getQueue();
        return JSON.stringify(queue);
      },
      {
        name: 'getQueue',
        description: `
        Get the current playback queue and currently playing track.
        `,
      },
    );

  static createPlaylist = (userId: string) =>
    tool(
      async ({
        name,
        isPublic = false,
        collaborative = false,
        description,
      }: {
        name: string;
        isPublic?: boolean;
        collaborative?: boolean;
        description?: string;
      }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const playlist = await spotify.createPlaylist(userId, {
          name,
          public: isPublic,
          collaborative,
          description,
        });
        return `Created playlist "${name}" with ID: ${playlist.id}`;
      },
      {
        name: 'createPlaylist',
        description: `
        Create a new playlist for the user. Requires name parameter. Optional: isPublic (default: false), collaborative (default: false), description.
        `,
        schema: z.object({
          name: z.string().describe('Name of the playlist'),
          isPublic: z.boolean().default(false).describe('Whether the playlist should be public (default: false)'),
          collaborative: z
            .boolean()
            .default(false)
            .describe('Whether the playlist should be collaborative (default: false)'),
          description: z.string().optional().describe('Description for the playlist'),
        }),
      },
    );

  static getUserPlaylists = (userId: string) =>
    tool(
      async ({ limit = 20 }: { limit?: MaxInt<50> } = {}) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const playlists = await spotify.getCurrentUserPlaylists(limit);
        return JSON.stringify(playlists);
      },
      {
        name: 'getUserPlaylists',
        description: `
        Get the current user's playlists. Optional limit parameter (default: 20, range 1-50).
        `,
      },
    );

  static getPlaylistTracks = (userId: string) =>
    tool(
      async ({ playlistId }: { playlistId: string }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const tracks = await spotify.getPlaylistTracks(playlistId);
        return JSON.stringify(tracks);
      },
      {
        name: 'getPlaylistTracks',
        description: `
        Get tracks from a specific playlist. Requires playlistId parameter.
        `,
      },
    );

  static addTracksToPlaylist = (userId: string) =>
    tool(
      async ({ playlistId, trackIds, position }: { playlistId: string; trackIds: string[]; position?: number }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        await spotify.addTracksToPlaylist(playlistId, trackIds, position);
        return `Added ${trackIds.length} tracks to playlist ${playlistId}`;
      },
      {
        name: 'addTracksToPlaylist',
        description: `
        Add tracks to a playlist. Requires playlistId and trackIds array. Optional position parameter.
        `,
      },
    );

  static removeTracksFromPlaylist = (userId: string) =>
    tool(
      async ({ playlistId, trackIds }: { playlistId: string; trackIds: string[] }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        await spotify.removeTracksFromPlaylist(playlistId, trackIds);
        return `Removed ${trackIds.length} tracks from playlist ${playlistId}`;
      },
      {
        name: 'removeTracksFromPlaylist',
        description: `
        Remove tracks from a playlist. Requires playlistId and trackIds array.
        `,
      },
    );

  static changePlaylistDetails = (userId: string) =>
    tool(
      async ({ playlistId, name, description }: { playlistId: string; name?: string; description?: string }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        await spotify.changePlaylistDetails(playlistId, name, description);
        return `Updated playlist ${playlistId} details`;
      },
      {
        name: 'changePlaylistDetails',
        description: `
        Change playlist name and/or description. Requires playlistId, optional name and description parameters.
        `,
      },
    );

  static getDevices = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const devices = await spotify.getDevices();
        return JSON.stringify(devices);
      },
      {
        name: 'getDevices',
        description: `
        Get all available Spotify devices for the user.
        `,
      },
    );

  static getRecommendations = (userId: string) =>
    tool(
      async ({ artists, tracks, limit = 20 }: { artists?: string[]; tracks?: string[]; limit?: MaxInt<50> } = {}) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const recommendations = await spotify.recommendations(artists, tracks, limit);
        return JSON.stringify(recommendations);
      },
      {
        name: 'getRecommendations',
        description: `
        Get track recommendations based on seed artists and/or tracks. Optional parameters: artists array, tracks array, limit (default: 20, range 1-50).
        `,
      },
    );

  static getItemInfo = (userId: string) =>
    tool(
      async ({ spotifyUri }: { spotifyUri: string }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const info = await spotify.getInfo(spotifyUri);
        return JSON.stringify(info);
      },
      {
        name: 'getItemInfo',
        description: `
        Get detailed information about a Spotify item (track, album, artist, or playlist). Requires spotifyUri parameter.
        `,
      },
    );

  static listTools(userId: string) {
    return [
      SpotifyTools.skipTrack(userId),
      SpotifyTools.pauseTrack(userId),
      SpotifyTools.resumeTrack(userId),
      SpotifyTools.previousTrack(userId),
      SpotifyTools.searchTracks(userId),
      SpotifyTools.getCurrentTrack(userId),
      SpotifyTools.playTrack(userId),
      SpotifyTools.addToQueue(userId),
      SpotifyTools.getQueue(userId),
      SpotifyTools.createPlaylist(userId),
      SpotifyTools.getUserPlaylists(userId),
      SpotifyTools.getPlaylistTracks(userId),
      SpotifyTools.addTracksToPlaylist(userId),
      SpotifyTools.removeTracksFromPlaylist(userId),
      SpotifyTools.changePlaylistDetails(userId),
      SpotifyTools.getDevices(userId),
      SpotifyTools.getRecommendations(userId),
      SpotifyTools.getItemInfo(userId),
    ];
  }
}
