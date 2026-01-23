import { Router } from 'express';
import { EvidenceController } from './evidence.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { uploadEvidence, handleUploadError } from '../../middlewares/upload.middleware';

const router = Router();
const evidenceController = new EvidenceController();

/**
 * POST /evidence/upload
 * Upload evidence for a case
 */
router.post(
  '/upload',
  authenticate,
  uploadEvidence,
  handleUploadError,
  evidenceController.uploadEvidence
);

/**
 * GET /evidence/case/:caseId
 * Get all evidence for a case
 */
router.get('/case/:caseId', authenticate, evidenceController.getEvidenceByCase);

/**
 * GET /evidence/:id
 * Get specific evidence by ID
 */
router.get('/:id', authenticate, evidenceController.getEvidenceById);

export default router;
