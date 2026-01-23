import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middlewares/validator.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { loginRateLimiter } from '../../middlewares/rate-limit.middleware';
import { loginSchema, refreshTokenSchema, completeProfileSchema } from './auth.validator';
import { auditLog } from '../../middlewares/audit.middleware';
import { AUDIT_ACTIONS } from '../../utils/constants';
import passport from '../../config/passport';

const router = Router();
const authController = new AuthController();

/**
 * POST /auth/login
 * Login with Firebase token
 */
router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  auditLog(AUDIT_ACTIONS.USER_LOGIN, 'users'),
  authController.login
);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refresh
);

/**
 * POST /auth/logout
 * Logout and invalidate token
 */
router.post(
  '/logout',
  authenticate,
  auditLog(AUDIT_ACTIONS.USER_LOGOUT, 'users'),
  authController.logout
);

/**
 * GET /auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/auth/login/failed' 
  }),
  authController.googleCallback
);

/**
 * POST /auth/profile/complete
 * Complete user profile after Google OAuth
 */
router.post(
  '/profile/complete',
  authenticate,
  validate(completeProfileSchema),
  auditLog(AUDIT_ACTIONS.USER_LOGIN, 'users'),
  authController.completeProfile
);

export default router;
