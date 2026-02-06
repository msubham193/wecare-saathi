import { Router } from 'express';
import { FeedbackController } from './feedback.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireCitizen, requireAdmin } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validator.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import { uploadFeedbackMedia, handleUploadError } from '../../middlewares/upload.middleware';
import { AUDIT_ACTIONS } from '../../utils/constants';
import {
  caseIdParamSchema,
  feedbackIdParamSchema,
  createReplySchema,
} from './feedback.validator';

const router = Router();
const feedbackController = new FeedbackController();

// ========== ADMIN ROUTES (must come before /:param routes) ==========

/**
 * GET /feedback
 * Admin gets all feedbacks with pagination/filters
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  feedbackController.getAllFeedbacks,
);

// ========== CITIZEN ROUTES ==========

/**
 * POST /feedback/:caseId
 * Citizen creates feedback for a closed case (with optional photo + video)
 */
router.post(
  '/:caseId',
  authenticate,
  requireCitizen,
  validate(caseIdParamSchema, 'params'),
  uploadFeedbackMedia,
  handleUploadError,
  auditLog(AUDIT_ACTIONS.FEEDBACK_CREATED, 'feedback'),
  feedbackController.createFeedback,
);

// ========== SHARED ROUTES (CITIZEN + ADMIN) ==========

/**
 * GET /feedback/:caseId
 * Get feedback for a specific case
 */
router.get(
  '/:caseId',
  authenticate,
  validate(caseIdParamSchema, 'params'),
  feedbackController.getFeedbackByCase,
);

/**
 * POST /feedback/:feedbackId/reply
 * Admin replies to feedback
 */
router.post(
  '/:feedbackId/reply',
  authenticate,
  requireAdmin,
  validate(feedbackIdParamSchema, 'params'),
  validate(createReplySchema),
  auditLog(AUDIT_ACTIONS.FEEDBACK_REPLY_CREATED, 'feedback_reply'),
  feedbackController.createReply,
);

/**
 * GET /feedback/:feedbackId/replies
 * Get replies for a feedback
 */
router.get(
  '/:feedbackId/replies',
  authenticate,
  validate(feedbackIdParamSchema, 'params'),
  feedbackController.getReplies,
);

export default router;
