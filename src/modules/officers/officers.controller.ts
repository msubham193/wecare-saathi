import { Response } from 'express';
import { AuthRequest } from '../../types';
import { ResponseUtil } from '../../utils/response.util';
import { asyncHandler } from '../../middlewares/error.middleware';
import { LocationTracker } from './location-tracker';
import prisma from '../../config/database';

const locationTracker = new LocationTracker();

export class OfficersController {
  /**
   * POST /officer/location
   * Update officer location
   */
  updateLocation = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }
    
    const officer = await prisma.officerProfile.findUnique({
      where: { userId: req.user.id },
    });
    
    if (!officer) {
      return ResponseUtil.badRequest(res, 'Officer profile not found');
    }
    
    const { latitude, longitude, accuracy, caseId } = req.body;
    
    await locationTracker.updateLocation(
      officer.id,
      latitude,
      longitude,
      accuracy,
      caseId
    );
    
    return ResponseUtil.success(res, null, 'Location updated');
  });
  
  /**
   * GET /officer/profile
   * Get officer profile
   */
  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }
    
    const officer = await prisma.officerProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedCases: {
          where: {
            status: {
              not: 'CLOSED',
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!officer) {
      return ResponseUtil.notFound(res, 'Officer profile not found');
    }
    
    return ResponseUtil.success(res, officer);
  });
  
  /**
   * GET /admin/officers
   * Get all officers (admin)
   */
  getAllOfficers = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const officers = await prisma.officerProfile.findMany({
      include: {
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        _count: {
          select: {
            assignedCases: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return ResponseUtil.success(res, officers);
  });
  
  /**
   * GET /admin/officers/active-locations
   * Get all active officer locations (admin)
   */
  getActiveLocations = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const locations = await locationTracker.getActiveOfficerLocations();
    
    return ResponseUtil.success(res, locations);
  });
}
