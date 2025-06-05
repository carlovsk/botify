import { AddTracksToPlaylistTool } from '@/agents/tools/spotify/add-tracks-to-playlist';
import { CreatePlaylistTool } from '@/agents/tools/spotify/create-playlist';
import { GetPlaylistTracksTool } from '@/agents/tools/spotify/get-playlist-track';
import { PauseTrackTool } from '@/agents/tools/spotify/pause-track';
import { PlayTrackTool } from '@/agents/tools/spotify/play-track';
import { RemoveTracksFromPlaylistTool } from '@/agents/tools/spotify/remove-tracks-from-playlist';
import { ResumeTrackTool } from '@/agents/tools/spotify/resume-track';
import { SearchTool } from '@/agents/tools/spotify/search';
import { MessageService } from '@/services/message';
import { DynamicStructuredTool, DynamicTool } from 'langchain/tools';

export class SpotifyTools {
  static listTools(
    userId: string,
    messageService?: MessageService,
    chatId?: string | number,
  ): (DynamicTool | DynamicStructuredTool)[] {
    return [
      AddTracksToPlaylistTool.create(userId, messageService, chatId),
      CreatePlaylistTool.create(userId, messageService, chatId),
      GetPlaylistTracksTool.create(userId, messageService, chatId),
      PauseTrackTool.create(userId, messageService, chatId),
      PlayTrackTool.create(userId, messageService, chatId),
      RemoveTracksFromPlaylistTool.create(userId, messageService, chatId),
      ResumeTrackTool.create(userId, messageService, chatId),
      SearchTool.create(userId, messageService, chatId),
    ];
  }
}
