import { Response } from 'express';
import { AuthRequest } from '../../types';
import { ResponseUtil } from '../../utils/response.util';
import { asyncHandler } from '../../middlewares/error.middleware';
import { PoliceStationService } from './station.service';

const stationService = new PoliceStationService();

export class PoliceStationController {
  /**
   * GET /stations/search
   * Search police stations via Mapbox
   */
  searchStations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { query, latitude, longitude, limit } = req.query;

    if (!query || typeof query !== 'string') {
      return ResponseUtil.badRequest(res, 'Search query is required');
    }

    const results = await stationService.searchStations(query, {
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
      limit: limit ? parseInt(limit as string) : 10,
    });

    return ResponseUtil.success(res, results);
  });

  /**
   * POST /stations/select
   * Select a police station (creates if not exists)
   */
  selectStation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stationData = req.body;

    if (!stationData.mapboxPlaceId) {
      return ResponseUtil.badRequest(res, 'Mapbox place ID is required');
    }

    const station = await stationService.createOrGetStation(stationData);

    return ResponseUtil.success(res, station);
  });

  /**
   * GET /stations
   * Get all police stations
   */
  getAllStations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { district, state, page, limit } = req.query;

    const result = await stationService.getAllStations({
      district: district as string,
      state: state as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return ResponseUtil.success(res, result);
  });

  /**
   * GET /stations/:id
   * Get station details
   */
  getStationById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const station = await stationService.getStationById(id);

    if (!station) {
      return ResponseUtil.notFound(res, 'Police station not found');
    }

    return ResponseUtil.success(res, station);
  });

  /**
   * GET /stations/nearest
   * Find nearest stations to a location
   */
  findNearestStations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { latitude, longitude, limit } = req.query;

    if (!latitude || !longitude) {
      return ResponseUtil.badRequest(res, 'Latitude and longitude are required');
    }

    const stations = await stationService.findNearestStations(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      limit ? parseInt(limit as string) : 5
    );

    return ResponseUtil.success(res, stations);
  });

  /**
   * GET /stations/:id/officers
   * Get officers at a station
   */
  getStationOfficers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.query;

    const officers = await stationService.getStationOfficers(id, status as string);

    return ResponseUtil.success(res, officers);
  });

  /**
   * PATCH /stations/:id
   * Update station details (admin only)
   */
  updateStation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, address, phone, isActive } = req.body;

    const station = await stationService.updateStation(id, {
      name,
      address,
      phone,
      isActive,
    });

    return ResponseUtil.success(res, station, 'Station updated successfully');
  });
}
