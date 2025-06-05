import { Prompts } from '@/agents/prompts';
import { BaseSpotifyStructuredTool, GetPlaylistTracksParams, ToolSchemas } from '@/agents/tools/base/spotify-tool';
import { MessageService } from '@/services/message';

export class GetPlaylistTracksTool extends BaseSpotifyStructuredTool<GetPlaylistTracksParams> {
  constructor(userId: string, messageService?: MessageService, chatId?: string | number) {
    super(
      'getPlaylistTracks',
      Prompts.GetPlaylistTracksTool,
      ToolSchemas.getPlaylistTracks,
      userId,
      messageService,
      chatId,
    );
  }

  protected getStartMessage(): string {
    return '📋 Getting playlist tracks...';
  }

  protected getSuccessMessage(_params: GetPlaylistTracksParams, result?: any): string {
    const count = result?.data?.tracksCount || 0;
    return `📋 Retrieved ${count} tracks`;
  }

  protected async execute(params: GetPlaylistTracksParams): Promise<string> {
    if (this.messageService && this.chatId) {
      return this.executeWithStatusUpdates(params, () => this.performGetPlaylistTracks(params));
    }
    return this.performGetPlaylistTracks(params);
  }

  private async performGetPlaylistTracks(params: GetPlaylistTracksParams): Promise<string> {
    const { playlistId } = params;

    const spotify = await this.getSpotifyProvider();
    const { tracks } = await spotify.getPlaylistTracks(playlistId);

    const response = JSON.stringify(tracks);

    return this.formatSuccessResponse(response, {
      playlistId,
      tracksCount: tracks?.length || 0,
      responseLength: response.length,
    });
  }

  static create(userId: string, messageService?: MessageService, chatId?: string | number) {
    return new GetPlaylistTracksTool(userId, messageService, chatId);
  }
}
