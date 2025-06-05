import { Prompts } from '@/agents/prompts';
import { BaseSpotifyStructuredTool, SearchParams, ToolSchemas } from '@/agents/tools/base/spotify-tool';
import { MessageService } from '@/services/message';

export class SearchTool extends BaseSpotifyStructuredTool<SearchParams> {
  constructor(userId: string, messageService?: MessageService, chatId?: string | number) {
    super('search', Prompts.SearchTool, ToolSchemas.search, userId, messageService, chatId);
  }

  protected getStartMessage(params: SearchParams): string {
    return `🔍 Searching for '${params.query}'...`;
  }

  protected getSuccessMessage(params: SearchParams, result?: any): string {
    const count = result?.data?.resultsCount || 0;
    return `🎵 Found ${count} results for '${params.query}'`;
  }

  protected async execute(params: SearchParams): Promise<string> {
    if (this.messageService && this.chatId) {
      return this.executeWithStatusUpdates(params, () => this.performSearch(params));
    }
    return this.performSearch(params);
  }

  private async performSearch(params: SearchParams): Promise<string> {
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

  static create(userId: string, messageService?: MessageService, chatId?: string | number) {
    return new SearchTool(userId, messageService, chatId);
  }
}
