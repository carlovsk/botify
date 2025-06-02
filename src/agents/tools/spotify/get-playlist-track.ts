import { Prompts } from '@/agents/prompts';
import { BaseSpotifyStructuredTool, GetPlaylistTracksParams, ToolSchemas } from '@/agents/tools/base/spotify-tool';

export class GetPlaylistTracksTool extends BaseSpotifyStructuredTool<GetPlaylistTracksParams> {
  constructor(userId: string) {
    super('getPlaylistTracks', Prompts.GetPlaylistTracksTool, ToolSchemas.getPlaylistTracks, userId);
  }

  protected async execute(params: GetPlaylistTracksParams): Promise<string> {
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

  static create(userId: string) {
    return new GetPlaylistTracksTool(userId);
  }
}
