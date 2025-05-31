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
        SpotifyTools.logger.info('Starting skipTrack tool execution', { userId, parameters: { n } });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || !device.id) {
          const response = 'No active device found';
          SpotifyTools.logger.warn('skipTrack tool completed with warning', { userId, response });
          return response;
        }

        await spotify.skipTrack(n, device.id);
        const response = 'Skipped to next track';
        SpotifyTools.logger.info('skipTrack tool completed successfully', { userId, response });
        return response;
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
        SpotifyTools.logger.info('Starting pauseTrack tool execution', { userId });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || device.id === null) {
          const response = 'No active device found';
          SpotifyTools.logger.warn('pauseTrack tool completed with warning', { userId, response });
          return response;
        }

        await spotify.pausePlayback(device);
        const response = 'Paused the current track';
        SpotifyTools.logger.info('pauseTrack tool completed successfully', { userId, response });
        return response;
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
        SpotifyTools.logger.info('Starting resumeTrack tool execution', { userId });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();
        if (!device || device.id === null) {
          const response = 'No active device found';
          SpotifyTools.logger.warn('resumeTrack tool completed with warning', { userId, response });
          return response;
        }
        await spotify.resumePlayback({ device });
        const response = 'Resumed the current track';
        SpotifyTools.logger.info('resumeTrack tool completed successfully', { userId, response });
        return response;
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
        SpotifyTools.logger.info('Starting previousTrack tool execution', { userId });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || device.id === null) {
          const response = 'No active device found';
          SpotifyTools.logger.warn('previousTrack tool completed with warning', { userId, response });
          return response;
        }

        await spotify.previousTrack(device.id);
        const response = 'Skipped to previous track';
        SpotifyTools.logger.info('previousTrack tool completed successfully', { userId, response });
        return response;
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
        SpotifyTools.logger.info('Starting searchTracks tool execution', {
          userId,
          parameters: { query, type, limit },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const results = await spotify.search(query, type, limit);
        const response = JSON.stringify(results);

        SpotifyTools.logger.info('searchTracks tool completed successfully', {
          userId,
          query,
          type,
          responseLength: response.length,
          resultsCount: results?.tracks?.items?.length || 0,
        });
        return response;
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
        SpotifyTools.logger.info('Starting getCurrentTrack tool execution', { userId });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const track = await spotify.getCurrentTrack();
        const response = track ? JSON.stringify(track) : 'No track currently playing';

        SpotifyTools.logger.info('getCurrentTrack tool completed successfully', {
          userId,
          hasTrack: !!track,
          trackName: track?.name || null,
        });
        return response;
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
        SpotifyTools.logger.info('Starting playTrack tool execution', { userId, parameters: { spotifyUri } });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();
        if (!device || device.id === null) {
          const response = 'No active device found';
          SpotifyTools.logger.warn('playTrack tool completed with warning', { userId, response });
          return response;
        }
        await spotify.resumePlayback({ spotifyUri, device });
        const response = spotifyUri ? `Started playing ${spotifyUri}` : 'Resumed playback';

        SpotifyTools.logger.info('playTrack tool completed successfully', { userId, response, spotifyUri });
        return response;
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
        SpotifyTools.logger.info('Starting addToQueue tool execution', { userId, parameters: { spotifyUri } });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();
        await spotify.addToQueue(spotifyUri, device || undefined);
        const response = `Added track ${spotifyUri} to queue`;

        SpotifyTools.logger.info('addToQueue tool completed successfully', { userId, response, spotifyUri });
        return response;
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
        SpotifyTools.logger.info('Starting getQueue tool execution', { userId });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const queue = await spotify.getQueue();
        const response = JSON.stringify(queue);

        SpotifyTools.logger.info('getQueue tool completed successfully', {
          userId,
          responseLength: response.length,
          queueLength: queue?.queue?.length || 0,
        });
        return response;
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
        SpotifyTools.logger.info('Starting createPlaylist tool execution', {
          userId,
          parameters: { name, isPublic, collaborative, description },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const playlist = await spotify.createPlaylist({
          name,
          public: isPublic,
          collaborative,
          description,
        });
        const response = `Created playlist "${name}" with ID: ${playlist.id}`;

        SpotifyTools.logger.info('createPlaylist tool completed successfully', {
          userId,
          response,
          playlistId: playlist.id,
          playlistName: name,
        });
        return response;
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
        SpotifyTools.logger.info('Starting getUserPlaylists tool execution', { userId, parameters: { limit } });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const playlists = await spotify.getCurrentUserPlaylists(limit);
        const response = JSON.stringify(playlists);

        SpotifyTools.logger.info('getUserPlaylists tool completed successfully', {
          userId,
          responseLength: response.length,
          playlistsCount: playlists?.length || 0,
        });
        return response;
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
        SpotifyTools.logger.info('Starting getPlaylistTracks tool execution', { userId, parameters: { playlistId } });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const tracks = await spotify.getPlaylistTracks(playlistId);
        const response = JSON.stringify(tracks);

        SpotifyTools.logger.info('getPlaylistTracks tool completed successfully', {
          userId,
          responseLength: response.length,
          tracksCount: tracks?.length || 0,
          playlistId,
        });
        return response;
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
      async ({ playlistId, tracksUris, position }: { playlistId: string; tracksUris: string[]; position?: number }) => {
        SpotifyTools.logger.info('Starting addTracksToPlaylist tool execution', {
          userId,
          parameters: { playlistId, tracksUris, position, trackCount: tracksUris.length },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        await spotify.addTracksToPlaylist(playlistId, tracksUris, position);
        const response = `Added ${tracksUris.length} tracks to playlist ${playlistId}`;

        SpotifyTools.logger.info('addTracksToPlaylist tool completed successfully', {
          userId,
          response,
          playlistId,
          tracksAdded: tracksUris.length,
        });
        return response;
      },
      {
        name: 'addTracksToPlaylist',
        description: `
        Add tracks to a playlist. Requires playlistId and tracksUris array. Optional position parameter.
        `,
        schema: z.object({
          playlistId: z.string().describe('ID of the playlist to add tracks to'),
          tracksUris: z
            .array(z.string())
            .min(1)
            .max(100)
            .describe('Array of Spotify track URIs to add to the playlist'),
          position: z
            .number()
            .int()
            .min(0)
            .max(1000)
            .optional()
            .describe('Position in the playlist to insert tracks (default: end of playlist)'),
        }),
      },
    );

  static removeTracksFromPlaylist = (userId: string) =>
    tool(
      async ({ playlistId, trackIds }: { playlistId: string; trackIds: string[] }) => {
        SpotifyTools.logger.info('Starting removeTracksFromPlaylist tool execution', {
          userId,
          parameters: { playlistId, trackIds, trackCount: trackIds.length },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        await spotify.removeTracksFromPlaylist(playlistId, trackIds);
        const response = `Removed ${trackIds.length} tracks from playlist ${playlistId}`;

        SpotifyTools.logger.info('removeTracksFromPlaylist tool completed successfully', {
          userId,
          response,
          playlistId,
          tracksRemoved: trackIds.length,
        });
        return response;
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
        SpotifyTools.logger.info('Starting changePlaylistDetails tool execution', {
          userId,
          parameters: { playlistId, name, description },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        await spotify.changePlaylistDetails(playlistId, name, description);
        const response = `Updated playlist ${playlistId} details`;

        SpotifyTools.logger.info('changePlaylistDetails tool completed successfully', {
          userId,
          response,
          playlistId,
          updatedName: !!name,
          updatedDescription: !!description,
        });
        return response;
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
        SpotifyTools.logger.info('Starting getDevices tool execution', { userId });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const devices = await spotify.getDevices();
        const response = JSON.stringify(devices);

        SpotifyTools.logger.info('getDevices tool completed successfully', {
          userId,
          responseLength: response.length,
          devicesCount: devices?.length || 0,
        });
        return response;
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
        SpotifyTools.logger.info('Starting getRecommendations tool execution', {
          userId,
          parameters: {
            artists,
            tracks,
            limit,
            artistsCount: artists?.length || 0,
            tracksCount: tracks?.length || 0,
          },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const recommendations = await spotify.recommendations(artists, tracks, limit);
        const response = JSON.stringify(recommendations);

        SpotifyTools.logger.info('getRecommendations tool completed successfully', {
          userId,
          responseLength: response.length,
          recommendationsCount: recommendations?.tracks?.length || 0,
        });
        return response;
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
        SpotifyTools.logger.info('Starting getItemInfo tool execution', { userId, parameters: { spotifyUri } });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const info = await spotify.getInfo(spotifyUri);
        const response = JSON.stringify(info);

        SpotifyTools.logger.info('getItemInfo tool completed successfully', {
          userId,
          responseLength: response.length,
          spotifyUri,
          itemType: spotifyUri.split(':')[1] || 'unknown',
        });
        return response;
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
