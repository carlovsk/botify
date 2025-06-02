import { SpotifyProvider } from '@/providers/spotify';
import { ErrorHandler } from '@/utils/error-handler';
import { startLogger } from '@/utils/logger';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';

// Common Zod schemas used across tools
export const CommonSchemas = {
  playlistId: z.string().min(1, 'Playlist ID is required'),
  trackId: z.string().min(1, 'Track ID is required'),
  trackIds: z.array(z.string().min(1)).min(1, 'At least one track ID is required'),
  spotifyUri: z.string().min(1, 'Spotify URI is required'),
  query: z.string().min(1, 'Search query cannot be empty'),
  types: z
    .array(z.enum(['track', 'artist', 'album', 'playlist']))
    .min(1)
    .default(['track']),
  limit: z.number().int().min(1).max(50).default(20),
  playlistName: z.string().min(1, 'Playlist name is required').describe('Name of the playlist'),
  isPublic: z.boolean().default(false).describe('Whether the playlist should be public (default: false)'),
  collaborative: z.boolean().default(false).describe('Whether the playlist should be collaborative (default: false)'),
  description: z.string().optional().describe('Description for the playlist'),
  position: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .describe('Position in the playlist to insert tracks (default: end of playlist)'),
  tracksUris: z
    .array(z.string().min(1, 'Spotify URI is required'))
    .min(1, 'At least one track URI is required')
    .max(100, 'Cannot add more than 100 tracks at once')
    .describe('Array of Spotify track URIs'),
};

// Tool-specific schemas
export const ToolSchemas = {
  search: z.object({
    query: CommonSchemas.query,
    types: CommonSchemas.types.optional(),
    limit: CommonSchemas.limit.optional(),
  }),
  playTrack: z.object({
    spotifyUri: CommonSchemas.spotifyUri,
  }),
  createPlaylist: z.object({
    name: CommonSchemas.playlistName,
    isPublic: CommonSchemas.isPublic.optional(),
    collaborative: CommonSchemas.collaborative.optional(),
    description: CommonSchemas.description,
  }),
  getPlaylistTracks: z.object({
    playlistId: CommonSchemas.playlistId,
  }),
  addTracksToPlaylist: z.object({
    playlistId: CommonSchemas.playlistId,
    tracksUris: CommonSchemas.tracksUris,
    position: CommonSchemas.position,
  }),
  removeTracksFromPlaylist: z.object({
    playlistId: CommonSchemas.playlistId,
    trackIds: z
      .array(z.string().min(1, 'Track ID is required'))
      .min(1, 'At least one track ID is required')
      .max(100, 'Cannot remove more than 100 tracks at once')
      .describe('Array of Spotify track IDs to remove from the playlist'),
  }),
};

// Inferred types from schemas
export type SearchParams = z.infer<typeof ToolSchemas.search>;
export type PlayTrackParams = z.infer<typeof ToolSchemas.playTrack>;
export type CreatePlaylistParams = z.infer<typeof ToolSchemas.createPlaylist>;
export type GetPlaylistTracksParams = z.infer<typeof ToolSchemas.getPlaylistTracks>;
export type AddTracksToPlaylistParams = z.infer<typeof ToolSchemas.addTracksToPlaylist>;
export type RemoveTracksFromPlaylistParams = z.infer<typeof ToolSchemas.removeTracksFromPlaylist>;

// Base class for tools with structured parameters
export abstract class BaseSpotifyStructuredTool<T> extends DynamicStructuredTool {
  protected userId: string;
  private logger = startLogger('BaseSpotifyStructuredTool');

  constructor(name: string, description: string, schema: z.ZodType<T>, userId: string) {
    super({
      name,
      description,
      schema,
      func: async (input: T) => {
        return this.executeWithErrorHandling(() => this.execute(input));
      },
    });
    this.userId = userId;
  }

  protected abstract execute(params: T): Promise<string>;

  protected async getSpotifyProvider(): Promise<SpotifyProvider> {
    return SpotifyProvider.buildClientWithAuth(this.userId);
  }

  protected async validateActiveDevice(spotify: SpotifyProvider): Promise<any> {
    const device = await spotify.findActiveDevice();
    if (!device) {
      throw ErrorHandler.createSpotifyError(
        'No active device found. Please open Spotify on a device and start playing something.',
      );
    }
    return device;
  }

  protected formatSuccessResponse(message: string, data?: any): string {
    const response = { success: true, message, data };
    return JSON.stringify(response, null, 2);
  }

  protected async executeWithErrorHandling<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    try {
      this.logger.info(`Executing ${this.name} for user ${this.userId}`);
      const result = await operation();
      this.logger.info(`Successfully executed ${this.name}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in ${this.name}:`, { error: error instanceof Error ? error.message : String(error) });
      throw ErrorHandler.handleError(error, { userId: this.userId, operation: this.name });
    }
  }
}

// Base class for simple tools without parameters
export abstract class BaseSpotifySimpleTool extends DynamicTool {
  protected userId: string;
  private logger = startLogger('BaseSpotifySimpleTool');

  constructor(name: string, description: string, userId: string) {
    super({
      name,
      description,
      func: async () => {
        return this.executeWithErrorHandling(() => this.execute());
      },
    });
    this.userId = userId;
  }

  protected abstract execute(): Promise<string>;

  protected async getSpotifyProvider(): Promise<SpotifyProvider> {
    return SpotifyProvider.buildClientWithAuth(this.userId);
  }

  protected async validateActiveDevice(spotify: SpotifyProvider): Promise<any> {
    const device = await spotify.findActiveDevice();
    if (!device) {
      throw ErrorHandler.createSpotifyError(
        'No active device found. Please open Spotify on a device and start playing something.',
      );
    }
    return device;
  }

  protected formatSuccessResponse(message: string, data?: any): string {
    const response = { success: true, message, data };
    return JSON.stringify(response, null, 2);
  }

  protected async executeWithErrorHandling<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    try {
      this.logger.info(`Executing ${this.name} for user ${this.userId}`);
      const result = await operation();
      this.logger.info(`Successfully executed ${this.name}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in ${this.name}:`, { error: error instanceof Error ? error.message : String(error) });
      throw ErrorHandler.handleError(error, { userId: this.userId, operation: this.name });
    }
  }
}
