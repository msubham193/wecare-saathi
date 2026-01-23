import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../config/logger';

/**
 * Send WhatsApp message using WhatsApp Business API
 * @param phoneNumber Recipient phone number with country code
 * @param message Message content
 */
export async function sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
  if (!config.whatsapp.apiUrl || !config.whatsapp.apiKey) {
    logger.warn('WhatsApp provider not configured, skipping WhatsApp');
    return false;
  }
  
  try {
    // WhatsApp Business API call
    const response = await axios.post(
      `${config.whatsapp.apiUrl}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      logger.info(`WhatsApp message sent to ${phoneNumber}`);
      return true;
    }
    
    logger.warn(`WhatsApp send failed with status ${response.status}`);
    return false;
  } catch (error: any) {
    logger.error('WhatsApp send error:', error.message);
    throw new Error(`WhatsApp send failed: ${error.message}`);
  }
}
