import prisma from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errors';

export class RiderService {
  async createRiderProfile(userId: string, input: any): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const rider = await prisma.rider.create({
      data: {
        userId,
        aadhaarNumber: input.aadhaarNumber,
        aadhaarPhoto: input.aadhaarPhoto,
        licenseNumber: input.licenseNumber,
        licensePhoto: input.licensePhoto,
        rcNumber: input.rcNumber,
        rcPhoto: input.rcPhoto,
        selfiePhoto: input.selfiePhoto,
        verificationStatus: 'PENDING',
      },
    });

    // Create wallet
    await prisma.wallet.create({
      data: {
        riderId: rider.id,
      },
    });

    // Update user role
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'RIDER' },
    });

    return rider;
  }

  async getRider(riderId: string): Promise<any> {
    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        vehicle: true,
        wallet: true,
        user: true,
      },
    });

    if (!rider) {
      throw new NotFoundError('Rider not found');
    }

    return rider;
  }

  async updateRiderLocation(riderId: string, latitude: number, longitude: number): Promise<any> {
    const rider = await prisma.rider.update({
      where: { id: riderId },
      data: {
        latitude,
        longitude,
        lastLocationUpdate: new Date(),
      },
    });

    return rider;
  }

  async setRiderOnline(riderId: string): Promise<any> {
    return await prisma.rider.update({
      where: { id: riderId },
      data: { isOnline: true },
    });
  }

  async setRiderOffline(riderId: string): Promise<any> {
    return await prisma.rider.update({
      where: { id: riderId },
      data: { isOnline: false },
    });
  }

  async getAvailableRiders(latitude: number, longitude: number, radiusKm: number = 5): Promise<any[]> {
    const riders = await prisma.rider.findMany({
      where: {
        isOnline: true,
        isApproved: true,
        isSuspended: false,
      },
      include: {
        vehicle: true,
      },
    });

    // Filter by distance (simplified)
    return riders.filter((rider: any) => {
      if (!rider.latitude || !rider.longitude) return false;
      const distance = this.calculateDistance(latitude, longitude, rider.latitude, rider.longitude);
      return distance <= radiusKm;
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
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
}

export const riderService = new RiderService();
