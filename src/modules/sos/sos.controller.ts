import { Response } from 'express';
import { SOSService } from './sos.service';
import { AuthRequest } from '../../types';
import { ResponseUtil } from '../../utils/response.util';
import { asyncHandler } from '../../middlewares/error.middleware';

const sosService = new SOSService();

export class SOSController {
  /**
   * POST /sos/create
   * Create new SOS case
   */
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }
    
    // Get citizen profile
    const citizen = await require('../../config/database').default.citizenProfile.findUnique({
      where: { userId: req.user.id },
    });
    
    if (!citizen) {
      return ResponseUtil.badRequest(res, 'Citizen profile not found');
    }
    
    // Extract video file if present
    const videoFile = req.file;
    
    const sosCase = await sosService.createSOS(citizen.id, req.body, videoFile);
    
    return ResponseUtil.created(res, sosCase, 'SOS created successfully');
  });
  
  /**
   * GET /sos/:id
   * Get SOS case by ID
   */
  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }
    
    const sosCase = await sosService.getCaseById(
      req.params.id,
      req.user.id,
      req.user.role
    );
    
    return ResponseUtil.success(res, sosCase);
  });
  
  /**
   * GET /sos/:id/status
   * Get case status history
   */
  getStatusHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const history = await sosService.getStatusHistory(req.params.id);
    
    return ResponseUtil.success(res, history);
  });
  
  /**
   * GET /citizen/cases
   * Get citizen's SOS cases
   */
  getCitizenCases = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }
    
    const citizen = await require('../../config/database').default.citizenProfile.findUnique({
      where: { userId: req.user.id },
    });
    
    if (!citizen) {
      return ResponseUtil.badRequest(res, 'Citizen profile not found');
    }
    
    const result = await sosService.getCases({
      citizenId: citizen.id,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    
    return ResponseUtil.success(res, result);
  });
  
  /**
   * GET /officer/cases
   * Get officer's assigned cases
   */
  getOfficerCases = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }
    
    const officer = await require('../../config/database').default.officerProfile.findUnique({
      where: { userId: req.user.id },
    });
    
    if (!officer) {
      return ResponseUtil.badRequest(res, 'Officer profile not found');
    }
    
    const result = await sosService.getCases({
      officerId: officer.id,
      status: req.query.status as any,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    
    return ResponseUtil.success(res, result);
  });
  
  /**
   * POST /officer/case/:id/status
   * Update case status (officer)
   */
  updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }
    
    const updated = await sosService.updateStatus(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role
    );
    
    return ResponseUtil.success(res, updated, 'Status updated successfully');
  });
  
  /**
   * GET /admin/cases
   * Get all cases (admin)
   */
  getAllCases = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await sosService.getCases({
      status: req.query.status as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    
    return ResponseUtil.success(res, result);
  });
  
  /**
   * POST /admin/case/:id/assign
   * Assign officer to case (admin)
   */
  assignOfficer = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }
    
    const updated = await sosService.assignOfficer(
      req.params.id,
      req.body.officerId,
      req.user.id
    );
    
    return ResponseUtil.success(res, updated, 'Officer assigned successfully');
  });
}
