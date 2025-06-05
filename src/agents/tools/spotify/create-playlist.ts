import { Prompts } from '@/agents/prompts';
import { BaseSpotifyStructuredTool, CreatePlaylistParams, ToolSchemas } from '@/agents/tools/base/spotify-tool';
import { MessageService } from '@/services/message';

export class CreatePlaylistTool extends BaseSpotifyStructuredTool<CreatePlaylistParams> {
  constructor(userId: string, messageService?: MessageService, chatId?: string | number) {
    super('createPlaylist', Prompts.CreatePlaylistTool, ToolSchemas.createPlaylist, userId, messageService, chatId);
  }

  protected getStartMessage(params: CreatePlaylistParams): string {
    return `📝 Creating playlist '${params.name}'...`;
  }

  protected getSuccessMessage(params: CreatePlaylistParams): string {
    return `🎉 Playlist '${params.name}' created successfully`;
  }

  protected async execute(params: CreatePlaylistParams): Promise<string> {
    if (this.messageService && this.chatId) {
      return this.executeWithStatusUpdates(params, () => this.performCreatePlaylist(params));
    }
    return this.performCreatePlaylist(params);
  }

  private async performCreatePlaylist(params: CreatePlaylistParams): Promise<string> {
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

  static create(userId: string, messageService?: MessageService, chatId?: string | number) {
    return new CreatePlaylistTool(userId, messageService, chatId);
  }
}
