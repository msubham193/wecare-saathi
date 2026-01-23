import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../config/logger';

/**
 * Send SMS using configured SMS provider
 * @param phoneNumber Recipient phone number with country code
 * @param message SMS message content
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  if (!config.sms.providerUrl || !config.sms.apiKey) {
    logger.warn('SMS provider not configured, skipping SMS');
    return false;
  }
  
  try {
    // Generic SMS API call - adjust based on your provider
    const response = await axios.post(
      config.sms.providerUrl,
      {
        to: phoneNumber,
        from: config.sms.senderId,
        message,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.sms.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      logger.info(`SMS sent to ${phoneNumber}`);
      return true;
    }
    
    logger.warn(`SMS send failed with status ${response.status}`);
    return false;
  } catch (error: any) {
    logger.error('SMS send error:', error.message);
    throw new Error(`SMS send failed: ${error.message}`);
  }
}
