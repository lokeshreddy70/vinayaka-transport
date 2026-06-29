import prisma from '../config/database';
import {
  createOtpChallengeToken,
  generateOTP,
  getOTPExpiry,
  normalizePhoneNumber,
  verifyOtpChallengeToken,
} from '../utils/auth';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../config/jwt';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../config/logger';
import { comparePassword, hashPassword } from '../utils/auth';
import { otpChallengeStore } from './otpChallengeStore';
import { smsService } from './smsService';
import config from '../config';

export class AuthService {
  private normalizePhone(value: string): string {
    try {
      return normalizePhoneNumber(value);
    } catch {
      throw new ValidationError('Invalid phone number format');
    }
  }

  async setPassword(userId: string, password: string): Promise<void> {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async loginWithPassword(
    phoneNumber: string,
    password: string,
    deviceId: string,
    deviceInfo: string,
    role?: string
  ): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const normalizedPhoneNumber = this.normalizePhone(phoneNumber);
    const user = await prisma.user.findUnique({ where: { phoneNumber: normalizedPhoneNumber } });

    if (!user || user.isBlocked) {
      throw new ValidationError('Invalid credentials');
    }

    if (role && user.role !== role) {
      throw new ValidationError('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new ValidationError('Password is not set for this account');
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new ValidationError('Invalid credentials');
    }

    await prisma.deviceSession.upsert({
      where: { deviceId },
      create: {
        userId: user.id,
        deviceId,
        deviceName: deviceInfo,
        deviceOS: 'unknown',
      },
      update: {
        userId: user.id,
        deviceName: deviceInfo,
        lastActivityAt: new Date(),
        isActive: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        jwtToken: accessToken,
        refreshToken,
        lastLogin: new Date(),
      },
    });

    return { user, accessToken, refreshToken };
  }

  async registerCustomerWithPassword(
    fullName: string,
    phoneNumber: string,
    password: string,
    deviceId: string,
    deviceInfo: string
  ): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const normalizedPhoneNumber = this.normalizePhone(phoneNumber);
    const existing = await prisma.user.findUnique({ where: { phoneNumber: normalizedPhoneNumber } });

    if (existing) {
      throw new ValidationError('Account already exists. Please login.');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        phoneNumber: normalizedPhoneNumber,
        fullName,
        role: 'CUSTOMER',
        isVerified: true,
        passwordHash,
        jwtToken: '',
        refreshToken: '',
        deviceId,
        deviceInfo,
      },
    });

    await prisma.customer.create({
      data: {
        userId: user.id,
      },
    });

    await prisma.wallet.create({
      data: {
        customerId: user.id,
      },
    });

    await prisma.deviceSession.upsert({
      where: { deviceId },
      create: {
        userId: user.id,
        deviceId,
        deviceName: deviceInfo,
        deviceOS: 'unknown',
      },
      update: {
        userId: user.id,
        deviceName: deviceInfo,
        lastActivityAt: new Date(),
        isActive: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        jwtToken: accessToken,
        refreshToken,
        lastLogin: new Date(),
      },
    });

    return { user, accessToken, refreshToken };
  }

  async getCurrentUser(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: true,
        rider: true,
        admin: true,
        franchiseManager: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isBlocked: user.isBlocked,
      lastLogin: user.lastLogin,
      admin: user.admin,
      customer: user.customer,
      rider: user.rider,
      franchiseManager: user.franchiseManager,
    };
  }

  async sendOTP(phoneNumber: string): Promise<{ otp: string; expiresAt: Date; challengeToken: string }> {
    const normalizedPhoneNumber = this.normalizePhone(phoneNumber);
    const otp = generateOTP(config.otp.length);
    const { expiresAt } = otpChallengeStore.issue(normalizedPhoneNumber, otp);
    const challengeToken = createOtpChallengeToken(normalizedPhoneNumber, otp, config.otp.expiry);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhoneNumber },
    });

    if (user) {
      // Update existing user's OTP
      await prisma.user.update({
        where: { phoneNumber: normalizedPhoneNumber },
        data: {
          otpToken: otp,
          otpExpiresAt: expiresAt,
        },
      });
    }

    await smsService.sendOtp(normalizedPhoneNumber, otp);
    logger.info({ phoneNumber: normalizedPhoneNumber }, 'OTP generated and delivery attempted');

    return { otp, expiresAt, challengeToken };
  }

  async verifyOTPAndRegister(
    phoneNumber: string,
    otp: string,
    fullName: string,
    deviceId: string,
    deviceInfo: string,
    challengeToken?: string
  ): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const normalizedPhoneNumber = this.normalizePhone(phoneNumber);

    await this.verifyOTP(normalizedPhoneNumber, otp, challengeToken);

    // Find user
    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhoneNumber },
    });

    if (!user) {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          phoneNumber: normalizedPhoneNumber,
          fullName,
          role: 'CUSTOMER',
          isVerified: true,
          jwtToken: '',
          refreshToken: '',
          deviceId,
          deviceInfo,
        },
      });

      // Create customer profile
      await prisma.customer.create({
        data: {
          userId: newUser.id,
        },
      });

      // Create wallet
      await prisma.wallet.create({
        data: {
          customerId: newUser.id,
        },
      });

      const accessToken = generateAccessToken({
        userId: newUser.id,
        phoneNumber: normalizedPhoneNumber,
        role: newUser.role,
        deviceId,
      });

      const refreshToken = generateRefreshToken({
        userId: newUser.id,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        deviceId,
      });

      await prisma.user.update({
        where: { id: newUser.id },
        data: {
          jwtToken: accessToken,
          refreshToken,
          lastLogin: new Date(),
        },
      });

      return { user: newUser, accessToken, refreshToken };
    }

    // Create device session
    await prisma.deviceSession.upsert({
      where: { deviceId },
      create: {
        userId: user.id,
        deviceId,
        deviceName: deviceInfo,
        deviceOS: 'unknown',
      },
      update: {
        userId: user.id,
        deviceName: deviceInfo,
        lastActivityAt: new Date(),
        isActive: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        jwtToken: accessToken,
        refreshToken,
        lastLogin: new Date(),
        otpToken: null,
        otpExpiresAt: null,
      },
    });

    return { user, accessToken, refreshToken };
  }

  async verifyOTP(phoneNumber: string, otp: string, challengeToken?: string): Promise<boolean> {
    const normalizedPhoneNumber = this.normalizePhone(phoneNumber);

    // First try challenge token verification (for new users)
    if (challengeToken) {
      const isValidChallenge = verifyOtpChallengeToken(challengeToken, normalizedPhoneNumber, otp);
      if (isValidChallenge) {
        otpChallengeStore.clear(normalizedPhoneNumber);
        return true;
      }
    }

    // Then try in-memory store (for users who just requested OTP)
    try {
      otpChallengeStore.verify(normalizedPhoneNumber, otp);
      return true;
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw error;
      }

      if (error.message !== 'OTP challenge not found. Request a new OTP') {
        throw error;
      }
    }

    // Finally check database (for users logging in)
    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhoneNumber },
    });

    // If user doesn't exist, this is a new user registration
    // Check if the OTP is valid in the in-memory challenge store or challenge token
    if (!user) {
      // At this point, we've already checked challenge token and memory store
      // If we get here, OTP is invalid for a new user
      throw new ValidationError('Invalid or expired OTP');
    }

    // For existing users, check database OTP
    if (user.otpToken !== otp || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new ValidationError('Invalid or expired OTP');
    }

    return true;
  }

  async login(
    phoneNumber: string,
    deviceId: string,
    deviceInfo: string
  ): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const normalizedPhoneNumber = this.normalizePhone(phoneNumber);
    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhoneNumber },
    });

    if (!user || user.isBlocked) {
      throw new NotFoundError('User not found or blocked');
    }

    // Create/update device session
    await prisma.deviceSession.upsert({
      where: { deviceId },
      create: {
        userId: user.id,
        deviceId,
        deviceName: deviceInfo,
        deviceOS: 'unknown',
      },
      update: {
        lastActivityAt: new Date(),
        isActive: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        jwtToken: accessToken,
        refreshToken,
        lastLogin: new Date(),
      },
    });

    return { user, accessToken, refreshToken };
  }

  async logout(userId: string, deviceId: string): Promise<void> {
    if (deviceId) {
      await prisma.deviceSession.updateMany({
        where: { userId, deviceId },
        data: { isActive: false },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        jwtToken: null,
        refreshToken: null,
      },
    });
  }

  async refreshToken(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded: { userId: string; phoneNumber: string; role: string; deviceId?: string };

    try {
      decoded = verifyRefreshToken(oldRefreshToken);
    } catch (error) {
      throw new ValidationError('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.refreshToken !== oldRefreshToken) {
      throw new ValidationError('Invalid refresh token');
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId: decoded.deviceId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      deviceId: decoded.deviceId,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        jwtToken: accessToken,
        refreshToken,
      },
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
