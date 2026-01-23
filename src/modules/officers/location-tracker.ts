import prisma from '../../config/database';
import { logger } from '../../config/logger';
import { OfficerStatus } from '@prisma/client';

export class LocationTracker {
  /**
   * Update officer location
   * @param officerId Officer profile ID
   * @param latitude Latitude
   * @param longitude Longitude
   * @param accuracy GPS accuracy in meters
   * @param caseId Optional case ID if on active duty
   */
  async updateLocation(
    officerId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
    caseId?: string
  ) {
    try {
      // Update officer's current location
      await prisma.officerProfile.update({
        where: { id: officerId },
        data: {
          currentLat: latitude,
          currentLng: longitude,
          lastLocationUpdate: new Date(),
        },
      });
      
      // Log location history only for active cases
      if (caseId) {
        await prisma.officerLocationLog.create({
          data: {
            officerId,
            latitude,
            longitude,
            accuracy,
            caseId,
          },
        });
      }
      
      logger.debug(`Officer ${officerId} location updated`);
      
      return { success: true };
    } catch (error) {
      logger.error('Location update failed:', error);
      throw error;
    }
  }
  
  /**
   * Get officer's location history for a case
   * @param officerId Officer profile ID
   * @param caseId Case ID
   */
  async getLocationHistory(officerId: string, caseId?: string) {
    const where: any = { officerId };
    
    if (caseId) {
      where.caseId = caseId;
    }
    
    return prisma.officerLocationLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100, // Limit to last 100 locations
    });
  }
  
  /**
   * Clean up old location logs (keep only for active cases)
   * Should be run periodically (e.g., daily cron job)
   */
  async cleanupOldLogs(daysToKeep: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await prisma.officerLocationLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
        caseId: null, // Only delete logs not associated with cases
      },
    });
    
    logger.info(`Cleaned up ${result.count} old location logs`);
    
    return result.count;
  }
  
  /**
   * Get current location of all active officers
   */
  async getActiveOfficerLocations() {
    return prisma.officerProfile.findMany({
      where: {
        status: { in: [OfficerStatus.AVAILABLE, OfficerStatus.ON_DUTY, OfficerStatus.BUSY] },
        currentLat: { not: null },
        currentLng: { not: null },
      },
      select: {
        id: true,
        badgeNumber: true,
        status: true,
        currentLat: true,
        currentLng: true,
        lastLocationUpdate: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }
}
