import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { riderService } from '../services/riderService';
import { sendSuccess } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';

export class RiderController {
  async registerRider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const { aadhaarNumber, aadhaarPhoto, licenseNumber, licensePhoto, rcNumber, rcPhoto, selfiePhoto } = req.body;

      if (!aadhaarNumber || !licenseNumber || !rcNumber) {
        throw new ValidationError('Missing required fields');
      }

      const rider = await riderService.createRiderProfile(req.user.userId, {
        aadhaarNumber,
        aadhaarPhoto,
        licenseNumber,
        licensePhoto,
        rcNumber,
        rcPhoto,
        selfiePhoto,
      });

      sendSuccess(res, 201, 'Rider profile created', rider);
    } catch (error) {
      next(error);
    }
  }

  async getRiderProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const rider = await prisma.rider.findUnique({
        where: { userId: req.user.userId },
        include: {
          vehicle: true,
          wallet: true,
        },
      });

      if (!rider) {
        throw new NotFoundError('Rider not found');
      }

      sendSuccess(res, 200, 'Rider profile retrieved', rider);
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const { latitude, longitude } = req.body;

      if (latitude === undefined || longitude === undefined) {
        throw new ValidationError('Coordinates required');
      }

      const rider = await prisma.rider.findUnique({
        where: { userId: req.user.userId },
      });

      if (!rider) {
        throw new NotFoundError('Rider not found');
      }

      const updated = await riderService.updateRiderLocation(rider.id, latitude, longitude);
      sendSuccess(res, 200, 'Location updated', updated);
    } catch (error) {
      next(error);
    }
  }

  async goOnline(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const rider = await prisma.rider.findUnique({
        where: { userId: req.user.userId },
      });

      if (!rider) {
        throw new NotFoundError('Rider not found');
      }

      const updated = await riderService.setRiderOnline(rider.id);
      sendSuccess(res, 200, 'Rider is online', updated);
    } catch (error) {
      next(error);
    }
  }

  async goOffline(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const rider = await prisma.rider.findUnique({
        where: { userId: req.user.userId },
      });

      if (!rider) {
        throw new NotFoundError('Rider not found');
      }

      const updated = await riderService.setRiderOffline(rider.id);
      sendSuccess(res, 200, 'Rider is offline', updated);
    } catch (error) {
      next(error);
    }
  }
}

export const riderController = new RiderController();
