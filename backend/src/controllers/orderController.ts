import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { orderService } from '../services/orderService';
import { sendSuccess, sendError } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';

export class OrderController {
  async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      const { pickupAddressId, dropAddressId, pickupLat, pickupLng, dropLat, dropLng, parcelCategory, parcelWeight, parcelValue, vehicleType, deliveryType, isFragile, specialInstructions } = req.body;

      if (!pickupLat || !pickupLng || !dropLat || !dropLng || !parcelCategory || !parcelWeight || !vehicleType || !deliveryType) {
        throw new ValidationError('Missing required fields');
      }

      const order = await orderService.createOrder({
        customerId: customer.id,
        pickupLat,
        pickupLng,
        pickupAddressId,
        dropLat,
        dropLng,
        dropAddressId,
        parcelCategory,
        parcelWeight,
        parcelValue,
        vehicleType,
        deliveryType,
        isFragile,
        specialInstructions,
      });

      sendSuccess(res, 201, 'Order created successfully', order);
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      const order = await orderService.getOrder(orderId);
      sendSuccess(res, 200, 'Order retrieved', order);
    } catch (error) {
      next(error);
    }
  }

  async trackOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      const tracking = await orderService.trackOrder(orderId);
      sendSuccess(res, 200, 'Tracking data retrieved', tracking);
    } catch (error) {
      next(error);
    }
  }

  async cancelOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      sendSuccess(res, 200, 'Order cancelled successfully', updated);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
