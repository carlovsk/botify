import { Prompts } from '@/agents/prompts';
import { SpotifyProvider } from '@/providers/spotify';
import { DynamicTool } from 'langchain/tools';

export class ResumeTrackTool extends DynamicTool {
  constructor(userId: string) {
    super({
      name: 'resumeTrack',
      description: Prompts.ResumeTrackTool,
      func: async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || device.id === null) {
          return 'No active device found';
        }

        await spotify.resumePlayback({ device });

        return 'Resumed the current track';
      },
    });
  }
}
