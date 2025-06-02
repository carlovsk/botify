import { Prompts } from '@/agents/prompts';
import { SpotifyProvider } from '@/providers/spotify';
import { startLogger } from '@/utils/logger';
import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';

export class CreatePlaylistTool extends DynamicStructuredTool {
  private static logger = startLogger('CreatePlaylistTool');

  constructor(userId: string) {
    super({
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
      func: async ({
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
        CreatePlaylistTool.logger.info('Starting createPlaylist tool execution', {
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

        CreatePlaylistTool.logger.info('createPlaylist tool completed successfully', {
          userId,
          response,
          playlistId: playlist.id,
          playlistName: name,
        });

        return response;
      },
    });
  }
}
