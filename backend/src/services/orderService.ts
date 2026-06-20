import prisma from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../config/logger';

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
  isFragile?: boolean;
  specialInstructions?: string;
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
        paymentMethod: 'UPI',
        paymentStatus: 'PENDING',
      },
    });

    return order;
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

    return updated;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
      },
    });

    return order;
  }

  async trackOrder(orderId: string): Promise<any> {
    const trackingLogs = await prisma.trackingLog.findMany({
      where: { orderId },
      orderBy: { timestamp: 'asc' },
    });

    return trackingLogs;
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
