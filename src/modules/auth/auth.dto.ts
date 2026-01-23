import { z } from 'zod';

/**
 * Profile completion validation schema
 */
export const completeProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  age: z.number().int().min(1).max(120),
  address: z.string().min(5).max(500).optional(),
  bloodGroup: z.string().max(10).optional(),
  medicalInfo: z.string().max(1000).optional(),
  emergencyNote: z.string().max(500).optional(),
});

export type CompleteProfileDto = z.infer<typeof completeProfileSchema>;

/**
 * Google auth response type
 */
export interface GoogleAuthResponse {
  user: {
    id: string;
    name: string;
    email: string | null;
    avatar?: string | null;
    role: string;
    profileCompleted: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  requiresProfileCompletion: boolean;
}

/**
 * User response type
 */
export interface UserResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar?: string | null;
  age?: number | null;
  role: string;
  profileCompleted: boolean;
  hasProfile: boolean;
}
