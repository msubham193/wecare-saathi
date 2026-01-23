import { z } from 'zod';

export const loginSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  age: z.number().int().min(1).max(120),
  address: z.string().min(5).max(500).optional(),
  bloodGroup: z.string().max(10).optional(),
  medicalInfo: z.string().max(1000).optional(),
  emergencyNote: z.string().max(500).optional(),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type CompleteProfileRequest = z.infer<typeof completeProfileSchema>;
