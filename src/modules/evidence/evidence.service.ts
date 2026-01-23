import prisma from '../../config/database';
import { s3Service } from '../../services/s3.service';
import { logger } from '../../config/logger';
import { UserRole } from '@prisma/client';

export class EvidenceService {
  /**
   * Upload evidence for a case
   */
  async uploadEvidence(
    file: Express.Multer.File,
    caseId: string,
    userId: string,
    userRole: UserRole
  ) {
    try {
      // Verify case exists and user has access
      const sosCase = await prisma.sosCase.findUnique({
        where: { id: caseId },
        include: {
          citizen: true,
          officer: true,
        },
      });

      if (!sosCase) {
        throw new Error('Case not found');
      }

      // Check access permissions
      const hasAccess =
        userRole === UserRole.ADMIN ||
        sosCase.citizen.userId === userId ||
        sosCase.officer?.userId === userId;

      if (!hasAccess) {
        throw new Error('Unauthorized to upload evidence for this case');
      }

      // Upload file to S3
      const { url } = await s3Service.uploadEvidence(file, {
        caseId,
        userId,
      });

      // Create evidence record
      const evidence = await prisma.evidence.create({
        data: {
          caseId,
          fileUrl: url,
          fileType: file.mimetype,
          fileName: file.originalname,
          fileSize: file.size,
          uploadedBy: userId,
          virusScanStatus: 'pending',
          accessLevel: 'restricted',
        },
      });

      logger.info('Evidence uploaded successfully', {
        evidenceId: evidence.id,
        caseId,
        fileName: file.originalname,
      });

      return evidence;
    } catch (error: any) {
      logger.error('Error uploading evidence:', error);
      throw error;
    }
  }

  /**
   * Get all evidence for a case
   */
  async getEvidenceByCase(caseId: string, userId: string, userRole: UserRole) {
    try {
      // Verify case exists and user has access
      const sosCase = await prisma.sosCase.findUnique({
        where: { id: caseId },
        include: {
          citizen: true,
          officer: true,
        },
      });

      if (!sosCase) {
        throw new Error('Case not found');
      }

      // Check access permissions
      const hasAccess =
        userRole === UserRole.ADMIN ||
        sosCase.citizen.userId === userId ||
        sosCase.officer?.userId === userId;

      if (!hasAccess) {
        throw new Error('Unauthorized to view evidence for this case');
      }

      // Get all evidence for the case
      const evidence = await prisma.evidence.findMany({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
      });

      return evidence;
    } catch (error: any) {
      logger.error('Error fetching evidence:', error);
      throw error;
    }
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(evidenceId: string, userId: string, userRole: UserRole) {
    try {
      const evidence = await prisma.evidence.findUnique({
        where: { id: evidenceId },
        include: {
          case: {
            include: {
              citizen: true,
              officer: true,
            },
          },
        },
      });

      if (!evidence) {
        throw new Error('Evidence not found');
      }

      // Check access permissions
      const hasAccess =
        userRole === UserRole.ADMIN ||
        evidence.case.citizen.userId === userId ||
        evidence.case.officer?.userId === userId;

      if (!hasAccess) {
        throw new Error('Unauthorized to view this evidence');
      }

      return evidence;
    } catch (error: any) {
      logger.error('Error fetching evidence by ID:', error);
      throw error;
    }
  }
}
