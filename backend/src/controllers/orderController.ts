import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { orderService } from '../services/orderService';
import { sendSuccess, sendError } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { emitOrderUpdate } from '../realtime/socket';
import { isDatabaseUnavailable } from '../utils/dbFallback';
import { demoStore } from '../services/demoStore';

export class OrderController {
  async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      let customerId: string;
      try {
        const customer = await prisma.customer.findUnique({
          where: { userId: req.user.userId },
        });

        if (!customer) {
          throw new NotFoundError('Customer not found');
        }
        customerId = customer.id;
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        const demoCustomerId = demoStore.getCustomerIdByUserId(req.user.userId);
        if (!demoCustomerId) {
          throw new NotFoundError('Customer not found');
        }
        customerId = demoCustomerId;
      }

      const { pickupAddressId, dropAddressId, pickupLat, pickupLng, dropLat, dropLng, parcelCategory, parcelWeight, parcelValue, vehicleType, deliveryType, paymentMethod, isFragile, specialInstructions } = req.body;

      if (!pickupLat || !pickupLng || !dropLat || !dropLng || !parcelCategory || !parcelWeight || !vehicleType || !deliveryType) {
        throw new ValidationError('Missing required fields');
      }

      if (!pickupAddressId || !dropAddressId) {
        throw new ValidationError('Pickup and drop addresses are required');
      }

      let order;
      try {
        const [pickupAddress, dropAddress] = await Promise.all([
          prisma.address.findFirst({ where: { id: pickupAddressId, customerId } }),
          prisma.address.findFirst({ where: { id: dropAddressId, customerId } }),
        ]);

        if (!pickupAddress || !dropAddress) {
          throw new ValidationError('Address not found for this customer');
        }

        order = await orderService.createOrder({
          customerId,
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
          paymentMethod,
          isFragile,
          specialInstructions,
        });
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        order = demoStore.createOrder(customerId, {
          pickupAddressId,
          dropAddressId,
          pickupLat: Number(pickupLat),
          pickupLng: Number(pickupLng),
          dropLat: Number(dropLat),
          dropLng: Number(dropLng),
          parcelCategory,
          parcelWeight: Number(parcelWeight),
          vehicleType,
          deliveryType,
        });
      }

