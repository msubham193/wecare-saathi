import * as admin from 'firebase-admin';
import { config } from './index';
import { logger } from './logger';

// Only initialize if credentials are provided and valid
let firebaseApp: admin.app.App | null = null;

try {
  if (config.firebase.projectId && 
      config.firebase.privateKey && 
      config.firebase.clientEmail &&
      config.firebase.projectId !== 'test-project' &&
      config.firebase.privateKey !== 'test-key') {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
    });
    logger.info('Firebase Admin initialized successfully');
  } else {
    logger.warn('Firebase credentials not configured - Authentication features will be limited. Please update .env with real Firebase credentials.');
  }
} catch (error) {
  logger.error('Failed to initialize Firebase Admin:', error);
  logger.warn('Server will continue without Firebase. Update .env with valid credentials to enable authentication.');
}

export const verifyFirebaseToken = async (token: string): Promise<admin.auth.DecodedIdToken> => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    logger.error('Firebase token verification failed:', error);
    throw new Error('Invalid Firebase token');
  }
};

export const sendFCMNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<string> => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
    };
    
    const response = await admin.messaging().send(message);
    logger.info(`FCM notification sent: ${response}`);
    return response;
  } catch (error) {
    logger.error('FCM notification failed:', error);
    throw error;
  }
};

export default firebaseApp;
