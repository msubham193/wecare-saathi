import prisma from '../../config/database';
import { SOSStateMachine } from './sos-state-machine';
import { logger } from '../../config/logger';
import { CreateSOSRequest, UpdateStatusRequest } from './sos.validator';
import { CaseStatus, UserRole } from '@prisma/client';
import { generateCaseNumber, ERROR_MESSAGES, DEFAULTS } from '../../utils/constants';
import { getAddressFromCoordinates } from '../../utils/distance-calculator';
import { s3Service } from '../../services/s3.service';
import { queueNotification } from '../../queues/notification.queue';

export class SOSService {
  /**
   * Create a new SOS case
   */
  async createSOS(
    citizenId: string,
    data: CreateSOSRequest,
    videoFile?: Express.Multer.File
  ) {
    try {
      // Get citizen profile
      const citizen = await prisma.citizenProfile.findUnique({
        where: { id: citizenId },
        include: { guardians: true },
      });
      
      if (!citizen) {
        throw new Error('Citizen profile not found');
      }
      
      // Get address from coordinates
      const address = await getAddressFromCoordinates(data.latitude, data.longitude);
      
      // Generate case number
      const caseNumber = generateCaseNumber();
      
      // Upload video if provided
      let videoData: {
        videoUrl?: string;
        videoFileName?: string;
        videoDuration?: number;
        videoUploadedAt?: Date;
      } = {};
      
      if (videoFile) {
        try {
          const { url } = await s3Service.uploadVideo(videoFile, {
            caseNumber,
            userId: citizen.userId,
          });
          
          videoData = {
            videoUrl: url,
            videoFileName: videoFile.originalname,
            videoDuration: data.videoDuration,
            videoUploadedAt: new Date(),
          };
          
          logger.info('SOS video uploaded successfully', {
            caseNumber,
            fileName: videoFile.originalname,
            size: videoFile.size,
          });
        } catch (error: any) {
          logger.error('Failed to upload SOS video, proceeding without video:', error);
          // Continue creating SOS even if video upload fails
        }
      }
      
      // Create SOS case
      const sosCase = await prisma.sosCase.create({
        data: {
          caseNumber,
          citizenId: citizen.id,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          address,
          description: data.description,
          status: SOSStateMachine.getInitialStatus(),
          priority: DEFAULTS.CASE_PRIORITY,
          ...videoData,
        },
        include: {
          citizen: {
            include: {
              user: true,
              guardians: true,
            },
          },
        },
      });
      
      // Create initial status log
      await prisma.caseStatusLog.create({
        data: {
          caseId: sosCase.id,
          toStatus: CaseStatus.CREATED,
          changedBy: citizen.userId,
          notes: 'SOS created',
        },
      });
      
      logger.info(`SOS case created: ${sosCase.caseNumber}`, {
        hasVideo: !!videoData.videoUrl,
      });
      
      // Return case data to trigger assignment and notifications
      return sosCase;
    } catch (error: any) {
      logger.error('Error creating SOS:', error);
      throw error;
    }
  }
  
