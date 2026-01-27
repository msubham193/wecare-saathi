import { Router } from 'express';
import { SOSController } from './sos.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireCitizen, requireOfficer, requireAdmin } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validator.middleware';
import { sosRateLimiter } from '../../middlewares/rate-limit.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import { uploadSOSVideo, handleUploadError } from '../../middlewares/upload.middleware';
import { AUDIT_ACTIONS } from '../../utils/constants';
import {
  createSOSSchema,
  updateStatusSchema,
  assignOfficerSchema,
} from './sos.validator';

const router = Router();
const sosController = new SOSController();

// ========== CITIZEN ROUTES ==========

/**
 * POST /sos/create
 * Create new SOS case
 */
router.post(
  '/create',
  authenticate,
  requireCitizen,
  sosRateLimiter,
  uploadSOSVideo,
  handleUploadError,
  validate(createSOSSchema),
  auditLog(AUDIT_ACTIONS.SOS_CREATED, 'sos_cases'),
  sosController.create
);

/**
 * POST /sos/notify-guardian
 * Notify guardian manually
 */
router.post(
  '/notify-guardian',
  authenticate,
  requireCitizen,
  sosController.notifyGuardian
);

/**
 * POST /sos/upload-media
 * Upload additional media for SOS
 */
router.post(
  '/upload-media',
  authenticate,
  requireCitizen,
  uploadSOSVideo, // Reusing video upload middleware
  handleUploadError,
  sosController.uploadMedia
);

/**
 * GET /citizen/cases
 * Get citizen's SOS cases
 */
router.get(
  '/citizen/cases',
  authenticate,
  requireCitizen,
  sosController.getCitizenCases
);

/**
 * GET /sos/:id
 * Get SOS case details
 */
router.get(
  '/:id',
  authenticate,
  sosController.getById
);

/**
 * GET /sos/:id/status
 * Get case status history
 */
router.get(
  '/:id/status',
  authenticate,
  sosController.getStatusHistory
);

// ========== OFFICER ROUTES ==========

/**
 * GET /officer/cases
 * Get officer's assigned cases
 */
router.get(
  '/officer/cases',
  authenticate,
  requireOfficer,
  sosController.getOfficerCases
);

/**
 * POST /officer/case/:id/status
 * Update case status
 */
router.post(
  '/officer/case/:id/status',
  authenticate,
  requireOfficer,
  validate(updateStatusSchema),
  auditLog(AUDIT_ACTIONS.STATUS_CHANGED, 'sos_cases'),
  sosController.updateStatus
);

// ========== ADMIN ROUTES ==========

/**
 * GET /admin/cases
 * Get all cases with filters
 */
router.get(
  '/admin/cases',
  authenticate,
  requireAdmin,
  sosController.getAllCases
);

/**
 * POST /admin/case/:id/assign
 * Manually assign officer to case
 */
router.post(
  '/admin/case/:id/assign',
  authenticate,
  requireAdmin,
  validate(assignOfficerSchema),
  auditLog(AUDIT_ACTIONS.SOS_ASSIGNED, 'sos_cases'),
  sosController.assignOfficer
);

/**
 * POST /admin/case/:id/status
 * Admin update case status (force close)
 */
router.post(
  '/admin/case/:id/status',
  authenticate,
  requireAdmin,
  validate(updateStatusSchema),
  auditLog(AUDIT_ACTIONS.STATUS_CHANGED, 'sos_cases'),
  sosController.updateStatus
);

export default router;
