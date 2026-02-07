import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  
  sms: {
    providerUrl: process.env.SMS_PROVIDER_URL || '',
    apiKey: process.env.SMS_PROVIDER_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || 'WECARE',
  },
  
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || '',
    apiKey: process.env.WHATSAPP_API_KEY || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
  },
  
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    bucket: process.env.S3_BUCKET || 'we-care-evidence',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    region: process.env.S3_REGION || 'ap-south-1',
  },
  
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
  },

  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
  },

  officerAssignment: {
    maxDistanceKm: parseFloat(process.env.MAX_ASSIGNMENT_DISTANCE_KM || '10'),
    autoAssignEnabled: process.env.AUTO_ASSIGN_ENABLED === 'true',
  },
  
  rateLimit: {
    sosPerHour: parseInt(process.env.SOS_RATE_LIMIT_PER_HOUR || '100', 10),
    loginPerMinute: parseInt(process.env.LOGIN_RATE_LIMIT_PER_MINUTE || '5', 10),
    globalPer15Min: parseInt(process.env.GLOBAL_RATE_LIMIT_PER_15MIN || '100', 10),
  },
  
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  fileUpload: {
    maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    maxFilesPerCase: parseInt(process.env.MAX_FILES_PER_CASE || '5', 10),
    maxVideoSizeMB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate critical configuration
export function validateConfig() {
  const required = [
    { key: 'DATABASE_URL', value: config.database.url },
    { key: 'JWT_SECRET', value: config.jwt.secret },
  ];
  
  const missing = required.filter(item => !item.value);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.map(m => m.key).join(', ')}`);
  }
  
  if (config.env === 'production' && config.jwt.secret === 'default-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}
