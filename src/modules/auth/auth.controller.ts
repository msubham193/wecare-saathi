import { Response } from "express";
import { AuthService } from "./auth.service";
import { AuthRequest } from "../../types";
import { ResponseUtil } from "../../utils/response.util";
import { blacklistToken } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../middlewares/error.middleware";

const authService = new AuthService();

export class AuthController {
  /**
   * POST /auth/login
   * Login with Firebase token
   */
  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { firebaseToken } = req.body;

    const result = await authService.login(firebaseToken);

    return ResponseUtil.success(res, result, "Login successful");
  });

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshToken(refreshToken);

    return ResponseUtil.success(res, tokens, "Token refreshed successfully");
  });

  /**
   * POST /auth/logout
   * Logout and blacklist token
   */
  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await blacklistToken(token);
    }

    return ResponseUtil.success(res, null, "Logged out successfully");
  });

  /**
   * GET /auth/me
   * Get current user profile
   */
  getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const user = await authService.getCurrentUser(req.user.id);

    return ResponseUtil.success(res, user);
  });

  /**
   * GET /auth/google/callback
   * Handle Google OAuth callback
   */
  googleCallback = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res, "Google authentication failed");
    }

    const result = await authService.loginWithGoogle(req.user);

    // Return JSON response with tokens instead of redirecting
    return ResponseUtil.success(
      res,
      result,
      "Google authentication successful",
    );
  });

  /**
   * POST /auth/profile/complete
   * Complete user profile after Google OAuth
   */
  completeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const profileData = req.body;

    const user = await authService.completeProfile(req.user.id, profileData);

    return ResponseUtil.success(res, user, "Profile completed successfully");
  });

  /**
   * POST /auth/officer/login
   * Officer login with Officer ID and Password
   */
  loginOfficer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { officerId, password } = req.body;

    if (!officerId || !password) {
      return ResponseUtil.badRequest(
        res,
        "Officer ID and password are required",
      );
    }

    const result = await authService.loginOfficer(officerId, password);

    return ResponseUtil.success(res, result, "Officer logged in successfully");
  });

  /**
   * POST /auth/officer/change-password
   * Change officer password
   */
  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ResponseUtil.badRequest(
        res,
        "Current password and new password are required",
      );
    }

    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
    );

    return ResponseUtil.success(res, result);
  });

  /**
   * POST /auth/officer/forgot-password
   * Request password reset
   */
  forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { officerId, email } = req.body;

    if (!officerId || !email) {
      return ResponseUtil.badRequest(res, "Officer ID and email are required");
    }

    const result = await authService.requestPasswordReset(officerId, email);

    return ResponseUtil.success(res, result);
  });

  /**
   * POST /auth/officer/reset-password
   * Reset password using reset token
   */
  resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return ResponseUtil.badRequest(
        res,
        "Reset token and new password are required",
      );
    }

    const result = await authService.resetPassword(resetToken, newPassword);

    return ResponseUtil.success(res, result);
  });

  /**
   * POST /auth/admin/login
   * Admin login with Email and Password
   */
  loginAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return ResponseUtil.badRequest(res, "Email and password are required");
    }

    const result = await authService.loginAdmin(email, password);

    return ResponseUtil.success(res, result, "Admin logged in successfully");
  });
}
