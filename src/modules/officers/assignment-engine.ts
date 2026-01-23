import prisma from '../../config/database';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { sortByDistance } from '../../utils/distance-calculator';
import { OfficerStatus } from '@prisma/client';
import { ERROR_MESSAGES } from '../../utils/constants';

export class AssignmentEngine {
  /**
   * Find and assign nearest available officer to a case
   * @param caseId SOS case ID
   * @param latitude Case location latitude
   * @param longitude Case location longitude
   * @returns Assigned officer profile or null if no officers available
   */
  async autoAssignOfficer(caseId: string, latitude: number, longitude: number) {
    try {
      if (!config.officerAssignment.autoAssignEnabled) {
        logger.info('Auto-assignment is disabled');
        return null;
      }
      
      // Get all available officers with last known location
      const availableOfficers = await prisma.officerProfile.findMany({
        where: {
          status: OfficerStatus.AVAILABLE,
          currentLat: { not: null },
          currentLng: { not: null },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });
      
      if (availableOfficers.length === 0) {
        logger.warn('No available officers found for auto-assignment');
        return null;
      }
      
      // Calculate distances and sort
      const officersWithDistance = sortByDistance(
        { lat: latitude, lng: longitude },
        availableOfficers.map(o => ({
          ...o,
          lat: o.currentLat!,
          lng: o.currentLng!,
        }))
      );
      
      // Filter officers within max distance
      const nearbyOfficers = officersWithDistance.filter(
        o => o.distanceKm <= config.officerAssignment.maxDistanceKm
      );
      
      if (nearbyOfficers.length === 0) {
        logger.warn(
          `No officers found within ${config.officerAssignment.maxDistanceKm}km`
        );
        return null;
      }
      
      // Pick the nearest officer
      const nearestOfficer = nearbyOfficers[0];
      
      logger.info(
        `Auto-assigning officer ${nearestOfficer.badgeNumber} ` +
        `(${nearestOfficer.distanceKm.toFixed(2)}km away) to case`
      );
      
      // Update case and officer
      await prisma.$transaction([
        // Assign case
        prisma.sosCase.update({
          where: { id: caseId },
          data: {
            officerId: nearestOfficer.id,
            assignedAt: new Date(),
            status: 'ASSIGNED',
          },
        }),
        
        // Update officer status
        prisma.officerProfile.update({
          where: { id: nearestOfficer.id },
          data: { status: OfficerStatus.BUSY },
        }),
        
        // Create status log
        prisma.caseStatusLog.create({
          data: {
            caseId,
            fromStatus: 'CREATED',
            toStatus: 'ASSIGNED',
            changedBy: 'SYSTEM',
            notes: `Auto-assigned to ${nearestOfficer.badgeNumber} (${nearestOfficer.distanceKm.toFixed(2)}km away)`,
          },
        }),
      ]);
      
      return {
        officer: nearestOfficer,
        distance: nearestOfficer.distanceKm,
      };
    } catch (error) {
      logger.error('Auto-assignment failed:', error);
      return null;
    }
  }
  
  /**
   * Get list of available officers sorted by distance
   * @param latitude Reference latitude
   * @param longitude Reference longitude
   * @param limit Maximum number of officers to return
   */
  async getNearbyOfficers(latitude: number, longitude: number, limit: number = 10) {
    const availableOfficers = await prisma.officerProfile.findMany({
      where: {
        status: {
          in: [OfficerStatus.AVAILABLE, OfficerStatus.ON_DUTY],
        },
        currentLat: { not: null },
        currentLng: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
    
    if (availableOfficers.length === 0) {
      return [];
    }
    
    const officersWithDistance = sortByDistance(
      { lat: latitude, lng: longitude },
      availableOfficers.map(o => ({
        ...o,
        lat: o.currentLat!,
        lng: o.currentLng!,
      }))
    );
    
    return officersWithDistance
      .filter(o => o.distanceKm <= config.officerAssignment.maxDistanceKm)
      .slice(0, limit);
  }
  
  /**
   * Reassign case from one officer to another
   * @param caseId Case ID
   * @param newOfficerId New officer ID
   * @param reassignedBy User ID who is reassigning
   */
  async reassignOfficer(caseId: string, newOfficerId: string, reassignedBy: string) {
    const sosCase = await prisma.sosCase.findUnique({
      where: { id: caseId },
      include: { officer: true },
    });
    
    if (!sosCase) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }
    
    const newOfficer = await prisma.officerProfile.findUnique({
      where: { id: newOfficerId },
    });
    
    if (!newOfficer) {
      throw new Error('New officer not found');
    }
    
    const oldOfficerId = sosCase.officerId;
    
    await prisma.$transaction([
      // Update case
      prisma.sosCase.update({
        where: { id: caseId },
        data: {
          officerId: newOfficerId,
          assignedBy: reassignedBy,
          assignedAt: new Date(),
        },
      }),
      
      // Update new officer status
      prisma.officerProfile.update({
        where: { id: newOfficerId },
        data: { status: OfficerStatus.BUSY },
      }),
      
      // Free old officer if exists
      ...(oldOfficerId
        ? [
            prisma.officerProfile.update({
              where: { id: oldOfficerId },
              data: { status: OfficerStatus.AVAILABLE },
            }),
          ]
        : []),
      
      // Create audit log
      prisma.caseStatusLog.create({
        data: {
          caseId,
          fromStatus: sosCase.status,
          toStatus: sosCase.status,
          changedBy: reassignedBy,
          notes: `Reassigned from ${sosCase.officer?.badgeNumber || 'unassigned'} to ${newOfficer.badgeNumber}`,
        },
      }),
    ]);
    
    logger.info(`Case ${caseId} reassigned to officer ${newOfficer.badgeNumber}`);
    
    return { oldOfficerId, newOfficer };
  }
}
