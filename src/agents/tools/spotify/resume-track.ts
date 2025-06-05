import { Prompts } from '@/agents/prompts';
import { BaseSpotifySimpleTool } from '@/agents/tools/base/spotify-tool';
import { MessageService } from '@/services/message';

export class ResumeTrackTool extends BaseSpotifySimpleTool {
  constructor(userId: string, messageService?: MessageService, chatId?: string | number) {
    super('resumeTrack', Prompts.ResumeTrackTool, userId, messageService, chatId);
  }

  protected getStartMessage(): string {
    return '▶️ Resuming playback...';
  }

  protected getSuccessMessage(): string {
    return '▶️ Playback resumed';
  }

  protected async execute(): Promise<string> {
    if (this.messageService && this.chatId) {
      return this.executeWithStatusUpdates(() => this.performResume());
    }
    return this.performResume();
  }

  private async performResume(): Promise<string> {
    const spotify = await this.getSpotifyProvider();
    const device = await this.validateActiveDevice(spotify);

    await spotify.resumePlayback({ device });

    return this.formatSuccessResponse(`Resumed playback on ${device.name || 'Unknown Device'}`, {
      deviceId: device.id,
      deviceName: device.name || 'Unknown Device',
    });
  }

  static create(userId: string, messageService?: MessageService, chatId?: string | number) {
    return new ResumeTrackTool(userId, messageService, chatId);
  }
}
