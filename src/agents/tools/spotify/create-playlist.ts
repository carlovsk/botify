import { Prompts } from '@/agents/prompts';
import { BaseSpotifyStructuredTool, CreatePlaylistParams, ToolSchemas } from '@/agents/tools/base/spotify-tool';

export class CreatePlaylistTool extends BaseSpotifyStructuredTool<CreatePlaylistParams> {
  constructor(userId: string) {
    super('createPlaylist', Prompts.CreatePlaylistTool, ToolSchemas.createPlaylist, userId);
  }

  protected async execute(params: CreatePlaylistParams): Promise<string> {
    const { name, isPublic = false, collaborative = false, description } = params;

    const spotify = await this.getSpotifyProvider();
    const { user } = await spotify.getUserProfile();

    const playlist = await spotify.createPlaylist({
      name,
      userId: user.id,
      public: isPublic,
      collaborative,
      description,
    });

    return this.formatSuccessResponse(`Created playlist "${name}" with ID: ${playlist.id}`, {
      playlistId: playlist.id,
      playlistName: name,
      isPublic,
      collaborative,
      description,
    });
  }

  static create(userId: string) {
    return new CreatePlaylistTool(userId);
  }
}
