import config from '../config';
import logger from '../config/logger';
import { TwilioProvider, MockSmsProvider, SmsService as MultiProviderSmsService } from './smsProviders';

// Initialize SMS providers
const twilioProvider = new TwilioProvider(
  config.twilio.accountSid,
  config.twilio.authToken,
  config.twilio.phoneNumber
);

const mockProvider = new MockSmsProvider();

// Create multi-provider SMS service with fallback
const multiProviderService = new MultiProviderSmsService(
  config.server.nodeEnv === 'production'
    ? [twilioProvider] // Production: only use real providers
    : [twilioProvider, mockProvider] // Development: try real first, fallback to mock
);

/**
 * SMS Service for Vinayaka Transport
 * Handles OTP and transactional SMS delivery
 */
class SmsService {
  async sendOtp(phoneNumber: string, otp: string, expiryMinutes: number = 10): Promise<void> {
    try {
      await multiProviderService.sendOtp(phoneNumber, otp, expiryMinutes);
      logger.info({ phoneNumber }, 'OTP sent successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, phoneNumber }, `Failed to send OTP: ${message}`);

      // In production, throw error so client knows OTP failed
      // In development, log but continue (mock provider will be used)
      if (config.server.nodeEnv === 'production') {
        throw error;
      } else {
        logger.warn('OTP delivery failed in development, but continuing (using mock)');
      }
    }
  }

  async sendTransactional(phoneNumber: string, message: string): Promise<void> {
    try {
      await multiProviderService.send(phoneNumber, message);
      logger.info({ phoneNumber }, 'Transactional SMS sent successfully');
    } catch (error) {
      logger.error({ error, phoneNumber }, 'Failed to send transactional SMS');
      throw error;
    }
  }

  logProviderStatus(): void {
    multiProviderService.logStatus();
  }
}

export const smsService = new SmsService();

// Log status on startup
setTimeout(() => {
  smsService.logProviderStatus();
}, 1000);

