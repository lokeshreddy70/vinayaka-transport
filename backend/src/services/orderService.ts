import prisma from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface CreateOrderInput {
  customerId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddressId: string;
  dropLat: number;
  dropLng: number;
  dropAddressId: string;
  parcelCategory: string;
  parcelWeight: number;
  parcelValue: number;
  vehicleType: string;
  deliveryType: string;
  paymentMethod?: string;
  isFragile?: boolean;
  specialInstructions?: string;
}

export interface ListOrdersInput {
  status?: string;
  paymentMethod?: string;
  customerId?: string;
  riderId?: string;
  page: number;
  limit: number;
}

export class OrderService {
  async createOrder(input: CreateOrderInput): Promise<any> {
    // Calculate distance (simplified)
    const distance = this.calculateDistance(
      input.pickupLat,
      input.pickupLng,
      input.dropLat,
      input.dropLng
    );

    // Get pricing rules
    const pricingRule = await prisma.pricingRule.findFirst({
      where: {
        vehicleType: input.vehicleType as any,
        effectiveFrom: { lte: new Date() },
        effectiveTo: { gte: new Date() },
      },
    });

    if (!pricingRule) {
      throw new ValidationError('Pricing rules not found for this vehicle');
    }

    // Calculate fare
    const baseFare = pricingRule.baseFare;
    const distanceFare = distance * pricingRule.pricePerKm;
    const weightFare = input.parcelWeight * pricingRule.weightChargePerKg;
    const peakHourCharge = this.getPeakHourCharge(pricingRule);
    const nightCharge = this.getNightCharge(pricingRule);
    const urgencyCharge = input.deliveryType === 'EMERGENCY' ? pricingRule.baseFare * 0.5 : 0;

    const totalPrice = baseFare + distanceFare + weightFare + peakHourCharge + nightCharge + urgencyCharge;

    const order = await prisma.order.create({
      data: {
        customerId: input.customerId,
        pickupAddressId: input.pickupAddressId,
        dropAddressId: input.dropAddressId,
        pickupLat: input.pickupLat,
        pickupLng: input.pickupLng,
        dropLat: input.dropLat,
        dropLng: input.dropLng,
        estimatedDistance: distance,
        parcelCategory: input.parcelCategory as any,
        parcelWeight: input.parcelWeight,
        parcelValue: input.parcelValue,
        vehicleType: input.vehicleType as any,
        deliveryType: input.deliveryType as any,
        isFragile: input.isFragile || false,
        specialInstructions: input.specialInstructions,
        status: 'PENDING',
        baseFare,
        distanceFare,
        weightFare,
        peakHourCharge,
        nightCharge,
        rainCharge: 0,
        urgencyCharge,
        insuranceCharge: 0,
        totalPrice,
        finalPrice: totalPrice,
        paymentMethod: (input.paymentMethod as any) || 'UPI',
        paymentStatus: 'PENDING',
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: totalPrice,
        paymentMethod: ((input.paymentMethod as any) || 'UPI') as any,
        status: 'PENDING',
      },
    });

    return order;
  }

  async listOrders(input: ListOrdersInput): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const where: any = {};

    if (input.status) where.status = input.status as any;
    if (input.paymentMethod) where.paymentMethod = input.paymentMethod as any;
    if (input.customerId) where.customerId = input.customerId;
    if (input.riderId) where.riderId = input.riderId;

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          rider: {
            include: {
              user: true,
            },
          },
          customer: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      page: input.page,
      limit: input.limit,
    };
  }

  async getOrder(orderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        delivery: true,
        trackingLogs: true,
        photos: true,
        rider: {
          include: { vehicle: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  async assignRider(orderId: string, riderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider || !rider.isApproved || rider.isSuspended) {
      throw new ValidationError('Rider not available');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        riderId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
    });

    await this.addTrackingLog(orderId, {
      latitude: order.pickupLat,
      longitude: order.pickupLng,
      status: 'ASSIGNED',
      accuracy: null,
    });

    return updated;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        pickedUpAt: status === 'PICKED_UP' ? new Date() : undefined,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
      },
    });

    await this.addTrackingLog(orderId, {
      latitude: order.dropLat,
      longitude: order.dropLng,
      status,
      accuracy: null,
    });

    return updated;
  }

  async trackOrder(orderId: string): Promise<any> {
    const trackingLogs = await prisma.trackingLog.findMany({
      where: { orderId },
      orderBy: { timestamp: 'asc' },
    });

    return trackingLogs;
  }

  async getPublicTracking(orderNumber: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        trackingLogs: {
          orderBy: { timestamp: 'asc' },
        },
        rider: {
          include: { user: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      rider: order.rider
        ? {
            name: order.rider.user.fullName,
            phoneNumber: order.rider.user.phoneNumber,
            latitude: order.rider.latitude,
            longitude: order.rider.longitude,
          }
        : null,
      timeline: order.trackingLogs,
    };
  }

  async addTrackingLog(
    orderId: string,
    payload: { latitude: number; longitude: number; status: string; accuracy: number | null }
  ): Promise<any> {
    return prisma.trackingLog.create({
      data: {
        orderId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        status: payload.status as any,
        accuracy: payload.accuracy || undefined,
      },
    });
  }

  async getReceiptData(orderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: { user: true },
        },
        rider: {
          include: { user: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.user.fullName,
      customerPhone: order.customer.user.phoneNumber,
      riderName: order.rider?.user.fullName || null,
      riderPhone: order.rider?.user.phoneNumber || null,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      totalPrice: order.totalPrice,
      finalPrice: order.finalPrice,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      payments: order.payments,
    };
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private getPeakHourCharge(rule: any): number {
    const hour = new Date().getHours();
    if (hour >= 8 && hour <= 10) return rule.baseFare * 0.5; // Morning peak
    if (hour >= 18 && hour <= 20) return rule.baseFare * 0.5; // Evening peak
    return 0;
  }

  private getNightCharge(rule: any): number {
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) return rule.baseFare * 0.3;
    return 0;
  }
}

export const orderService = new OrderService();
