import { tool } from '@langchain/core/tools';
import { SpotifyProvider } from '../spotify';

export class SpotifyTools {
  static skipTrack = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
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

  static pauseTrack = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
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

  static resumeTrack = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();
        if (!device || device.id === null) {
          return 'No active device found';
        }
        await spotify.resumePlayback({ device });
        return 'Resumed the current track';
      },
      {
        name: 'resumeTrack',
        description: `
        Use this tool to resume the current track on Spotify. It will find the active device and resume playback.
      `,
      },
    );

  static previousTrack = (userId: string) =>
    tool(
      async () => {
        const spotify = await SpotifyProvider.buildClientWithAuth(userId);
        const device = await spotify.findActiveDevice();

        if (!device || device.id === null) {
          return 'No active device found';
        }

        await spotify.previousTrack(device.id);
        return 'Skipped to previous track';
      },
      {
        name: 'previousTrack',
        description: `
        Use this tool to skip to the previous track on Spotify. It will find the active device and skip to the previous track.
      `,
      },
    );

  static listTools(userId: string) {
    return [
      SpotifyTools.skipTrack(userId),
      SpotifyTools.pauseTrack(userId),
      SpotifyTools.resumeTrack(userId),
      SpotifyTools.previousTrack(userId),
    ];
  }
}
