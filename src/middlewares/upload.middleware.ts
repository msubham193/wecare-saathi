import multer from 'multer';
import { Request } from 'express';
import { config } from '../config';

// Allowed video MIME types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/webm',
];

// Allowed evidence file types (images + videos)
const ALLOWED_EVIDENCE_TYPES = [
  ...ALLOWED_VIDEO_TYPES,
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
];

/**
 * Multer configuration for video uploads
 */
const videoStorage = multer.memoryStorage();

const videoFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_VIDEO_TYPES.join(', ')}`
      )
    );
  }
};

/**
 * Multer configuration for evidence uploads
 */
const evidenceFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_EVIDENCE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_EVIDENCE_TYPES.join(', ')}`
      )
    );
  }
};

/**
 * Middleware for uploading SOS videos (10 seconds max)
 */
export const uploadSOSVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: (config.fileUpload?.maxVideoSizeMB || 50) * 1024 * 1024, // Convert MB to bytes
  },
}).single('video');

/**
 * Middleware for uploading evidence files
 */
export const uploadEvidence = multer({
  storage: videoStorage,
  fileFilter: evidenceFileFilter,
  limits: {
    fileSize: (config.fileUpload?.maxSizeMB || 10) * 1024 * 1024, // Convert MB to bytes
  },
}).single('file');

/**
 * Error handler for multer errors
 */
export const handleUploadError = (_err: any, _req: Request, res: any, next: any) => {
  if (_err instanceof multer.MulterError) {
    if (_err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        error: `Maximum file size is ${config.fileUpload?.maxVideoSizeMB || 50}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: _err.message,
    });
  } else if (_err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file',
      error: _err.message,
    });
  }
  next();
};
