import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { SpotifyProvider } from '../../../providers/spotify';
import { Prompts } from '../../prompts';

export class PlayTrackTool extends DynamicStructuredTool {
  constructor(userId: string) {
    super({
      name: 'playTrack',
      description: Prompts.PlayTrackTool,
      func: async ({ spotifyUri }: { spotifyUri: string }) => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || device.id === null) {
          const response = 'No active device found';
          return response;
        }

        await spotify.resumePlayback({ spotifyUri, device });
        const response = spotifyUri ? `Started playing ${spotifyUri}` : 'Resumed playback';
        return response;
      },
      schema: z.object({
        spotifyUri: z
          .string()
          .describe('Spotify URI of the track to play (e.g., "spotify:track:4iV5W9uYEdYUVa79Axb7Rh")'),
      }),
    });
  }
}
