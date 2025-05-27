import { tool } from '@langchain/core/tools';
import { SpotifyProvider } from '../spotify';

export class SpotifyTools {
  static skipTrack = tool(
    async () => {
      const spotify = await SpotifyProvider.buildClientWithAuth();
      const device = await spotify.findActiveDevice();

      if (!device || !device.id) {
        return 'No active device found';
      }

      await spotify.skipTrack(1, device.id);
      return 'Skipped to next track';
    },
    {
      name: 'skipTrack',
      description: `
				Use this tool to skip the current track on Spotify. It will find the active device and skip to the next track.
      `,
    },
  );

  static pauseTrack = tool(
    async () => {
      const spotify = await SpotifyProvider.buildClientWithAuth();
      const device = await spotify.findActiveDevice();

      if (!device || device.id === null) {
        return 'No active device found';
      }

      await spotify.pausePlayback(device);
      return 'Paused the current track';
    },
    {
      name: 'pauseTrack',
      description: `
				Use this tool to pause the current track on Spotify. It will find the active device and pause the track playing on it.
      `,
    },
  );

  static listTools() {
    return [SpotifyTools.skipTrack, SpotifyTools.pauseTrack];
  }
}
