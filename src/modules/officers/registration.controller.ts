import { Response } from "express";
import { AuthRequest } from "../../types";
import { ResponseUtil } from "../../utils/response.util";
import { asyncHandler } from "../../middlewares/error.middleware";
import { OfficerRegistrationService } from "./registration.service";

const registrationService = new OfficerRegistrationService();

export class OfficerRegistrationController {
  /**
   * POST /officers/register
   * Submit officer registration
   */
  register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      name,
      email,
      phone,
      badgeNumber,
      designation,
      station,
      department,
      dateOfBirth,
      joiningDate,
      idProofUrl,
      photoUrl,
    } = req.body;

    const request = await registrationService.submitRegistration({
      name,
      email,
      phone,
      badgeNumber,
      designation,
      station,
      department,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      idProofUrl,
      photoUrl,
    });

    return ResponseUtil.success(
      res,
      {
        requestId: request.id,
        status: request.status,
      },
      "Registration request submitted. Admin will review and approve.",
    );
  });

  /**
   * GET /admin/officers/requests
   * Get all registration requests (admin only)
   */
  getRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, page, limit } = req.query;

    const result = await registrationService.getRequests({
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return ResponseUtil.success(res, result);
  });

  /**
   * GET /admin/officers/requests/:id
   * Get single registration request (admin only)
   */
  getRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const request = await registrationService.getRequestById(id);

    return ResponseUtil.success(res, request);
  });

  /**
   * POST /admin/officers/approve/:id
   * Approve registration and create officer account (admin only)
   */
  approveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const { id } = req.params;
    const { officerId, password } = req.body;

    const result = await registrationService.approveRegistration(
      id,
      req.user.id,
      { officerId, password },
    );

    return ResponseUtil.success(
      res,
      {
        officerId: result.officerId,
        temporaryPassword: result.temporaryPassword,
        user: {
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
        },
      },
      "Officer account created successfully",
    );
  });

  /**
   * POST /admin/officers/reject/:id
   * Reject registration request (admin only)
   */
  rejectRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return ResponseUtil.badRequest(res, "Rejection reason is required");
    }

    await registrationService.rejectRegistration(id, req.user.id, reason);

    return ResponseUtil.success(res, null, "Registration request rejected");
  });
}
