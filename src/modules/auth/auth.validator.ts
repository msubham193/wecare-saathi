import { z } from "zod";

export const loginSchema = z.object({
  firebaseToken: z.string().min(1, "Firebase token is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
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

// Officer authentication schemas
export const officerLoginSchema = z.object({
  officerId: z.string().min(1, "Officer ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const forgotPasswordSchema = z.object({
  officerId: z.string().min(1, "Officer ID is required"),
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginRequest = z.infer<typeof adminLoginSchema>;
