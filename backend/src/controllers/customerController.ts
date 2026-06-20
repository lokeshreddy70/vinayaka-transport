import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';

export class CustomerController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId },
        include: {
          addresses: true,
          wallet: true,
          emergencyContacts: true,
        },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      sendSuccess(res, 200, 'Customer profile retrieved', customer);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const { fullName, email, profilePhoto } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          fullName: fullName || undefined,
          email: email || undefined,
          profilePhoto: profilePhoto || undefined,
        },
      });

      sendSuccess(res, 200, 'Profile updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async addAddress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const { type, fullAddress, landmark, latitude, longitude, city, state, pinCode, isDefault } = req.body;

      if (!fullAddress || latitude === undefined || longitude === undefined) {
        throw new ValidationError('Missing required fields');
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      const address = await prisma.address.create({
        data: {
          customerId: customer.id,
          type: type || 'OTHER',
          fullAddress,
          landmark,
          latitude,
          longitude,
          city,
          state,
          pinCode,
          isDefault,
        },
      });

      sendSuccess(res, 201, 'Address added successfully', address);
    } catch (error) {
      next(error);
    }
  }

  async getSavedAddresses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      const addresses = await prisma.address.findMany({
        where: { customerId: customer.id },
      });

      sendSuccess(res, 200, 'Addresses retrieved', addresses);
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      const orders = await prisma.order.findMany({
        where: { customerId: customer.id },
        include: {
          delivery: true,
          trackingLogs: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      sendSuccess(res, 200, 'Orders retrieved', orders);
    } catch (error) {
      next(error);
    }
  }

  async getWallet(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId },
        include: { wallet: { include: { transactions: { take: 20 } } } },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      sendSuccess(res, 200, 'Wallet retrieved', customer.wallet);
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
