import { Router } from "express";
import { OfficerRegistrationController } from "./registration.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireAdmin } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validator.middleware";
import { z } from "zod";

const router = Router();
const registrationController = new OfficerRegistrationController();

const registrationSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  badgeNumber: z.string().min(1).max(50),
  designation: z.string().min(2).max(100),
  station: z.string().min(2).max(200),
  department: z.string().min(2).max(100),
  dateOfBirth: z.string().optional(),
  joiningDate: z.string().optional(),
  idProofUrl: z.string().url().optional(),
  photoUrl: z.string().url().optional(),
});

/**
 * POST /officers/register
 * Submit officer registration request
 */
router.post(
  "/register",
  validate(registrationSchema),
  registrationController.register,
);

/**
 * GET /admin/officers/requests
 * Get all registration requests (admin only)
 */
router.get(
  "/admin/requests",
  authenticate,
  requireAdmin,
  registrationController.getRequests,
);

/**
 * GET /admin/officers/requests/:id
 * Get single registration request (admin only)
 */
router.get(
  "/admin/requests/:id",
  authenticate,
  requireAdmin,
  registrationController.getRequest,
);

/**
 * POST /admin/officers/approve/:id
 * Approve registration and create officer account (admin only)
 */
router.post(
  "/admin/approve/:id",
  authenticate,
  requireAdmin,
  registrationController.approveRequest,
);

/**
 * POST /admin/officers/reject/:id
 * Reject registration request (admin only)
 */
router.post(
  "/admin/reject/:id",
  authenticate,
  requireAdmin,
  validate(
    z.object({
      reason: z.string().min(1),
    }),
  ),
  registrationController.rejectRequest,
);

export default router;
