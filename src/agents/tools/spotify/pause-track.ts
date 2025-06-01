import { DynamicTool } from 'langchain/tools';
import { SpotifyProvider } from '../../../providers/spotify';
import { Prompts } from '../../prompts';

export class PauseTrackTool extends DynamicTool {
  constructor(userId: string) {
    super({
      name: 'pauseTrack',
      description: Prompts.PauseTrackTool,
      func: async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || device.id === null) {
          return 'No active device found';
        }

        await spotify.pausePlayback(device);
        return 'Paused the current track';
      },
    });
  }
}
