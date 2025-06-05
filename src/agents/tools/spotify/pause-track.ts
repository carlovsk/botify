import { Prompts } from '@/agents/prompts';
import { BaseSpotifySimpleTool } from '@/agents/tools/base/spotify-tool';
import { MessageService } from '@/services/message';

export class PauseTrackTool extends BaseSpotifySimpleTool {
  constructor(userId: string, messageService?: MessageService, chatId?: string | number) {
    super('pauseTrack', Prompts.PauseTrackTool, userId, messageService, chatId);
  }

  protected getStartMessage(): string {
    return '⏸️ Pausing playback...';
  }

  protected getSuccessMessage(): string {
    return '⏸️ Playback paused';
  }

  protected async execute(): Promise<string> {
    if (this.messageService && this.chatId) {
      return this.executeWithStatusUpdates(() => this.performPause());
    }
    return this.performPause();
  }

  private async performPause(): Promise<string> {
    const spotify = await this.getSpotifyProvider();
    const device = await this.validateActiveDevice(spotify);

    await spotify.pausePlayback(device.id);

    return this.formatSuccessResponse(`Paused playback on ${device.name || 'Unknown Device'}`, {
      deviceId: device.id,
      deviceName: device.name || 'Unknown Device',
    });
  }

  static create(userId: string, messageService?: MessageService, chatId?: string | number) {
    return new PauseTrackTool(userId, messageService, chatId);
  }
}