      sendSuccess(res, 201, 'Order created successfully', order);
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orderId } = req.params;

      try {
        const order = await orderService.getOrder(orderId);
        await this.assertOrderAccess(orderId, req.user.userId, req.user.role);
        sendSuccess(res, 200, 'Order retrieved', order);
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        const order = demoStore.getOrderById(orderId);
        if (!order) {
          throw new NotFoundError('Order not found');
        }
        sendSuccess(res, 200, 'Order retrieved', order);
      }
    } catch (error) {
      next(error);
    }
  }

  async trackOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orderId } = req.params;

      await this.assertOrderAccess(orderId, req.user.userId, req.user.role);

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

      await this.assertOrderAccess(orderId, req.user.userId, req.user.role);

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      await orderService.addTrackingLog(orderId, {
        latitude: order.dropLat,
        longitude: order.dropLng,
        status: 'CANCELLED',
        accuracy: null,
      });

      emitOrderUpdate(orderId, {
        type: 'status',
        orderId,
        status: 'CANCELLED',
        updatedAt: new Date().toISOString(),
      });

      sendSuccess(res, 200, 'Order cancelled successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  async listOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const page = Number(req.query.page || 1);
      const limit = Math.min(Number(req.query.limit || 20), 100);
      const status = (req.query.status as string) || undefined;
      const paymentMethod = (req.query.paymentMethod as string) || undefined;

      let customerId: string | undefined;
      let riderId: string | undefined;

      if (req.user.role === 'CUSTOMER') {
        const customer = await prisma.customer.findUnique({ where: { userId: req.user.userId } });
        customerId = customer?.id;
      }

      if (req.user.role === 'RIDER') {
        const rider = await prisma.rider.findUnique({ where: { userId: req.user.userId } });
        riderId = rider?.id;
      }

      const result = await orderService.listOrders({
        page,
        limit,
        status,
        paymentMethod,
        customerId,
        riderId,
      });

      sendSuccess(res, 200, 'Orders retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  async assignRider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const { orderId } = req.params;
      const { riderId } = req.body;

      if (!riderId) {
        throw new ValidationError('riderId is required');
      }

      const updated = await orderService.assignRider(orderId, riderId);

      emitOrderUpdate(orderId, {
        type: 'assignment',
        orderId,
        riderId,
        status: updated.status,
        updatedAt: new Date().toISOString(),
      });

      sendSuccess(res, 200, 'Rider assigned successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const { orderId } = req.params;
      const { status, latitude, longitude, accuracy } = req.body;

      if (!status) {
        throw new ValidationError('status is required');
      }

      await this.assertOrderAccess(orderId, req.user.userId, req.user.role);

      const updated = await orderService.updateOrderStatus(orderId, status);

      if (latitude !== undefined && longitude !== undefined) {
        await orderService.addTrackingLog(orderId, {
          latitude,
          longitude,
          status,
          accuracy: accuracy || null,
        });
      }

      emitOrderUpdate(orderId, {
        type: 'status',
        orderId,
        status,
        location:
          latitude !== undefined && longitude !== undefined
            ? { latitude, longitude, accuracy: accuracy || null }
            : null,
        updatedAt: new Date().toISOString(),
      });

      sendSuccess(res, 200, 'Order status updated', updated);
    } catch (error) {
      next(error);
    }
  }

  async publicTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderNumber } = req.params;
      try {
        const result = await orderService.getPublicTracking(orderNumber);
        sendSuccess(res, 200, 'Public tracking data retrieved', result);
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        const order = demoStore.getOrderByNumber(orderNumber);
        if (!order) {
          throw new NotFoundError('Order not found');
        }
        sendSuccess(res, 200, 'Public tracking data retrieved', {
          orderNumber: order.orderNumber,
          status: order.status,
          estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
          timeline: order.trackingLogs,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async getOrderQR(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orderId } = req.params;

      const order = await orderService.getOrder(orderId);
      await this.assertOrderAccess(orderId, req.user.userId, req.user.role);

      const qrPayload = JSON.stringify({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      });

      const dataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 320 });
      sendSuccess(res, 200, 'QR code generated', { dataUrl, payload: qrPayload });
    } catch (error) {
      next(error);
    }
  }

  async getOrderBarcode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orderId } = req.params;

      const order = await orderService.getOrder(orderId);
      await this.assertOrderAccess(orderId, req.user.userId, req.user.role);

      const png = await bwipjs.toBuffer({
        bcid: 'code128',
        text: order.orderNumber,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });

      sendSuccess(res, 200, 'Barcode generated', {
        contentType: 'image/png',
        data: png.toString('base64'),
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orderId } = req.params;

      try {
        await this.assertOrderAccess(orderId, req.user.userId, req.user.role);
        const receipt = await orderService.getReceiptData(orderId);
        sendSuccess(res, 200, 'Receipt data generated', receipt);
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        const order = demoStore.getOrderById(orderId);
        if (!order) {
          throw new NotFoundError('Order not found');
        }
        sendSuccess(res, 200, 'Receipt data generated', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.finalPrice,
          createdAt: order.createdAt,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  private async assertOrderAccess(orderId: string, userId: string, role: string): Promise<void> {
    if (role === 'ADMIN' || role === 'FRANCHISE_MANAGER') {
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        rider: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({ where: { userId } });
      if (!customer || order.customerId !== customer.id) {
        throw new ValidationError('Order access denied');
      }
      return;
    }

    if (role === 'RIDER') {
      const rider = await prisma.rider.findUnique({ where: { userId } });
      if (!rider || order.riderId !== rider.id) {
        throw new ValidationError('Order access denied');
      }
      return;
    }

    throw new ValidationError('Order access denied');
  }
}

export const orderController = new OrderController();
