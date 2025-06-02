import { AddTracksToPlaylistTool } from '@/agents/tools/spotify/add-tracks-to-playlist';
import { CreatePlaylistTool } from '@/agents/tools/spotify/create-playlist';
import { GetPlaylistTracksTool } from '@/agents/tools/spotify/get-playlist-track';
import { PauseTrackTool } from '@/agents/tools/spotify/pause-track';
import { PlayTrackTool } from '@/agents/tools/spotify/play-track';
import { RemoveTracksFromPlaylistTool } from '@/agents/tools/spotify/remove-tracks-from-playlist';
import { ResumeTrackTool } from '@/agents/tools/spotify/resume-track';
import { SearchTool } from '@/agents/tools/spotify/search';
import { DynamicStructuredTool, DynamicTool } from 'langchain/tools';

export class SpotifyTools {
  static listTools(userId: string): (DynamicTool | DynamicStructuredTool)[] {
    return [
      new AddTracksToPlaylistTool(userId),
      new CreatePlaylistTool(userId),
      new GetPlaylistTracksTool(userId),
      new PauseTrackTool(userId),
      new PlayTrackTool(userId),
      new RemoveTracksFromPlaylistTool(userId),
      new ResumeTrackTool(userId),
      new SearchTool(userId),
    ];
  }
}
