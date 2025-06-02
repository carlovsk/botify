import { Prompts } from '@/agents/prompts';
import { BaseSpotifySimpleTool } from '@/agents/tools/base/spotify-tool';

export class PauseTrackTool extends BaseSpotifySimpleTool {
  constructor(userId: string) {
    super('pauseTrack', Prompts.PauseTrackTool, userId);
  }

  protected async execute(): Promise<string> {
    const spotify = await this.getSpotifyProvider();
    const device = await this.validateActiveDevice(spotify);

    await spotify.pausePlayback(device.id);

    return this.formatSuccessResponse(`Paused playback on ${device.name || 'Unknown Device'}`, {
      deviceId: device.id,
      deviceName: device.name || 'Unknown Device',
    });
  }

  static create(userId: string) {
    return new PauseTrackTool(userId);
  }
}
