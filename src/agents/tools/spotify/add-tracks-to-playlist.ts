import { Prompts } from '@/agents/prompts';
import { AddTracksToPlaylistParams, BaseSpotifyStructuredTool, ToolSchemas } from '@/agents/tools/base/spotify-tool';
import { MessageService } from '@/services/message';

export class AddTracksToPlaylistTool extends BaseSpotifyStructuredTool<AddTracksToPlaylistParams> {
  constructor(userId: string, messageService?: MessageService, chatId?: string | number) {
    super(
      'addTracksToPlaylist',
      Prompts.AddTracksToPlaylistTool,
      ToolSchemas.addTracksToPlaylist,
      userId,
      messageService,
      chatId,
    );
  }

  protected getStartMessage(): string {
    return '➕ Adding tracks to playlist...';
  }

  protected getSuccessMessage(params: AddTracksToPlaylistParams, result?: any): string {
    const count = result?.data?.tracksAdded || params.tracksUris.length;
    return `✅ Added ${count} tracks to playlist`;
  }

  protected async execute(params: AddTracksToPlaylistParams): Promise<string> {
    if (this.messageService && this.chatId) {
      return this.executeWithStatusUpdates(params, () => this.performAddTracks(params));
    }
    return this.performAddTracks(params);
  }

  private async performAddTracks(params: AddTracksToPlaylistParams): Promise<string> {
    const { playlistId, tracksUris, position } = params;

    const spotify = await this.getSpotifyProvider();
    await spotify.addTracksToPlaylist(playlistId, tracksUris, position);

    return this.formatSuccessResponse(`Added ${tracksUris.length} tracks to playlist ${playlistId}`, {
      playlistId,
      tracksAdded: tracksUris.length,
      position,
    });
  }

  static create(userId: string, messageService?: MessageService, chatId?: string | number) {
    return new AddTracksToPlaylistTool(userId, messageService, chatId);
  }
}
