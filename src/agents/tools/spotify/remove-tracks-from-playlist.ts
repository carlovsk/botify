import { Prompts } from '@/agents/prompts';
import { SpotifyProvider } from '@/providers/spotify';
import { startLogger } from '@/utils/logger';
import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';

export class RemoveTracksFromPlaylistTool extends DynamicStructuredTool {
  private static logger = startLogger('RemoveTracksFromPlaylistTool');

  constructor(userId: string) {
    super({
      name: 'removeTracksFromPlaylist',
      description: Prompts.RemoveTracksFromPlaylistTool,
      schema: z.object({
        playlistId: z.string().describe('ID of the playlist to remove tracks from'),
        trackIds: z
          .array(z.string())
          .min(1)
          .max(100)
          .describe('Array of Spotify track IDs to remove from the playlist'),
      }),
      func: async ({ playlistId, trackIds }: { playlistId: string; trackIds: string[] }) => {
        RemoveTracksFromPlaylistTool.logger.info('Starting removeTracksFromPlaylist tool execution', {
          userId,
          parameters: { playlistId, trackIds, trackCount: trackIds.length },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        await spotify.removeTracksFromPlaylist(playlistId, trackIds);
        const response = `Removed ${trackIds.length} tracks from playlist ${playlistId}`;

        RemoveTracksFromPlaylistTool.logger.info('removeTracksFromPlaylist tool completed successfully', {
          userId,
          response,
          playlistId,
          tracksRemoved: trackIds.length,
        });
        return response;
      },
    });
  }
}
