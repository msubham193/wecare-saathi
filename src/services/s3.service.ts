import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = config.s3.bucket;
    
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
      ...(config.s3.endpoint && { endpoint: config.s3.endpoint }),
    });

    logger.info('S3 Service initialized', {
      bucket: this.bucket,
      region: config.s3.region,
    });
  }

  /**
   * Upload a video file to S3
   */
  async uploadVideo(
    file: Express.Multer.File,
    options: {
      caseNumber: string;
      userId: string;
    }
  ): Promise<{ key: string; url: string }> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = `videos/${options.caseNumber}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          caseNumber: options.caseNumber,
          userId: options.userId,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(key);

      logger.info('Video uploaded to S3', {
        key,
        caseNumber: options.caseNumber,
        size: file.size,
      });

      return { key, url };
    } catch (error: any) {
      logger.error('Error uploading video to S3:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Upload evidence file to S3
   */
  async uploadEvidence(
    file: Express.Multer.File,
    options: {
      caseId: string;
      userId: string;
    }
  ): Promise<{ key: string; url: string }> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = `evidence/${options.caseId}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          caseId: options.caseId,
          userId: options.userId,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(key);

      logger.info('Evidence uploaded to S3', {
        key,
        caseId: options.caseId,
        size: file.size,
      });

      return { key, url };
    } catch (error: any) {
      logger.error('Error uploading evidence to S3:', error);
      throw new Error(`Failed to upload evidence: ${error.message}`);
    }
  }

  /**
   * Upload feedback media (photo or video) to S3
   */
  async uploadFeedbackMedia(
    file: Express.Multer.File,
    options: {
      caseId: string;
      userId: string;
    }
  ): Promise<{ key: string; url: string }> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = `feedback/${options.caseId}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          caseId: options.caseId,
          userId: options.userId,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(key);

      logger.info('Feedback media uploaded to S3', {
        key,
        caseId: options.caseId,
        size: file.size,
      });

      return { key, url };
    } catch (error: any) {
      logger.error('Error uploading feedback media to S3:', error);
      throw new Error(`Failed to upload feedback media: ${error.message}`);
    }
  }

  /**
   * Generate a pre-signed URL for secure access to a file
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      logger.info('Generated pre-signed URL', { key, expiresIn });

      return url;
    } catch (error: any) {
      logger.error('Error generating pre-signed URL:', error);
      throw new Error(`Failed to generate pre-signed URL: ${error.message}`);
    }
  }

  /**
   * Get public URL for a file (if bucket is public)
   */
  private getPublicUrl(key: string): string {
    if (config.s3.endpoint) {
      return `${config.s3.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
  }
}

export const s3Service = new S3Service();
