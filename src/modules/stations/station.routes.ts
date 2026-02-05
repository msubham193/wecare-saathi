import { Router } from 'express';
import { PoliceStationController } from './station.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validator.middleware';
import { z } from 'zod';

const router = Router();
const stationController = new PoliceStationController();

const selectStationSchema = z.object({
  mapboxPlaceId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

const updateStationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /stations/search
 * Search police stations via Mapbox (public for registration)
 */
router.get('/search', stationController.searchStations);

/**
 * GET /stations/nearest
 * Find nearest stations to coordinates (public)
 */
router.get('/nearest', stationController.findNearestStations);

/**
 * POST /stations/select
 * Select a station from search results (public for registration)
 */
router.post(
  '/select',
  validate(selectStationSchema),
  stationController.selectStation
);

/**
 * GET /stations
 * Get all stations (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  stationController.getAllStations
);

/**
 * GET /stations/:id
 * Get station details (admin only)
 */
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  stationController.getStationById
);

/**
 * GET /stations/:id/officers
 * Get officers at a station (admin only)
 */
router.get(
  '/:id/officers',
  authenticate,
  requireAdmin,
  stationController.getStationOfficers
);

/**
 * PATCH /stations/:id
 * Update station details (admin only)
 */
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateStationSchema),
  stationController.updateStation
);

export default router;
