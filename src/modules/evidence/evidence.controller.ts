import { Response } from 'express';
import { EvidenceService } from './evidence.service';
import { AuthRequest } from '../../types';
import { ResponseUtil } from '../../utils/response.util';
import { asyncHandler } from '../../middlewares/error.middleware';

const evidenceService = new EvidenceService();

export class EvidenceController {
  /**
   * POST /evidence/upload
   * Upload evidence for a case
   */
  uploadEvidence = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    if (!req.file) {
      return ResponseUtil.badRequest(res, 'No file uploaded');
    }

    const { caseId } = req.body;

    if (!caseId) {
      return ResponseUtil.badRequest(res, 'Case ID is required');
    }

    const evidence = await evidenceService.uploadEvidence(
      req.file,
      caseId,
      req.user.id,
      req.user.role
    );

    return ResponseUtil.created(res, evidence, 'Evidence uploaded successfully');
  });

  /**
   * GET /evidence/case/:caseId
   * Get all evidence for a case
   */
  getEvidenceByCase = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const evidence = await evidenceService.getEvidenceByCase(
      req.params.caseId,
      req.user.id,
      req.user.role
    );

    return ResponseUtil.success(res, evidence);
  });

  /**
   * GET /evidence/:id
   * Get specific evidence by ID
   */
  getEvidenceById = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const evidence = await evidenceService.getEvidenceById(
      req.params.id,
      req.user.id,
      req.user.role
    );

    return ResponseUtil.success(res, evidence);
  });
}
