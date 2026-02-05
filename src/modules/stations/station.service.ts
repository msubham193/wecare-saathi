import prisma from '../../config/database';
import { mapboxService, PoliceStationSearchResult } from '../../services/mapbox.service';
import { logger } from '../../config/logger';
import { sortByDistance } from '../../utils/distance-calculator';

export class PoliceStationService {
  /**
   * Search police stations via Mapbox
   */
  async searchStations(
    query: string,
    options?: {
      latitude?: number;
      longitude?: number;
      limit?: number;
    }
  ): Promise<PoliceStationSearchResult[]> {
    const { latitude, longitude, limit = 10 } = options || {};

    return mapboxService.searchPoliceStations(query, {
      proximity: latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
      limit,
    });
  }

  /**
   * Create or get existing police station from Mapbox data
   */
  async createOrGetStation(stationData: PoliceStationSearchResult) {
    // Check if station already exists by mapboxPlaceId
    const existing = await prisma.policeStation.findUnique({
      where: { mapboxPlaceId: stationData.mapboxPlaceId },
    });

    if (existing) {
      return existing;
    }

    // Create new station
    const station = await prisma.policeStation.create({
      data: {
        mapboxPlaceId: stationData.mapboxPlaceId,
        name: stationData.name,
        address: stationData.address,
        latitude: stationData.latitude,
        longitude: stationData.longitude,
        district: stationData.district,
        state: stationData.state,
        pincode: stationData.pincode,
      },
    });

    logger.info(`New police station created: ${station.name}`, {
      stationId: station.id,
      mapboxPlaceId: station.mapboxPlaceId,
    });

    return station;
  }

  /**
   * Get all active police stations
   */
  async getAllStations(filters?: {
    district?: string;
    state?: string;
    page?: number;
    limit?: number;
  }) {
    const { district, state, page = 1, limit = 50 } = filters || {};

    const where: any = { isActive: true };
    if (district) where.district = district;
    if (state) where.state = state;

    const [stations, total] = await Promise.all([
      prisma.policeStation.findMany({
        where,
        include: {
          _count: {
            select: { officers: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.policeStation.count({ where }),
    ]);

    return {
      stations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get station by ID with officers
   */
  async getStationById(id: string) {
    return prisma.policeStation.findUnique({
      where: { id },
      include: {
        officers: {
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
        _count: {
          select: { officers: true },
        },
      },
    });
  }

  /**
   * Find nearest stations to a location
   */
  async findNearestStations(
    latitude: number,
    longitude: number,
    limit: number = 5
  ) {
    const stations = await prisma.policeStation.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { officers: true },
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

    return stationsWithDistance.slice(0, limit);
  }

  /**
   * Get officers at a specific station
   */
  async getStationOfficers(stationId: string, status?: string) {
    const where: any = { stationId };
    if (status) {
      where.status = status;
    }

    return prisma.officerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update station details (admin only)
   */
  async updateStation(
    id: string,
    data: {
      name?: string;
      address?: string;
      phone?: string;
      isActive?: boolean;
    }
  ) {
    return prisma.policeStation.update({
      where: { id },
      data,
    });
  }
}
