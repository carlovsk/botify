import { Prompts } from '@/agents/prompts';
import { SpotifyProvider } from '@/providers/spotify';
import { startLogger } from '@/utils/logger';
import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';

export class AddTracksToPlaylistTool extends DynamicStructuredTool {
  private static logger = startLogger('AddTracksToPlaylistTool');

  constructor(userId: string) {
    super({
      name: 'addTracksToPlaylist',
      description: Prompts.AddTracksToPlaylistTool,
      schema: z.object({
        playlistId: z.string().describe('ID of the playlist to add tracks to'),
        tracksUris: z.array(z.string()).min(1).max(100).describe('Array of Spotify track URIs to add to the playlist'),
        position: z
          .number()
          .int()
          .min(0)
          .max(1000)
          .optional()
          .describe('Position in the playlist to insert tracks (default: end of playlist)'),
      }),
      func: async ({
        playlistId,
        tracksUris,
        position,
      }: {
        playlistId: string;
        tracksUris: string[];
        position?: number;
      }) => {
        AddTracksToPlaylistTool.logger.info('Starting addTracksToPlaylist tool execution', {
          userId,
          parameters: { playlistId, tracksUris, position, trackCount: tracksUris.length },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        await spotify.addTracksToPlaylist(playlistId, tracksUris, position);
        const response = `Added ${tracksUris.length} tracks to playlist ${playlistId}`;

        AddTracksToPlaylistTool.logger.info('addTracksToPlaylist tool completed successfully', {
          userId,
          response,
          playlistId,
          tracksAdded: tracksUris.length,
        });
        return response;
      },
    });
  }
}
