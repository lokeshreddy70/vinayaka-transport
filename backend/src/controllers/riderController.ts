import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { riderService } from '../services/riderService';
import { sendSuccess } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';
import { emitRiderLocation, emitOrderUpdate } from '../realtime/socket';
import { orderService } from '../services/orderService';

export class RiderController {
  async listRiders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = String(req.query.q || '').trim();
      const page = Number(req.query.page || 1);
      const limit = Math.min(Number(req.query.limit || 20), 100);

      const where = query
        ? {
            OR: [
              { id: { contains: query, mode: 'insensitive' as const } },
              {
                user: {
                  fullName: { contains: query, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  phoneNumber: { contains: query, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        prisma.rider.findMany({
          where,
          include: {
            user: true,
            vehicle: true,
            wallet: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.rider.count({ where }),
      ]);

      sendSuccess(res, 200, 'Riders retrieved', { items, total, page, limit });
    } catch (error) {
      next(error);
    }
  }

  async getRiderDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { riderId } = req.params;

      const rider = await prisma.rider.findUnique({
        where: { id: riderId },
        include: {
          user: true,
          vehicle: true,
          wallet: { include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } } },
          assignedOrders: {
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
        },
      });

      if (!rider) {
        throw new NotFoundError('Rider not found');
      }

      sendSuccess(res, 200, 'Rider details retrieved', rider);
    } catch (error) {
      next(error);
    }
  }

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

      const { latitude, longitude, orderId, status, accuracy } = req.body;

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

      emitRiderLocation(rider.id, {
        riderId: rider.id,
        latitude,
        longitude,
        updatedAt: new Date().toISOString(),
      });

      if (orderId) {
        const tracking = await orderService.addTrackingLog(orderId, {
          latitude,
          longitude,
          status: status || 'ON_WAY',
          accuracy: accuracy || null,
        });

        emitOrderUpdate(orderId, {
          type: 'tracking',
          orderId,
          tracking,
        });
      }

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
      emitRiderLocation(rider.id, {
        riderId: rider.id,
        isOnline: true,
        updatedAt: new Date().toISOString(),
      });
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
      emitRiderLocation(rider.id, {
        riderId: rider.id,
        isOnline: false,
        updatedAt: new Date().toISOString(),
      });
      sendSuccess(res, 200, 'Rider is offline', updated);
    } catch (error) {
      next(error);
    }
  }
}

export const riderController = new RiderController();
