import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { SpotifyProvider } from '../../../providers/spotify';
import { startLogger } from '../../../utils/logger';
import { Prompts } from '../../prompts';

export class GetPlaylistTracksTool extends DynamicStructuredTool {
  private static logger = startLogger('GetPlaylistTracksTool');

  constructor(userId: string) {
    super({
      name: 'getPlaylistTracks',
      description: Prompts.GetPlaylistTracksTool,
      schema: z.object({
        playlistId: z.string().describe('ID of the playlist to retrieve tracks from'),
      }),
      func: async ({ playlistId }: { playlistId: string }) => {
        GetPlaylistTracksTool.logger.info('Starting getPlaylistTracks tool execution', {
          userId,
          parameters: { playlistId },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);

        const { tracks } = await spotify.getPlaylistTracks(playlistId);

        const response = JSON.stringify(tracks);

        GetPlaylistTracksTool.logger.info('getPlaylistTracks tool completed successfully', {
          userId,
          responseLength: response.length,
          tracksCount: tracks?.length || 0,
          playlistId,
        });

        return response;
      },
    });
  }
}