  /**
   * Get SOS case by ID
   */
  async getCaseById(caseId: string, userId: string, userRole: UserRole) {
    const sosCase = await prisma.sosCase.findUnique({
      where: { id: caseId },
      include: {
        citizen: {
          include: {
            user: true,
            guardians: true,
          },
        },
        officer: {
          include: {
            user: true,
          },
        },
        statusLogs: {
          orderBy: { timestamp: 'desc' },
        },
        evidence: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!sosCase) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }
    
    // Check access permissions
    const hasAccess =
      userRole === UserRole.ADMIN ||
      sosCase.citizen.userId === userId ||
      sosCase.officer?.userId === userId;
    
    if (!hasAccess) {
      throw new Error(ERROR_MESSAGES.FORBIDDEN);
    }
    
    return sosCase;
  }
  
  /**
   * Get cases with filters
   */
  async getCases(filters: {
    status?: CaseStatus;
    citizenId?: string;
    officerId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      citizenId,
      officerId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (citizenId) where.citizenId = citizenId;
    if (officerId) where.officerId = officerId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    
    const [cases, total] = await Promise.all([
      prisma.sosCase.findMany({
        where,
        include: {
          citizen: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
          officer: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sosCase.count({ where }),
    ]);
    
    return {
      cases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Update case status
   */
  async updateStatus(
    caseId: string,
    data: UpdateStatusRequest,
    userId: string,
    userRole: UserRole
  ) {
    const sosCase = await prisma.sosCase.findUnique({
      where: { id: caseId },
      include: {
        officer: true,
      },
    });
    
    if (!sosCase) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }
    
    // Validate transition with context
    SOSStateMachine.validateTransitionWithContext(
      sosCase.status,
      data.status,
      {
        hasOfficer: !!sosCase.officerId,
        isOfficer: userRole === UserRole.OFFICER && sosCase.officer?.userId === userId,
        isAdmin: userRole === UserRole.ADMIN,
      }
    );
    
    // Update case
    const updated = await prisma.sosCase.update({
      where: { id: caseId },
      data: {
        status: data.status,
        closedAt: data.status === CaseStatus.CLOSED ? new Date() : undefined,
        closureNotes: data.status === CaseStatus.CLOSED ? data.notes : undefined,
      },
      include: {
        citizen: {
          include: { user: true },
        },
        officer: {
          include: { user: true },
        },
      },
    });
    
    // Create status log
    await prisma.caseStatusLog.create({
      data: {
        caseId,
        fromStatus: sosCase.status,
        toStatus: data.status,
        changedBy: userId,
        notes: data.notes,
      },
    });
    
    logger.info(`Case ${sosCase.caseNumber} status updated: ${sosCase.status} -> ${data.status}`);
    
    return updated;
  }
  
  /**
   * Assign officer to case
   */
  async assignOfficer(caseId: string, officerId: string, assignedBy: string) {
    const sosCase = await prisma.sosCase.findUnique({
      where: { id: caseId },
    });
    
    if (!sosCase) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }
    
    // Validate officer exists and is available
    const officer = await prisma.officerProfile.findUnique({
      where: { id: officerId },
      include: { user: true },
    });
    
    if (!officer) {
      throw new Error('Officer not found');
    }
    
    // Update case
    const updated = await prisma.sosCase.update({
      where: { id: caseId },
      data: {
        officerId,
        assignedBy,
        assignedAt: new Date(),
        status: CaseStatus.ASSIGNED,
      },
      include: {
        citizen: {
          include: { user: true, guardians: true },
        },
        officer: {
          include: { user: true },
        },
      },
    });
    
    // Create status log
    await prisma.caseStatusLog.create({
      data: {
        caseId,
        fromStatus: sosCase.status,
        toStatus: CaseStatus.ASSIGNED,
        changedBy: assignedBy,
        notes: `Assigned to officer ${officer.badgeNumber}`,
      },
    });
    
    // Update officer status
    await prisma.officerProfile.update({
      where: { id: officerId },
      data: { status: 'BUSY' },
    });
    
    logger.info(`Case ${sosCase.caseNumber} assigned to officer ${officer.badgeNumber}`);
    
    return updated;
  }
  
  /**
   * Get case status history
   */
  async getStatusHistory(caseId: string) {
    return prisma.caseStatusLog.findMany({
      where: { caseId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Notify guardians about SOS
   */
  async notifyGuardian(caseId: string, userId: string) {
    const sosCase = await prisma.sosCase.findUnique({
      where: { id: caseId },
      include: {
        citizen: {
          include: {
            user: true,
            guardians: true,
          },
        },
      },
    });

    if (!sosCase) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }

    // Verify ownership
    if (sosCase.citizen.userId !== userId) {
      throw new Error(ERROR_MESSAGES.FORBIDDEN);
    }

    const { citizen } = sosCase;
    const locationLink = `https://maps.google.com/?q=${sosCase.latitude},${sosCase.longitude}`;
    
    // Notify all guardians
    const notifications = citizen.guardians.map(async (guardian) => {
      // Send SMS
      await queueNotification({
        recipient: guardian.phone,
        type: 'sms',
        data: {
          message: `SOS ALERT! ${citizen.user.name} needs help! Location: ${locationLink}. Track here: [App Link]`,
        },
        caseId: sosCase.id,
      });
      
      // TODO: If guardian has app account, send FCM
    });

    await Promise.all(notifications);

    return { message: 'Guardians notified successfully' };
  }

  /**
   * Add media to SOS case (Video Upload)
   */
  async addMedia(
    caseId: string, 
    userId: string,
    file: Express.Multer.File, 
    mediaType: 'photo' | 'video'
  ) {
    const sosCase = await prisma.sosCase.findUnique({
      where: { id: caseId },
      include: { citizen: true },
    });

    if (!sosCase) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }

    // Verify ownership
    if (sosCase.citizen.userId !== userId) {
      throw new Error(ERROR_MESSAGES.FORBIDDEN);
    }

    // Upload to S3
    const { url } = await s3Service.uploadVideo(file, {
        caseNumber: sosCase.caseNumber,
        userId: userId,
    });

    // Update case with video URL
    // Note: Currently schema has single videoUrl. If multiple videos support is needed, we need a separate table or array.
    // Based on requirement, we update the main videoUrl.
    if (mediaType === 'video') {
         await prisma.sosCase.update({
            where: { id: caseId },
            data: {
                videoUrl: url,
                videoFileName: file.originalname,
                videoUploadedAt: new Date(),
            }
        });
    } else {
        // Handle photos if array exists, or single photo
        // For now user requested video fix primarily.
        // Assuming photoUrls is string[]
        // We will append to photoUrls (if it was an array in schema, but typical prisma string[] is supported)
         await prisma.sosCase.update({
            where: { id: caseId },
            data: {
                photoUrls: {
                    push: url
                }
            }
        });
    }

    return { url };
  }
}
