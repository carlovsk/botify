import { Prompts } from '@/agents/prompts';
import { SpotifyProvider } from '@/providers/spotify';
import { startLogger } from '@/utils/logger';
import { MaxInt } from '@spotify/web-api-ts-sdk';
import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';

export class SearchTool extends DynamicStructuredTool {
  private static logger = startLogger('SearchTool');

  constructor(userId: string) {
    super({
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
      func: async ({
        query,
        types,
        limit = 10,
      }: {
        query: string;
        types: ('track' | 'album' | 'artist' | 'playlist')[];
        limit?: MaxInt<50>;
      }) => {
        SearchTool.logger.info('Starting search tool execution', {
          userId,
          parameters: { query, types, limit },
        });

        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const results = await spotify.search(query, types, limit);

        const response = JSON.stringify(results);

        SearchTool.logger.info('search tool completed successfully', {
          userId,
          query,
          types,
          responseLength: response.length,
          resultsCount: results?.tracks?.items?.length || 0,
        });
        return response;
      },
    });
  }
}
