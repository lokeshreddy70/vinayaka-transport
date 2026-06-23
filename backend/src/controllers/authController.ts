import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { authService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';
import { ValidationError } from '../utils/errors';
import logger from '../config/logger';

export class AuthController {
  async setPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { password } = req.body;
      if (!password) {
        throw new ValidationError('Password is required');
      }

      await authService.setPassword(req.user.userId, password);
      sendSuccess(res, 200, 'Password updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async loginWithPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumber, password, deviceId, deviceInfo, role } = req.body;

      if (!phoneNumber || !password || !deviceId) {
        throw new ValidationError('Missing required fields');
      }

      const result = await authService.loginWithPassword(
        phoneNumber,
        password,
        deviceId,
        deviceInfo || 'unknown',
        role
      );

      sendSuccess(res, 200, 'Login successful', {
        user: {
          id: result.user.id,
          phoneNumber: result.user.phoneNumber,
          fullName: result.user.fullName,
          role: result.user.role,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        throw new ValidationError('Phone number is required');
      }

      const result = await authService.sendOTP(phoneNumber);
      sendSuccess(res, 200, 'OTP sent successfully', {
        expiresIn: `${Math.max(1, Number(process.env.OTP_EXPIRY || 10))} minutes`,
        challengeToken: result.challengeToken,
        ...(process.env.NODE_ENV !== 'production' ? { otp: result.otp } : {}),
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOTPAndRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumber, otp, fullName, deviceId, deviceInfo, challengeToken } = req.body;

      if (!phoneNumber || !otp || !fullName || !deviceId) {
        throw new ValidationError('Missing required fields');
      }

      const result = await authService.verifyOTPAndRegister(
        phoneNumber,
        otp,
        fullName,
        deviceId,
        deviceInfo || 'unknown',
        challengeToken
      );

      sendSuccess(res, 201, 'User registered successfully', {
        user: {
          id: result.user.id,
          phoneNumber: result.user.phoneNumber,
          fullName: result.user.fullName,
          role: result.user.role,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumber, otp, deviceId, deviceInfo, challengeToken } = req.body;

      if (!phoneNumber || !otp || !deviceId) {
        throw new ValidationError('Missing required fields');
      }

      // Verify OTP
      await authService.verifyOTP(phoneNumber, otp, challengeToken);

      // Login
      const result = await authService.login(phoneNumber, deviceId, deviceInfo || 'unknown');

      sendSuccess(res, 200, 'Login successful', {
        user: {
          id: result.user.id,
          phoneNumber: result.user.phoneNumber,
          fullName: result.user.fullName,
          role: result.user.role,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      await authService.logout(req.user.userId, req.user.deviceId || '');
      sendSuccess(res, 200, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Missing required fields');
      }

      const result = await authService.refreshToken(refreshToken);
      sendSuccess(res, 200, 'Token refreshed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const user = await authService.getCurrentUser(req.user.userId);

      sendSuccess(res, 200, 'Current user retrieved', user);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
