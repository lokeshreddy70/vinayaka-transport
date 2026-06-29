import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import prisma from '../config/database';
import logger from '../config/logger';
import { isDatabaseUnavailable } from '../utils/dbFallback';
import { demoStore } from '../services/demoStore';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    phoneNumber: string;
    role: string;
    deviceId?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = verifyAccessToken(token);
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.isBlocked) {
        throw new AuthenticationError('User not found or blocked');
      }
    } catch (error) {
      if (!isDatabaseUnavailable(error)) {
        throw error;
      }

      const demoUser = demoStore.getUserById(decoded.userId);
      if (!demoUser) {
        throw new AuthenticationError('User not found or blocked');
      }
    }

    req.user = {
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role,
      deviceId: decoded.deviceId,
    };

    next();
  } catch (error) {
    logger.error(error);
    throw new AuthenticationError();
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError();
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    next();
  };
};
