import prisma from '../../config/database';
import { logger } from '../../config/logger';
import { queueNotification } from '../../queues/notification.queue';
import { NOTIFICATION_MESSAGES, NOTIFICATION_TEMPLATES } from '../../utils/constants';

export class NotificationsService {
  /**
   * Send SOS created notification to guardians
   */
  async notifyGuardiansSOSCreated(caseId: string) {
    try {
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
      
      if (!sosCase || !sosCase.citizen.guardians.length) {
        return;
      }
      
      const message = NOTIFICATION_MESSAGES.SOS_CREATED_GUARDIAN(
        sosCase.citizen.user.name,
        sosCase.caseNumber,
        sosCase.address || `${sosCase.latitude}, ${sosCase.longitude}`
      );
      
      // Send to all guardians
      for (const guardian of sosCase.citizen.guardians) {
        // Create notification record
        await prisma.notification.create({
          data: {
            caseId,
            recipient: guardian.phone,
            type: 'sms',
            template: NOTIFICATION_TEMPLATES.SOS_CREATED_GUARDIAN,
            message,
          },
        });
        
        // Queue SMS
        await queueNotification({
          recipient: guardian.phone,
          type: 'sms',
          template: NOTIFICATION_TEMPLATES.SOS_CREATED_GUARDIAN,
          data: { message },
          caseId,
        });
        
        // Also try WhatsApp as fallback
        await queueNotification({
          recipient: guardian.phone,
          type: 'whatsapp',
          template: NOTIFICATION_TEMPLATES.SOS_CREATED_GUARDIAN,
          data: { message },
          caseId,
        });
      }
      
      logger.info(`Guardian notifications sent for case ${sosCase.caseNumber}`);
    } catch (error) {
      logger.error('Error sending guardian notifications:', error);
    }
  }
  
  /**
   * Send case assigned notification to officer
   */
  async notifyOfficerAssigned(caseId: string, officerId: string) {
    try {
      const [sosCase, officer] = await Promise.all([
        prisma.sosCase.findUnique({ where: { id: caseId } }),
        prisma.officerProfile.findUnique({
          where: { id: officerId },
          include: { user: true },
        }),
      ]);
      
      if (!sosCase || !officer) {
        return;
      }
      
      if (!officer.user.phone) {
        logger.warn(`Officer ${officerId} has no phone number, skipping notification`);
        return;
      }
      
      const message = NOTIFICATION_MESSAGES.CASE_ASSIGNED_OFFICER(sosCase.caseNumber);
      
      // Create notification record
      await prisma.notification.create({
        data: {
          caseId,
          recipient: officer.user.phone,
          type: 'fcm',
          template: NOTIFICATION_TEMPLATES.CASE_ASSIGNED_OFFICER,
          message,
        },
      });
      
      // Send push notification (FCM)
      // Note: Assuming FCM token is stored somewhere accessible
      // await queueNotification({
      //   recipient: fcmToken,
      //   type: 'fcm',
      //   template: NOTIFICATION_TEMPLATES.CASE_ASSIGNED_OFFICER,
      //   data: {
      //     title: 'New SOS Assignment',
      //     body: message,
      //     extraData: { caseId, caseNumber: sosCase.caseNumber },
      //   },
      //   caseId,
      // });
      
      logger.info(`Officer notification sent for case ${sosCase.caseNumber}`);
    } catch (error) {
      logger.error('Error sending officer notification:', error);
    }
  }
  
  /**
   * Send status update notification to citizen
   */
  async notifyStatusUpdate(caseId: string, status: string) {
    try {
      const sosCase = await prisma.sosCase.findUnique({
        where: { id: caseId },
        include: {
          citizen: {
            include: { user: true },
          },
        },
      });
      
      if (!sosCase) {
        return;
      }
      
      const message = NOTIFICATION_MESSAGES.STATUS_UPDATE_CITIZEN(
        sosCase.caseNumber,
        status
      );
      
      const recipientPhone = sosCase.citizen.user.phone;
      if (!recipientPhone) {
        return;
      }
      
      await prisma.notification.create({
        data: {
          caseId,
          recipient: recipientPhone,
          type: 'sms',
          template: NOTIFICATION_TEMPLATES.STATUS_UPDATE_CITIZEN,
          message,
        },
      });
      
      await queueNotification({
        recipient: recipientPhone,
        type: 'sms',
        template: NOTIFICATION_TEMPLATES.STATUS_UPDATE_CITIZEN,
        data: { message },
        caseId,
      });
      
      logger.info(`Status update notification sent for case ${sosCase.caseNumber}`);
    } catch (error) {
      logger.error('Error sending status update notification:', error);
    }
  }
}
