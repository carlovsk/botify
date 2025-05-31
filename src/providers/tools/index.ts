import { tool } from '@langchain/core/tools';
import { MaxInt } from '@spotify/web-api-ts-sdk';
import { z } from 'zod';
import { startLogger } from '../../utils/logger';
import { Prompts } from '../prompts';
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
        description: Prompts.SkipTrackTool,
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
        description: Prompts.PauseTrackTool,
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
        description: Prompts.ResumeTrackTool,
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
        description: Prompts.PreviousTrackTool,
      },
    );

  static search = (userId: string) =>
    tool(
      async ({
        query,
        types,
        limit = 10,
      }: {
        query: string;
        types: ('track' | 'album' | 'artist' | 'playlist')[];
        limit?: MaxInt<50>;
      }) => {
        SpotifyTools.logger.info('Starting search tool execution', {
          userId,
          parameters: { query, types, limit },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const results = await spotify.search(query, types, limit);

        const response = JSON.stringify(results);

        SpotifyTools.logger.info('search tool completed successfully', {
          userId,
          query,
          types,
          responseLength: response.length,
          resultsCount: results?.tracks?.items?.length || 0,
        });
        return response;
      },
      {
        name: 'search',
        description: Prompts.SearchTool,
        schema: z.object({
          query: z.string().describe('Search query'),
          types: z
            .enum(['track', 'album', 'artist', 'playlist'])
            .array()
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

        const res = await spotify.getCurrentTrack();
        const track = res?.track;

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
        description: Prompts.GetCurrentTrackTool,
      },
    );

  static playTrack = (userId: string) =>
    tool(
      async ({ spotifyUri }: { spotifyUri: string }) => {
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
        description: Prompts.PlayTrackTool,
        schema: z.object({
          spotifyUri: z
            .string()
            .describe('Spotify URI of the track to play (e.g., "spotify:track:4iV5W9uYEdYUVa79Axb7Rh")'),
        }),
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
        description: Prompts.AddToQueueTool,
        schema: z.object({
          spotifyUri: z.string().describe('Spotify track ID to add to the queue'),
        }),
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

        const { user } = await spotify.getUserProfile();
        const playlist = await spotify.createPlaylist({
          name,
          userId: user.id,
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
        description: Prompts.CreatePlaylistTool,
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

        const { user } = await spotify.getUserProfile();
        const { playlists } = await spotify.getCurrentUserPlaylists(limit);
        const response = JSON.stringify({ user, playlists });

        SpotifyTools.logger.info('getUserPlaylists tool completed successfully', {
          userId,
          playlistsCount: playlists.length,
        });

        return response;
      },
      {
        name: 'getUserPlaylists',
        description: Prompts.GetUserPlaylistsTool,
      },
    );

  static getPlaylistTracks = (userId: string) =>
    tool(
      async ({ playlistId }: { playlistId: string }) => {
        SpotifyTools.logger.info('Starting getPlaylistTracks tool execution', { userId, parameters: { playlistId } });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const { tracks } = await spotify.getPlaylistTracks(playlistId);
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
        description: Prompts.GetPlaylistTracksTool,
        schema: z.object({
          playlistId: z.string().describe('ID of the playlist to retrieve tracks from'),
        }),
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
        description: Prompts.AddTracksToPlaylistTool,
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
        description: Prompts.RemoveTracksFromPlaylistTool,
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
        description: Prompts.ChangePlaylistDetailsTool,
      },
    );

  static listTools(userId: string) {
    return [
      SpotifyTools.skipTrack(userId),
      SpotifyTools.pauseTrack(userId),
      SpotifyTools.resumeTrack(userId),
      SpotifyTools.previousTrack(userId),
      SpotifyTools.search(userId),
      SpotifyTools.getCurrentTrack(userId),
      SpotifyTools.playTrack(userId),
      SpotifyTools.addToQueue(userId),
      SpotifyTools.createPlaylist(userId),
      SpotifyTools.getUserPlaylists(userId),
      SpotifyTools.getPlaylistTracks(userId),
      SpotifyTools.addTracksToPlaylist(userId),
      SpotifyTools.removeTracksFromPlaylist(userId),
      SpotifyTools.changePlaylistDetails(userId),
    ];
  }
}
