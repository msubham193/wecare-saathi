import prisma from '../../config/database';
import { s3Service } from '../../services/s3.service';
import { logger } from '../../config/logger';
import { UserRole } from '@prisma/client';

export class FeedbackService {
  /**
   * Create feedback for a closed case
   */
  async createFeedback(
    caseId: string,
    userId: string,
    data: { text: string; resolved: boolean; rating?: number },
    photoFile?: Express.Multer.File,
    videoFile?: Express.Multer.File,
  ) {
    const sosCase = await prisma.sosCase.findUnique({
      where: { id: caseId },
      include: { citizen: true },
    });

    if (!sosCase) {
      throw new Error('Case not found');
    }

    if (sosCase.citizen.userId !== userId) {
      throw new Error('You can only submit feedback for your own cases');
    }

    if (sosCase.status !== 'CLOSED') {
      throw new Error('Feedback can only be submitted for closed cases');
    }

    const existingFeedback = await prisma.feedback.findUnique({
      where: { caseId },
    });

    if (existingFeedback) {
      throw new Error('Feedback has already been submitted for this case');
    }

    let photoData: { photoUrl?: string; photoFileName?: string; photoFileSize?: number } = {};
    if (photoFile) {
      const { url } = await s3Service.uploadFeedbackMedia(photoFile, { caseId, userId });
      photoData = {
        photoUrl: url,
        photoFileName: photoFile.originalname,
        photoFileSize: photoFile.size,
      };
    }

    let videoData: { videoUrl?: string; videoFileName?: string; videoFileSize?: number } = {};
    if (videoFile) {
      const { url } = await s3Service.uploadFeedbackMedia(videoFile, { caseId, userId });
      videoData = {
        videoUrl: url,
        videoFileName: videoFile.originalname,
        videoFileSize: videoFile.size,
      };
    }

    const feedback = await prisma.feedback.create({
      data: {
        caseId,
        citizenId: sosCase.citizen.id,
        text: data.text,
        resolved: data.resolved,
        rating: data.rating,
        ...photoData,
        ...videoData,
      },
      include: {
        citizen: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
        case: { select: { caseNumber: true, status: true } },
      },
    });

    logger.info('Feedback created', {
      feedbackId: feedback.id,
      caseId,
      hasPhoto: !!photoFile,
      hasVideo: !!videoFile,
    });

    return feedback;
  }

  /**
   * Get feedback for a specific case
   */
  async getFeedbackByCase(caseId: string, userId: string, userRole: UserRole) {
    const sosCase = await prisma.sosCase.findUnique({
      where: { id: caseId },
      include: { citizen: true },
    });

    if (!sosCase) {
      throw new Error('Case not found');
    }

    if (userRole !== UserRole.ADMIN && sosCase.citizen.userId !== userId) {
      throw new Error('Unauthorized to view feedback for this case');
    }

    const feedback = await prisma.feedback.findUnique({
      where: { caseId },
      include: {
        citizen: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
        case: { select: { caseNumber: true, status: true } },
        replies: {
          include: {
            admin: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return feedback;
  }

  /**
   * Get all feedbacks with pagination/filters (admin only)
   */
  async getAllFeedbacks(filters: {
    page?: number;
    limit?: number;
    resolved?: boolean;
    rating?: number;
  }) {
    const { page = 1, limit = 20, resolved, rating } = filters;

    const where: any = {};
    if (resolved !== undefined) where.resolved = resolved;
    if (rating !== undefined) where.rating = rating;

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          citizen: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
          case: { select: { caseNumber: true, status: true } },
          replies: {
            include: {
              admin: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    return {
      feedbacks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin creates a reply to feedback
   */
  async createReply(feedbackId: string, userId: string, text: string) {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    const adminProfile = await prisma.adminProfile.findUnique({
      where: { userId },
    });

    if (!adminProfile) {
      throw new Error('Admin profile not found');
    }

    const reply = await prisma.feedbackReply.create({
      data: {
        feedbackId,
        adminId: adminProfile.id,
        text,
      },
      include: {
        admin: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    logger.info('Feedback reply created', {
      replyId: reply.id,
      feedbackId,
      adminId: adminProfile.id,
    });

    return reply;
  }

  /**
   * Get all replies for a feedback
   */
  async getReplies(feedbackId: string, userId: string, userRole: UserRole) {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { citizen: true },
    });

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    if (userRole !== UserRole.ADMIN && feedback.citizen.userId !== userId) {
      throw new Error('Unauthorized to view replies for this feedback');
    }

    const replies = await prisma.feedbackReply.findMany({
      where: { feedbackId },
      include: {
        admin: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return replies;
  }
}
