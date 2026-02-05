import prisma from '../../config/database';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { sortByDistance, calculateDistance } from '../../utils/distance-calculator';
import { OfficerStatus } from '@prisma/client';
import { ERROR_MESSAGES } from '../../utils/constants';

export class AssignmentEngine {
  /**
   * Find and assign nearest available officer to a case
   * NEW LOGIC: Find nearest station first, then assign officer from that station
   * If no officers available at nearest station, try next nearest station
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

      // Step 1: Get all active police stations with their available officers
      const stations = await prisma.policeStation.findMany({
        where: { isActive: true },
        include: {
          officers: {
            where: {
              status: OfficerStatus.AVAILABLE,
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
          },
        },
      });

      if (stations.length === 0) {
        logger.warn('No active police stations found, using fallback assignment');
        return this.fallbackToDirectAssignment(caseId, latitude, longitude);
      }

      // Step 2: Sort stations by distance from SOS location
      const stationsWithDistance = sortByDistance(
        { lat: latitude, lng: longitude },
        stations.map(s => ({
          ...s,
          lat: s.latitude,
          lng: s.longitude,
        }))
      );

      // Step 3: Try to find available officer from nearest stations
      for (const station of stationsWithDistance) {
        // Skip stations beyond max distance
        if (station.distanceKm > config.officerAssignment.maxDistanceKm) {
          logger.info(
            `Station ${station.name} is ${station.distanceKm.toFixed(2)}km away, ` +
            `exceeds max distance of ${config.officerAssignment.maxDistanceKm}km`
          );
          break;
        }

        const availableOfficers = station.officers.filter(
          o => o.status === OfficerStatus.AVAILABLE
        );

        if (availableOfficers.length === 0) {
          logger.info(
            `No available officers at ${station.name} (${station.distanceKm.toFixed(2)}km), ` +
            `trying next station`
          );
          continue;
        }

        // If officers have current locations, pick the nearest one
        // Otherwise, pick the first available one
        let selectedOfficer = availableOfficers[0];
        let officerDistance = station.distanceKm; // Default to station distance

        const officersWithLocation = availableOfficers.filter(
          o => o.currentLat !== null && o.currentLng !== null
        );

        if (officersWithLocation.length > 0) {
          const sortedOfficers = sortByDistance(
            { lat: latitude, lng: longitude },
            officersWithLocation.map(o => ({
              ...o,
              lat: o.currentLat!,
              lng: o.currentLng!,
            }))
          );
          selectedOfficer = sortedOfficers[0];
          officerDistance = sortedOfficers[0].distanceKm;
        }

        logger.info(
          `Assigning officer ${selectedOfficer.badgeNumber} from station ${station.name} ` +
          `(station: ${station.distanceKm.toFixed(2)}km, officer: ${officerDistance.toFixed(2)}km)`
        );

        // Assign the officer
        await prisma.$transaction([
          prisma.sosCase.update({
            where: { id: caseId },
            data: {
              officerId: selectedOfficer.id,
              assignedAt: new Date(),
              status: 'ASSIGNED',
            },
          }),
          prisma.officerProfile.update({
            where: { id: selectedOfficer.id },
            data: { status: OfficerStatus.BUSY },
          }),
          prisma.caseStatusLog.create({
            data: {
              caseId,
              fromStatus: 'CREATED',
              toStatus: 'ASSIGNED',
              changedBy: 'SYSTEM',
              notes: `Auto-assigned to ${selectedOfficer.badgeNumber} from ${station.name} ` +
                     `(${officerDistance.toFixed(2)}km away)`,
            },
          }),
        ]);

        return {
          officer: selectedOfficer,
          station: {
            id: station.id,
            name: station.name,
            distanceKm: station.distanceKm,
          },
          distance: officerDistance,
        };
      }

      logger.warn('No available officers found at any nearby station');
      return null;
    } catch (error) {
      logger.error('Station-based auto-assignment failed:', error);
      return null;
    }
  }

  /**
   * Fallback to direct officer assignment (original logic)
   * Used when no stations are configured or for backward compatibility
   */
  private async fallbackToDirectAssignment(
    caseId: string,
    latitude: number,
    longitude: number
  ) {
    logger.info('Using fallback direct officer assignment');

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
      logger.warn('No available officers found for fallback assignment');
      return null;
    }

    const officersWithDistance = sortByDistance(
      { lat: latitude, lng: longitude },
      availableOfficers.map(o => ({
        ...o,
        lat: o.currentLat!,
        lng: o.currentLng!,
      }))
    );

    const nearbyOfficers = officersWithDistance.filter(
      o => o.distanceKm <= config.officerAssignment.maxDistanceKm
    );

    if (nearbyOfficers.length === 0) {
      logger.warn(
        `No officers found within ${config.officerAssignment.maxDistanceKm}km (fallback)`
      );
      return null;
    }

    const nearestOfficer = nearbyOfficers[0];

    await prisma.$transaction([
      prisma.sosCase.update({
        where: { id: caseId },
        data: {
          officerId: nearestOfficer.id,
          assignedAt: new Date(),
          status: 'ASSIGNED',
        },
      }),
      prisma.officerProfile.update({
        where: { id: nearestOfficer.id },
        data: { status: OfficerStatus.BUSY },
      }),
      prisma.caseStatusLog.create({
        data: {
          caseId,
          fromStatus: 'CREATED',
          toStatus: 'ASSIGNED',
          changedBy: 'SYSTEM',
          notes: `Fallback auto-assigned to ${nearestOfficer.badgeNumber} (${nearestOfficer.distanceKm.toFixed(2)}km away)`,
        },
      }),
    ]);

    return {
      officer: nearestOfficer,
      distance: nearestOfficer.distanceKm,
    };
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
        policeStation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
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
   * Get list of available officers sorted by station proximity
   * @param latitude Reference latitude
   * @param longitude Reference longitude
   * @param limit Maximum number of officers to return
   */
  async getNearbyOfficersByStation(
    latitude: number,
    longitude: number,
    limit: number = 10
  ) {
    const stations = await prisma.policeStation.findMany({
      where: { isActive: true },
      include: {
        officers: {
          where: {
            status: {
              in: [OfficerStatus.AVAILABLE, OfficerStatus.ON_DUTY],
            },
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
        },
      },
    });

    const stationsWithDistance = sortByDistance(
      { lat: latitude, lng: longitude },
      stations.map(s => ({
        ...s,
        lat: s.latitude,
        lng: s.longitude,
      }))
    );

    const result: Array<{
      officer: any;
      station: { id: string; name: string; distanceKm: number };
      officerDistanceKm: number;
    }> = [];

    for (const station of stationsWithDistance) {
      if (station.distanceKm > config.officerAssignment.maxDistanceKm) {
        break;
      }

      for (const officer of station.officers) {
        let officerDistance = station.distanceKm;

        if (officer.currentLat && officer.currentLng) {
          officerDistance = calculateDistance(
            latitude,
            longitude,
            officer.currentLat,
            officer.currentLng
          );
        }

        result.push({
          officer,
          station: {
            id: station.id,
            name: station.name,
            distanceKm: station.distanceKm,
          },
          officerDistanceKm: officerDistance,
        });
      }
    }

    // Sort by officer distance and limit
    return result
      .sort((a, b) => a.officerDistanceKm - b.officerDistanceKm)
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
