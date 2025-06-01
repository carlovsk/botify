import { DynamicStructuredTool, DynamicTool } from 'langchain/tools';
import { AddTracksToPlaylistTool } from './spotify/add-tracks-to-playlist';
import { CreatePlaylistTool } from './spotify/create-playlist';
import { GetPlaylistTracksTool } from './spotify/get-playlist-track';
import { PauseTrackTool } from './spotify/pause-track';
import { PlayTrackTool } from './spotify/play-track';
import { RemoveTracksFromPlaylistTool } from './spotify/remove-tracks-from-playlist';
import { ResumeTrackTool } from './spotify/resume-track';
import { SearchTool } from './spotify/search';

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
