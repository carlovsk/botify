import { Prompts } from '@/agents/prompts';
import {
  BaseSpotifyStructuredTool,
  RemoveTracksFromPlaylistParams,
  ToolSchemas,
} from '@/agents/tools/base/spotify-tool';
import { MessageService } from '@/services/message';

export class RemoveTracksFromPlaylistTool extends BaseSpotifyStructuredTool<RemoveTracksFromPlaylistParams> {
  constructor(userId: string, messageService?: MessageService, chatId?: string | number) {
    super(
      'removeTracksFromPlaylist',
      Prompts.RemoveTracksFromPlaylistTool,
      ToolSchemas.removeTracksFromPlaylist,
      userId,
      messageService,
      chatId,
    );
  }

  protected getStartMessage(): string {
    return '➖ Removing tracks from playlist...';
  }

  protected getSuccessMessage(params: RemoveTracksFromPlaylistParams, result?: any): string {
    const count = result?.data?.tracksRemoved || params.trackIds.length;
    return `✅ Removed ${count} tracks from playlist`;
  }

  protected async execute(params: RemoveTracksFromPlaylistParams): Promise<string> {
    if (this.messageService && this.chatId) {
      return this.executeWithStatusUpdates(params, () => this.performRemoveTracks(params));
    }
    return this.performRemoveTracks(params);
  }

  private async performRemoveTracks(params: RemoveTracksFromPlaylistParams): Promise<string> {
    const { playlistId, trackIds } = params;

    const spotify = await this.getSpotifyProvider();
    await spotify.removeTracksFromPlaylist(playlistId, trackIds);

    return this.formatSuccessResponse(`Removed ${trackIds.length} tracks from playlist ${playlistId}`, {
      playlistId,
      tracksRemoved: trackIds.length,
    });
  }

  static create(userId: string, messageService?: MessageService, chatId?: string | number) {
    return new RemoveTracksFromPlaylistTool(userId, messageService, chatId);
  }
}
