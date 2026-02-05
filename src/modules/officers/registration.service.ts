import prisma from "../../config/database";
import { logger } from "../../config/logger";
import { PasswordService } from "../../services/password.service";
import { RegistrationStatus, UserRole } from "@prisma/client";

interface StationData {
  mapboxPlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  district?: string;
  state?: string;
  pincode?: string;
}

interface RegistrationRequest {
  name: string;
  email: string;
  phone: string;
  badgeNumber: string;
  designation: string;
  station: string;
  stationData?: StationData;
  department: string;
  dateOfBirth?: Date;
  joiningDate?: Date;
  idProofUrl?: string;
  photoUrl?: string;
}

export class OfficerRegistrationService {
  /**
   * Submit officer registration request
   */
  async submitRegistration(data: RegistrationRequest) {
    try {
      // Check for duplicates
      const existing = await prisma.officerRegistrationRequest.findFirst({
        where: {
          OR: [
            { email: data.email },
            { phone: data.phone },
            { badgeNumber: data.badgeNumber },
          ],
        },
      });

      if (existing) {
        if (existing.email === data.email) {
          throw new Error("Email already registered");
        }
        if (existing.phone === data.phone) {
          throw new Error("Phone number already registered");
        }
        if (existing.badgeNumber === data.badgeNumber) {
          throw new Error("Badge number already registered");
        }
      }

      let stationId: string | undefined;

      // If station data is provided, create or get the station
      if (data.stationData) {
        const station = await prisma.policeStation.upsert({
          where: { mapboxPlaceId: data.stationData.mapboxPlaceId },
          update: {}, // Don't update if exists
          create: {
            mapboxPlaceId: data.stationData.mapboxPlaceId,
            name: data.stationData.name,
            address: data.stationData.address,
            latitude: data.stationData.latitude,
            longitude: data.stationData.longitude,
            district: data.stationData.district,
            state: data.stationData.state,
            pincode: data.stationData.pincode,
          },
        });
        stationId = station.id;
      }

      const request = await prisma.officerRegistrationRequest.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          badgeNumber: data.badgeNumber,
          designation: data.designation,
          station: data.station,
          stationId: stationId,
          department: data.department,
          dateOfBirth: data.dateOfBirth,
          joiningDate: data.joiningDate,
          idProofUrl: data.idProofUrl,
          photoUrl: data.photoUrl,
          status: RegistrationStatus.PENDING,
        },
        include: {
          policeStation: true,
        },
      });

      logger.info(`New officer registration request: ${request.id}`, {
        badgeNumber: data.badgeNumber,
        name: data.name,
        stationId: stationId,
      });

      return request;
    } catch (error: any) {
      logger.error("Error submitting registration:", error);
      throw error;
    }
  }

  /**
   * Get registration requests (for admin)
   */
  async getRequests(filters: {
    status?: RegistrationStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.officerRegistrationRequest.findMany({
        where,
        include: {
          policeStation: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.officerRegistrationRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single registration request
   */
  async getRequestById(id: string) {
    const request = await prisma.officerRegistrationRequest.findUnique({
      where: { id },
      include: {
        policeStation: true,
      },
    });

    if (!request) {
      throw new Error("Registration request not found");
    }

    return request;
  }

  /**
   * Approve registration and create officer account
   */
  async approveRegistration(
    requestId: string,
    adminUserId: string,
    options?: {
      officerId?: string;
      password?: string;
    },
  ) {
    const request = await this.getRequestById(requestId);

    if (request.status !== RegistrationStatus.PENDING) {
      throw new Error("Request has already been processed");
    }

    // Generate officer ID if not provided
    const officerId = options?.officerId || (await this.generateOfficerId());

    // Generate password if not provided
    const password = options?.password || PasswordService.generatePassword();
    const hashedPassword = await PasswordService.hashPassword(password);

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: request.email },
        include: {
          officerProfile: true,
        },
      });

      // If user exists and already has an officer profile, prevent duplicate
      if (existingUser?.officerProfile) {
        throw new Error(
          "A user account with this email already exists and is linked to an officer profile",
        );
      }

      // Create user and officer profile in transaction
      const result = await prisma.$transaction(async (tx) => {
        let user;

        // Reuse existing user or create new one
        if (existingUser && existingUser.role === UserRole.OFFICER) {
          // Update existing officer user
          user = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: request.name,
              phone: request.phone,
              password: hashedPassword,
              mustChangePassword: true,
              accountStatus: "ACTIVE",
            },
          });
        } else if (existingUser) {
          // User exists but with different role - this is a conflict
          throw new Error(
            `A user account with email ${request.email} already exists with role ${existingUser.role}`,
          );
        } else {
          // Create new user account
          user = await tx.user.create({
            data: {
              name: request.name,
              email: request.email,
              phone: request.phone,
              role: UserRole.OFFICER,
              password: hashedPassword,
              mustChangePassword: true,
              accountStatus: "ACTIVE",
            },
          });
        }

        // Create officer profile with station link
        const officer = await tx.officerProfile.create({
          data: {
            userId: user.id,
            badgeNumber: request.badgeNumber,
            officerId: officerId,
            designation: request.designation,
            station: request.station,
            stationId: request.stationId,
          },
        });

        // Update registration request
        await tx.officerRegistrationRequest.update({
          where: { id: requestId },
          data: {
            status: RegistrationStatus.APPROVED,
            reviewedBy: adminUserId,
            reviewedAt: new Date(),
            generatedOfficerId: officerId,
          },
        });

        return { user, officer };
      });

      logger.info(`Officer account created: ${officerId}`, {
        userId: result.user.id,
        badgeNumber: request.badgeNumber,
      });

      return {
        officerId,
        temporaryPassword: password,
        user: result.user,
        officer: result.officer,
      };
    } catch (error: any) {
      logger.error("Error approving registration:", error);
      throw new Error("Failed to create officer account");
    }
  }

  /**
   * Reject registration request
   */
  async rejectRegistration(
    requestId: string,
    adminUserId: string,
    reason: string,
  ) {
    const request = await this.getRequestById(requestId);

    if (request.status !== RegistrationStatus.PENDING) {
      throw new Error("Request has already been processed");
    }

    const updated = await prisma.officerRegistrationRequest.update({
      where: { id: requestId },
      data: {
        status: RegistrationStatus.REJECTED,
        rejectionReason: reason,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    logger.info(`Registration request rejected: ${requestId}`, { reason });

    return updated;
  }

  /**
   * Generate unique officer ID
   */
  private async generateOfficerId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OF${year}`;

    // Get the latest officer ID for this year
    const latest = await prisma.officerProfile.findFirst({
      where: {
        officerId: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        officerId: true,
      },
    });

    let sequence = 1;
    if (latest?.officerId) {
      const lastSequence = parseInt(latest.officerId.replace(prefix, ""));
      sequence = lastSequence + 1;
    }

    const officerId = `${prefix}${sequence.toString().padStart(3, "0")}`;
    return officerId;
  }
}
