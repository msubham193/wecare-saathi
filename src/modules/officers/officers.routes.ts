import { Router } from "express";
import { OfficersController } from "./officers.controller";
import registrationRoutes from "./registration.routes";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  requireOfficer,
  requireAdmin,
} from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validator.middleware";
import { z } from "zod";

const router = Router();
const officersController = new OfficersController();

// Mount registration routes
router.use(registrationRoutes);

const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  caseId: z.string().uuid().optional(),
});

/**
 * POST /officer/location
 * Update officer location
 */
router.post(
  "/location",
  authenticate,
  requireOfficer,
  validate(locationUpdateSchema),
  officersController.updateLocation,
);

/**
 * GET /officer/profile
 * Get officer profile
 */
router.get(
  "/profile",
  authenticate,
  requireOfficer,
  officersController.getProfile,
);

/**
 * GET /admin/officers
 * Get all officers
 */
router.get(
  "/admin/officers",
  authenticate,
  requireAdmin,
  officersController.getAllOfficers,
);

/**
 * GET /admin/officers/active-locations
 * Get active officer locations
 */
router.get(
  "/admin/officers/active-locations",
  authenticate,
  requireAdmin,
  officersController.getActiveLocations,
);

export default router;
