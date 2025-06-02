import { Prompts } from '@/agents/prompts';
import { AddTracksToPlaylistParams, BaseSpotifyStructuredTool, ToolSchemas } from '@/agents/tools/base/spotify-tool';

export class AddTracksToPlaylistTool extends BaseSpotifyStructuredTool<AddTracksToPlaylistParams> {
  constructor(userId: string) {
    super('addTracksToPlaylist', Prompts.AddTracksToPlaylistTool, ToolSchemas.addTracksToPlaylist, userId);
  }

  protected async execute(params: AddTracksToPlaylistParams): Promise<string> {
    const { playlistId, tracksUris, position } = params;

    const spotify = await this.getSpotifyProvider();
    await spotify.addTracksToPlaylist(playlistId, tracksUris, position);

    return this.formatSuccessResponse(`Added ${tracksUris.length} tracks to playlist ${playlistId}`, {
      playlistId,
      tracksAdded: tracksUris.length,
      position,
    });
  }

  static create(userId: string) {
    return new AddTracksToPlaylistTool(userId);
  }
}
