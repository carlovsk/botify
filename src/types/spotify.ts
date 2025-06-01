import { z } from 'zod';

export const SpotifyAuthorizationSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  token_type: z.string(),
});

export type TelegramAuthorization = z.infer<typeof SpotifyAuthorizationSchema>;

export const UserSchema = z.object({
  display_name: z.string(),
  href: z.string().url(),
  id: z.string(),
  type: z.literal('user'),
  uri: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const ImageSchema = z.object({
  height: z.number().nullable(),
  width: z.number().nullable(),
  url: z.string().url(),
});

export const ArtistSchema = z.object({
  external_urls: z.object({
    spotify: z.string().url(),
  }),
  href: z.string().url(),
  id: z.string(),
  name: z.string(),
  type: z.literal('artist'),
  uri: z.string(),
});

export const PlaylistSchema = z.object({
  collaborative: z.boolean(),
  description: z.string().nullable(),
  external_urls: z.object({
    spotify: z.string().url(),
  }),
  href: z.string().url(),
  id: z.string(),
  name: z.string(),
  owner: UserSchema,
  primary_color: z.nullable(z.string()),
  public: z.boolean().nullable(),
  snapshot_id: z.string(),
  tracks: z.object({
    href: z.string().url(),
    total: z.number(),
  }),
  type: z.literal('playlist'),
  uri: z.string(),
});

export type Playlist = z.infer<typeof PlaylistSchema>;

export const AlbumSchema = z.object({
  album_type: z.string(),
  total_tracks: z.number(),
  available_markets: z.string().array(),
  external_urls: z.object({
    spotify: z.string().url(),
  }),
  href: z.string().url(),
  id: z.string(),
  images: ImageSchema.array(),
  name: z.string(),
  release_date: z.string(),
  release_date_precision: z.literal('day'),
  type: z.literal('album'),
  uri: z.string(),
  artists: ArtistSchema.array(),
});

export const TrackSchema = z.object({
  album: AlbumSchema,
  artists: ArtistSchema.array(),
  available_markets: z.string().array(),
  disc_number: z.number(),
  duration_ms: z.number(),
  explicit: z.boolean(),
  href: z.string().url(),
  id: z.string(),
  name: z.string(),
  track_number: z.number(),
  type: z.literal('track'),
  uri: z.string(),
});

export type Track = z.infer<typeof TrackSchema>;
