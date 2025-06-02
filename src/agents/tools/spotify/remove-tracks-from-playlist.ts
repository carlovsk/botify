import { Prompts } from '@/agents/prompts';
import {
  BaseSpotifyStructuredTool,
  RemoveTracksFromPlaylistParams,
  ToolSchemas,
} from '@/agents/tools/base/spotify-tool';

export class RemoveTracksFromPlaylistTool extends BaseSpotifyStructuredTool<RemoveTracksFromPlaylistParams> {
  constructor(userId: string) {
    super(
      'removeTracksFromPlaylist',
      Prompts.RemoveTracksFromPlaylistTool,
      ToolSchemas.removeTracksFromPlaylist,
      userId,
    );
  }

  protected async execute(params: RemoveTracksFromPlaylistParams): Promise<string> {
    const { playlistId, trackIds } = params;

    const spotify = await this.getSpotifyProvider();
    await spotify.removeTracksFromPlaylist(playlistId, trackIds);

    return this.formatSuccessResponse(`Removed ${trackIds.length} tracks from playlist ${playlistId}`, {
      playlistId,
      tracksRemoved: trackIds.length,
    });
  }

  static create(userId: string) {
    return new RemoveTracksFromPlaylistTool(userId);
  }
}
