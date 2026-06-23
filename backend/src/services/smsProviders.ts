/**
 * SMS Provider Interface
 * Allows multiple SMS providers with fallback support
 */

import axios from 'axios';
import logger from '../config/logger';

export interface SmsProvider {
  canUse(): boolean;
  send(phoneNumber: string, message: string): Promise<void>;
  getName(): string;
}

/**
 * Twilio SMS Provider
 */
export class TwilioProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.phoneNumber = phoneNumber;
  }

  canUse(): boolean {
    return Boolean(this.accountSid && this.authToken && this.phoneNumber);
  }

  getName(): string {
    return 'Twilio';
  }

  async send(phoneNumber: string, message: string): Promise<void> {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: phoneNumber,
      From: this.phoneNumber,
      Body: message,
    });

    try {
      await axios.post(endpoint, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: this.accountSid,
          password: this.authToken,
        },
        timeout: 10000,
      });

      logger.info(`SMS sent via ${this.getName()} to ${phoneNumber}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { error, provider: this.getName(), phoneNumber },
        `Failed to send SMS: ${errorMsg}`
      );
      throw new Error(`${this.getName()} delivery failed: ${errorMsg}`);
    }
  }
}

/**
 * Console/Mock SMS Provider (for development)
 */
export class MockSmsProvider implements SmsProvider {
  canUse(): boolean {
    return true; // Always available
  }

  getName(): string {
    return 'Mock (Development)';
  }

  async send(phoneNumber: string, message: string): Promise<void> {
    logger.warn(
      { phoneNumber, message },
      'SMS message logged to console (Mock provider - for development only)'
    );
  }
}

/**
 * Multi-Provider SMS Service with Fallback
 */
export class SmsService {
  private providers: SmsProvider[];

  constructor(providers: SmsProvider[]) {
    this.providers = providers;
  }

  async sendOtp(phoneNumber: string, otp: string, expiryMinutes: number = 10): Promise<void> {
    const message = `Your Vinayaka Transport OTP is ${otp}. It expires in ${expiryMinutes} minutes. Do not share this code.`;
    return this.send(phoneNumber, message);
  }

  async send(phoneNumber: string, message: string): Promise<void> {
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      if (!provider.canUse()) {
        logger.debug(
          { provider: provider.getName() },
          `Provider not configured, skipping: ${provider.getName()}`
        );
        continue;
      }

      try {
        logger.info(
          { provider: provider.getName(), phoneNumber },
          `Attempting to send SMS via ${provider.getName()}`
        );
        await provider.send(phoneNumber, message);
        return; // Success!
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          { error: lastError, provider: provider.getName() },
          `Failed with ${provider.getName()}, trying next provider...`
        );
      }
    }

    // All providers failed
    if (lastError) {
      throw new Error(`All SMS providers failed. Last error: ${lastError.message}`);
    } else {
      throw new Error('No SMS providers available. Configure Twilio or another SMS provider.');
    }
  }

  getAvailableProviders(): string {
    return this.providers
      .filter((p) => p.canUse())
      .map((p) => p.getName())
      .join(', ');
  }

  logStatus(): void {
    const available = this.providers
      .filter((p) => p.canUse())
      .map((p) => `✅ ${p.getName()}`)
      .join(', ');

    const unavailable = this.providers
      .filter((p) => !p.canUse())
      .map((p) => `❌ ${p.getName()}`)
      .join(', ');

    logger.info(`SMS Providers Status:`);
    logger.info(`  Available: ${available || 'None'}`);
    logger.info(`  Unavailable: ${unavailable || 'All configured'}`);
  }
}

export default SmsService;
