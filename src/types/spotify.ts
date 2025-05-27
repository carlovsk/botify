import { z } from 'zod';

export const TelegramAuthorizationSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  token_type: z.string(),
});

export type TelegramAuthorization = z.infer<typeof TelegramAuthorizationSchema>;

export type ParsedTrack = {
  name: string;
  id: string;
  is_playing?: boolean;
  album?: ParsedAlbum;
  track_number?: number;
  duration_ms?: number;
  is_playable?: boolean;
  artist?: string | ParsedArtist;
  artists?: (string | ParsedArtist)[];
};

export type ParsedArtist = {
  name: string;
  id: string;
  genres?: string[];
};

export type ParsedPlaylist = {
  name: string;
  id: string;
  owner: string;
  user_is_owner: boolean;
  total_tracks: number;
  description?: string;
  tracks?: ParsedTrack[];
};

export type ParsedAlbum = {
  name: string;
  id: string;
  artist?: string | ParsedArtist;
  artists?: (string | ParsedArtist)[];
  tracks?: ParsedTrack[];
  total_tracks?: number;
  release_date?: string;
  genres?: string[];
};

export type SearchResults = {
  tracks?: ParsedTrack[];
  artists?: ParsedArtist[];
  playlists?: ParsedPlaylist[];
  albums?: ParsedAlbum[];
};

export type SearchQueryOptions = {
  artist?: string;
  track?: string;
  album?: string;
  year?: string;
  yearRange?: [number, number];
  genre?: string;
  isHipster?: boolean;
  isNew?: boolean;
};
