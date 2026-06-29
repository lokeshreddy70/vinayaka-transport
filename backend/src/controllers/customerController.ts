import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { isDatabaseUnavailable } from '../utils/dbFallback';
import { demoStore } from '../services/demoStore';

export class CustomerController {
  async searchCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = String(req.query.q || '').trim();
      const page = Number(req.query.page || 1);
      const limit = Math.min(Number(req.query.limit || 20), 100);

      const where = query
        ? {
            OR: [
              { id: { contains: query, mode: 'insensitive' as const } },
              { userId: { contains: query, mode: 'insensitive' as const } },
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
        prisma.customer.findMany({
          where,
          include: {
            user: true,
            wallet: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.customer.count({ where }),
      ]);

      sendSuccess(res, 200, 'Customers retrieved', { items, total, page, limit });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerId } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          user: true,
          addresses: true,
          emergencyContacts: true,
          wallet: { include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } } },
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
        },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      sendSuccess(res, 200, 'Customer details retrieved', customer);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      try {
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
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        const demoUser = demoStore.getUserById(req.user.userId);
        if (!demoUser) {
          throw new NotFoundError('Customer not found');
        }

        sendSuccess(res, 200, 'Customer profile retrieved', {
          id: demoStore.getCustomerIdByUserId(req.user.userId),
          userId: req.user.userId,
          addresses: demoStore.getAddresses(demoStore.getCustomerIdByUserId(req.user.userId) || ''),
          wallet: demoStore.getWallet(),
          emergencyContacts: [],
          user: {
            id: demoUser.id,
            phoneNumber: demoUser.phoneNumber,
            fullName: demoUser.fullName,
            role: demoUser.role,
          },
        });
      }
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

      let address;
      try {
        const customer = await prisma.customer.findUnique({ where: { userId: req.user.userId } });

        if (!customer) {
          throw new NotFoundError('Customer not found');
        }

        address = await prisma.address.create({
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
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        const customerId = demoStore.getCustomerIdByUserId(req.user.userId);
        if (!customerId) {
          throw new NotFoundError('Customer not found');
        }

        address = demoStore.addAddress(customerId, {
          type: type || 'OTHER',
          fullAddress,
          landmark,
          latitude: Number(latitude),
          longitude: Number(longitude),
          city: city || 'Unknown',
          state: state || 'Unknown',
          pinCode: pinCode || '',
          isDefault: Boolean(isDefault),
        });
      }

      sendSuccess(res, 201, 'Address added successfully', address);
    } catch (error) {
      next(error);
    }
  }

  async getSavedAddresses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      let addresses;
      try {
        const customer = await prisma.customer.findUnique({ where: { userId: req.user.userId } });

        if (!customer) {
          throw new NotFoundError('Customer not found');
        }

        addresses = await prisma.address.findMany({ where: { customerId: customer.id } });
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        const customerId = demoStore.getCustomerIdByUserId(req.user.userId);
        if (!customerId) {
          throw new NotFoundError('Customer not found');
        }
        addresses = demoStore.getAddresses(customerId);
      }

      sendSuccess(res, 200, 'Addresses retrieved', addresses);
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      let orders;
      try {
        const customer = await prisma.customer.findUnique({ where: { userId: req.user.userId } });

        if (!customer) {
          throw new NotFoundError('Customer not found');
        }

        orders = await prisma.order.findMany({
          where: { customerId: customer.id },
          include: {
            delivery: true,
            trackingLogs: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        const customerId = demoStore.getCustomerIdByUserId(req.user.userId);
        if (!customerId) {
          throw new NotFoundError('Customer not found');
        }
        orders = demoStore.getOrders(customerId);
      }

      sendSuccess(res, 200, 'Orders retrieved', orders);
    } catch (error) {
      next(error);
    }
  }

  async getWallet(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');

      try {
        const customer = await prisma.customer.findUnique({
          where: { userId: req.user.userId },
          include: { wallet: { include: { transactions: { take: 20 } } } },
        });

        if (!customer) {
          throw new NotFoundError('Customer not found');
        }

        sendSuccess(res, 200, 'Wallet retrieved', customer.wallet);
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }

        sendSuccess(res, 200, 'Wallet retrieved', demoStore.getWallet());
      }
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
