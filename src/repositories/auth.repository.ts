import { z } from 'zod';
import { Auth } from '../models';

// Zod schemas for validation
export const CreateAuthDataSchema = z.object({
  authId: z.string().min(1, 'Auth ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
  expiresIn: z.number().positive('Expires in must be positive'),
  scope: z.string().min(1, 'Scope is required'),
  tokenType: z.string().min(1, 'Token type is required'),
});

export const AuthDataSchema = z.object({
  authId: z.string().min(1, 'Auth ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
  expiresIn: z.number().positive('Expires in must be positive'),
  scope: z.string().min(1, 'Scope is required'),
  tokenType: z.string().min(1, 'Token type is required'),
});

export const UpdateAuthDataSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required').optional(),
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
  expiresIn: z.number().positive('Expires in must be positive').optional(),
  scope: z.string().min(1, 'Scope is required').optional(),
  tokenType: z.string().min(1, 'Token type is required').optional(),
});

// Type inference from Zod schemas
export type CreateAuthData = z.infer<typeof CreateAuthDataSchema>;
export type AuthData = z.infer<typeof AuthDataSchema>;
export type UpdateAuthData = z.infer<typeof UpdateAuthDataSchema>;

export class AuthRepository {
  private entity = Auth;

  async create(data: CreateAuthData): Promise<AuthData> {
    // Validate input data
    const validatedData = CreateAuthDataSchema.parse(data);

    const result = await this.entity.create(validatedData).go();

    // Validate and return result
    return AuthDataSchema.parse(result.data);
  }

  async findByUserId(userId: string): Promise<AuthData[]> {
    // Validate input
    z.string().min(1, 'User ID is required').parse(userId);

    const result = await this.entity.query.byUserId({ userId }).go();

    // Validate each item in the result
    return result.data.map((item) => AuthDataSchema.parse(item));
  }

  async findByAuthId(authId: string): Promise<AuthData[]> {
    // Validate input
    z.string().min(1, 'Auth ID is required').parse(authId);

    const result = await this.entity.query.byAuthId({ authId }).go();

    // Validate each item in the result
    return result.data.map((item) => AuthDataSchema.parse(item));
  }

  async update(userId: string, authId: string, updates: UpdateAuthData): Promise<AuthData> {
    // Validate inputs
    z.string().min(1, 'User ID is required').parse(userId);
    z.string().min(1, 'Auth ID is required').parse(authId);
    const validatedUpdates = UpdateAuthDataSchema.parse(updates);

    const result = await this.entity.patch({ userId, authId }).set(validatedUpdates).go();

    // Validate and return result
    return AuthDataSchema.parse(result.data);
  }

  async delete(userId: string, authId: string): Promise<void> {
    // Validate inputs
    z.string().min(1, 'User ID is required').parse(userId);
    z.string().min(1, 'Auth ID is required').parse(authId);

    await this.entity.delete({ userId, authId }).go();
  }

  async deleteByUserId(userId: string): Promise<void> {
    // Validate input
    z.string().min(1, 'User ID is required').parse(userId);

    const auths = await this.findByUserId(userId);
    for (const auth of auths) {
      await this.delete(auth.userId, auth.authId);
    }
  }

  async deleteByAuthId(authId: string): Promise<void> {
    // Validate input
    z.string().min(1, 'Auth ID is required').parse(authId);

    const auths = await this.findByAuthId(authId);
    for (const auth of auths) {
      await this.delete(auth.userId, auth.authId);
    }
  }
}
