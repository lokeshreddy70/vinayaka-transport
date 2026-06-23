import config from '../config';
import { ValidationError } from '../utils/errors';

interface OtpChallengeRecord {
  otp: string;
  expiresAt: number;
  resendCount: number;
  verifyAttempts: number;
  windowStartedAt: number;
}

class OtpChallengeStore {
  private readonly store = new Map<string, OtpChallengeRecord>();

  issue(phoneNumber: string, otp: string): { expiresAt: Date } {
    const now = Date.now();
    const windowMs = config.otp.resendWindowMinutes * 60 * 1000;
    const existing = this.store.get(phoneNumber);

    let resendCount = 1;
    let windowStartedAt = now;

    if (existing && existing.windowStartedAt + windowMs > now) {
      resendCount = existing.resendCount + 1;
      windowStartedAt = existing.windowStartedAt;
    }

    if (resendCount > config.otp.maxResendPerWindow) {
      throw new ValidationError(
        `OTP resend limit exceeded. Try again after ${config.otp.resendWindowMinutes} minutes`
      );
    }

    const expiresAt = now + config.otp.expiry * 60 * 1000;
    this.store.set(phoneNumber, {
      otp,
      expiresAt,
      resendCount,
      verifyAttempts: 0,
      windowStartedAt,
    });

    return { expiresAt: new Date(expiresAt) };
  }

  verify(phoneNumber: string, otp: string): boolean {
    const record = this.store.get(phoneNumber);

    if (!record) {
      throw new ValidationError('OTP challenge not found. Request a new OTP');
    }

    if (Date.now() > record.expiresAt) {
      this.store.delete(phoneNumber);
      throw new ValidationError('OTP has expired. Please request a new OTP');
    }

    if (record.verifyAttempts >= config.otp.maxVerifyAttempts) {
      this.store.delete(phoneNumber);
      throw new ValidationError('Maximum OTP verification attempts reached. Request a new OTP');
    }

    if (record.otp !== otp) {
      record.verifyAttempts += 1;
      this.store.set(phoneNumber, record);
      const attemptsLeft = config.otp.maxVerifyAttempts - record.verifyAttempts;
      throw new ValidationError(`Invalid OTP. ${Math.max(attemptsLeft, 0)} attempts remaining`);
    }

    this.store.delete(phoneNumber);
    return true;
  }

  clear(phoneNumber: string): void {
    this.store.delete(phoneNumber);
  }
}

export const otpChallengeStore = new OtpChallengeStore();
