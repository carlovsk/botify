import { Prompts } from '@/agents/prompts';
import { BaseSpotifyStructuredTool, SearchParams, ToolSchemas } from '@/agents/tools/base/spotify-tool';

export class SearchTool extends BaseSpotifyStructuredTool<SearchParams> {
  constructor(userId: string) {
    super('search', Prompts.SearchTool, ToolSchemas.search, userId);
  }

  protected async execute(params: SearchParams): Promise<string> {
    const { query, types = ['track'], limit = 10 } = params;

    const spotify = await this.getSpotifyProvider();
    const results = await spotify.search(query, types, limit as any);

    const response = JSON.stringify(results);
    const resultsCount = results?.tracks?.items?.length || 0;

    return this.formatSuccessResponse(response, {
      query,
      types,
      responseLength: response.length,
      resultsCount,
    });
  }

  static create(userId: string) {
    return new SearchTool(userId);
  }
}
