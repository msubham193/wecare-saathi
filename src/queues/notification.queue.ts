import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config';
import redis from '../config/redis';
import { logger } from '../config/logger';
import { NotificationPayload } from '../types';
import { sendSMS } from '../modules/notifications/sms.provider';
import { sendWhatsApp } from '../modules/notifications/whatsapp.provider';
import { sendFCMNotification } from '../config/firebase';
import prisma from '../config/database';

// Create notification queue
export const notificationQueue = new Queue('notifications', {
  connection: {
    host: config.redis.url.includes('://') 
      ? config.redis.url.split('://')[1].split(':')[0] 
      : 'localhost',
    port: config.redis.url.includes(':') 
      ? parseInt(config.redis.url.split(':').pop() || '6379') 
      : 6379,
  },
});

// Notification worker
const notificationWorker = new Worker(
  'notifications',
  async (job: Job<NotificationPayload>) => {
    const { recipient, type, template, data, caseId } = job.data;
    
    logger.info(`Processing notification: ${type} to ${recipient}`);
    
    try {
      let result;
      
      switch (type) {
        case 'sms':
          result = await sendSMS(recipient, data.message);
          break;
        
        case 'whatsapp':
          result = await sendWhatsApp(recipient, data.message);
          break;
        
        case 'fcm':
          result = await sendFCMNotification(
            recipient,
            data.title,
            data.body,
            data.extraData
          );
          break;
        
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }
      
      // Update notification record
      if (caseId) {
        await prisma.notification.updateMany({
          where: {
            caseId,
            recipient,
            type,
            status: 'PENDING',
          },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      }
      
      logger.info(`Notification sent successfully: ${type} to ${recipient}`);
      
      return result;
    } catch (error: any) {
      logger.error(`Notification failed: ${type} to ${recipient}`, error);
      
      // Update notification record with failure
      if (caseId) {
        await prisma.notification.updateMany({
          where: {
            caseId,
            recipient,
            type,
          },
          data: {
            status: 'FAILED',
            failureReason: error.message,
            retryCount: { increment: 1 },
          },
        });
      }
      
      throw error;
    }
  },
  {
    connection: {
      host: config.redis.url.includes('://') 
        ? config.redis.url.split('://')[1].split(':')[0] 
        : 'localhost',
      port: config.redis.url.includes(':') 
        ? parseInt(config.redis.url.split(':').pop() || '6379') 
        : 6379,
    },
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // 10 per second
    },
  }
);

// Event listeners
notificationWorker.on('completed', (job) => {
  logger.info(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification job ${job?.id} failed:`, err);
});

// Helper function to add notification to queue
export async function queueNotification(payload: NotificationPayload) {
  await notificationQueue.add(
    'send-notification',
    payload,
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    }
  );
  
  logger.info(`Notification queued: ${payload.type} to ${payload.recipient}`);
}

export default notificationWorker;
