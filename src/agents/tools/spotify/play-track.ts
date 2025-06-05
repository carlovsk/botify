import { Prompts } from '@/agents/prompts';
import { BaseSpotifyStructuredTool, PlayTrackParams, ToolSchemas } from '@/agents/tools/base/spotify-tool';
import { MessageService } from '@/services/message';

export class PlayTrackTool extends BaseSpotifyStructuredTool<PlayTrackParams> {
  constructor(userId: string, messageService?: MessageService, chatId?: string | number) {
    super('playTrack', Prompts.PlayTrackTool, ToolSchemas.playTrack, userId, messageService, chatId);
  }

  protected getStartMessage(): string {
    return '▶️ Starting playback...';
  }

  protected getSuccessMessage(params: PlayTrackParams): string {
    // Extract track info from URI if possible
    const uriParts = params.spotifyUri.split(':');
    const trackId = uriParts[uriParts.length - 1];
    return `🎵 Now playing track (${trackId})`;
  }

  protected async execute(params: PlayTrackParams): Promise<string> {
    if (this.messageService && this.chatId) {
      return this.executeWithStatusUpdates(params, () => this.performPlayTrack(params));
    }
    return this.performPlayTrack(params);
  }

  private async performPlayTrack(params: PlayTrackParams): Promise<string> {
    const { spotifyUri } = params;

    const spotify = await this.getSpotifyProvider();
    const device = await this.validateActiveDevice(spotify);

    await spotify.resumePlayback({
      spotifyUri,
      device: device,
    });

    return this.formatSuccessResponse(`Started playing ${spotifyUri} on ${device.name || 'Unknown Device'}`, {
      spotifyUri,
      deviceId: device.id,
      deviceName: device.name || 'Unknown Device',
    });
  }

  static create(userId: string, messageService?: MessageService, chatId?: string | number) {
    return new PlayTrackTool(userId, messageService, chatId);
  }
}
