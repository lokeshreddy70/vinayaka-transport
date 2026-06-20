import prisma from '../config/database';
import { generateOTP, getOTPExpiry } from '../utils/auth';
import { generateAccessToken, generateRefreshToken } from '../config/jwt';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import logger from '../config/logger';

export class AuthService {
  async sendOTP(phoneNumber: string): Promise<{ otp: string; expiresAt: Date }> {
    const otp = generateOTP(6);
    const expiresAt = getOTPExpiry(10); // 10 minutes

    // In production, send via Twilio
    logger.info(`OTP for ${phoneNumber}: ${otp}`);

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (user) {
      // Update existing user's OTP
      await prisma.user.update({
        where: { phoneNumber },
        data: {
          otpToken: otp,
          otpExpiresAt: expiresAt,
        },
      });
    }

    return { otp, expiresAt };
  }

  async verifyOTPAndRegister(
    phoneNumber: string,
    otp: string,
    fullName: string,
    deviceId: string,
    deviceInfo: string
  ): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          phoneNumber,
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
        phoneNumber: newUser.phoneNumber,
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

    // Verify OTP
    if (user.otpToken !== otp || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new ValidationError('Invalid or expired OTP');
    }

    // Create device session
    await prisma.deviceSession.create({
      data: {
        userId: user.id,
        deviceId,
        deviceName: deviceInfo,
        deviceOS: 'unknown',
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

  async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

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
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
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
    await prisma.deviceSession.update({
      where: { deviceId },
      data: { isActive: false },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        jwtToken: null,
        refreshToken: null,
      },
    });
  }

  async refreshToken(userId: string, oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.refreshToken !== oldRefreshToken) {
      throw new ValidationError('Invalid refresh token');
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
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
