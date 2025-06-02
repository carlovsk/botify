import { Prompts } from '@/agents/prompts';
import { BaseSpotifySimpleTool } from '@/agents/tools/base/spotify-tool';

export class ResumeTrackTool extends BaseSpotifySimpleTool {
  constructor(userId: string) {
    super('resumeTrack', Prompts.ResumeTrackTool, userId);
  }

  protected async execute(): Promise<string> {
    const spotify = await this.getSpotifyProvider();
    const device = await this.validateActiveDevice(spotify);

    await spotify.resumePlayback({ device });

    return this.formatSuccessResponse(`Resumed playback on ${device.name || 'Unknown Device'}`, {
      deviceId: device.id,
      deviceName: device.name || 'Unknown Device',
    });
  }

  static create(userId: string) {
    return new ResumeTrackTool(userId);
  }
}
