import { Prompts } from '@/agents/prompts';
import { BaseSpotifyStructuredTool, PlayTrackParams, ToolSchemas } from '@/agents/tools/base/spotify-tool';

export class PlayTrackTool extends BaseSpotifyStructuredTool<PlayTrackParams> {
  constructor(userId: string) {
    super('playTrack', Prompts.PlayTrackTool, ToolSchemas.playTrack, userId);
  }

  protected async execute(params: PlayTrackParams): Promise<string> {
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

  static create(userId: string) {
    return new PlayTrackTool(userId);
  }
}
