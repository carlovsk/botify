import { describe, it, expect, beforeEach } from 'vitest';
import { SpotifyAuthService } from '../src/services/auth';

// Mock environment variables required by env()
beforeEach(() => {
  process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
  process.env.SPOTIFY_CLIENT_SECRET = 'test-secret';
  process.env.SPOTIFY_REDIRECT_URI = 'https://example.com/callback';
  process.env.API_GATEWAY_URL = 'https://api.example.com';
});

describe('SpotifyAuthService', () => {
  it('createAuthorizeURL includes required params', () => {
    const { url, authId } = SpotifyAuthService.createAuthorizeURL();
    const parsed = new URL(url);
    const params = parsed.searchParams;

    expect(params.get('client_id')).toBe(process.env.SPOTIFY_CLIENT_ID);
    expect(params.get('redirect_uri')).toBe(
      `${process.env.API_GATEWAY_URL}/spotify/callback`
    );
    expect(params.get('state')).toBe(authId);
  });
});
