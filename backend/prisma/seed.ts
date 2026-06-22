import {
  DeliveryType,
  OrderStatus,
  ParcelCategory,
  PaymentMethod,
  PrismaClient,
  UserRole,
  VehicleType,
} from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

const prisma = new PrismaClient();

async function seedAdmin() {
  const phoneNumber = process.env.SEED_ADMIN_PHONE || '+919999999999';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {
      fullName: 'Operations Admin',
      role: UserRole.ADMIN,
      isVerified: true,
      isBlocked: false,
      passwordHash,
      isBusinessAccount: true,
    },
    create: {
      phoneNumber,
      fullName: 'Operations Admin',
      role: UserRole.ADMIN,
      isVerified: true,
      isBlocked: false,
      passwordHash,
      isBusinessAccount: true,
    },
  });

  await prisma.admin.upsert({
    where: { userId: user.id },
    update: {
      permissions: ['dashboard.read', 'orders.read', 'orders.write', 'users.read'],
    },
    create: {
      userId: user.id,
      permissions: ['dashboard.read', 'orders.read', 'orders.write', 'users.read'],
    },
  });

  return user;
}

async function seedCustomer() {
  const phoneNumber = process.env.SEED_CUSTOMER_PHONE || '+919999999998';
  const password = process.env.SEED_CUSTOMER_PASSWORD || 'Customer@123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {
      fullName: 'Smoke Customer',
      role: UserRole.CUSTOMER,
      isVerified: true,
      isBlocked: false,
      passwordHash,
    },
    create: {
      phoneNumber,
      fullName: 'Smoke Customer',
      role: UserRole.CUSTOMER,
      isVerified: true,
      isBlocked: false,
      passwordHash,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: user.id },
    update: {
      totalOrders: 1,
      totalSpent: 240,
      averageRating: 5,
      loyaltyPoints: 25,
    },
    create: {
      userId: user.id,
      totalOrders: 1,
      totalSpent: 240,
      averageRating: 5,
      loyaltyPoints: 25,
    },
  });

  const pickupAddress = await prisma.address.upsert({
    where: { id: `${customer.id}-pickup` },
    update: {},
    create: {
      id: `${customer.id}-pickup`,
      customerId: customer.id,
      type: 'HOME',
      fullAddress: '12 Seed Street, Operations Hub, Hyderabad',
      landmark: 'Near Main Gate',
      latitude: 17.385,
      longitude: 78.4867,
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500001',
      isDefault: true,
    },
  });

  const dropAddress = await prisma.address.upsert({
    where: { id: `${customer.id}-drop` },
    update: {},
    create: {
      id: `${customer.id}-drop`,
      customerId: customer.id,
      type: 'OTHER',
      fullAddress: '88 Delivery Park, Customer Zone, Hyderabad',
      landmark: 'Near Service Road',
      latitude: 17.4401,
      longitude: 78.3489,
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500081',
      isDefault: false,
    },
  });

  await prisma.wallet.upsert({
    where: { customerId: customer.id },
    update: {
      balance: 500,
      totalCredit: 500,
      totalDebit: 0,
    },
    create: {
      customerId: customer.id,
      balance: 500,
      totalCredit: 500,
      totalDebit: 0,
    },
  });

  return { user, customer, pickupAddress, dropAddress };
}

async function seedRider() {
  const phoneNumber = process.env.SEED_RIDER_PHONE || '+919999999997';
  const password = process.env.SEED_RIDER_PASSWORD || 'Rider@123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {
      fullName: 'Smoke Rider',
      role: UserRole.RIDER,
      isVerified: true,
      isBlocked: false,
      passwordHash,
    },
    create: {
      phoneNumber,
      fullName: 'Smoke Rider',
      role: UserRole.RIDER,
      isVerified: true,
      isBlocked: false,
      passwordHash,
    },
  });

  const rider = await prisma.rider.upsert({
    where: { userId: user.id },
    update: {
      aadhaarNumber: '999900001111',
      aadhaarPhoto: 'https://example.com/aadhaar.jpg',
      licenseNumber: 'TS09RIDER1234',
      licensePhoto: 'https://example.com/license.jpg',
      rcNumber: 'TS09RC1234',
      rcPhoto: 'https://example.com/rc.jpg',
      selfiePhoto: 'https://example.com/selfie.jpg',
      verificationStatus: 'APPROVED',
      isApproved: true,
      isSuspended: false,
      isOnline: true,
      latitude: 17.389,
      longitude: 78.486,
      lastLocationUpdate: new Date(),
      totalDeliveries: 1,
      completedDeliveries: 1,
      averageRating: 5,
      totalEarnings: 240,
    },
    create: {
      userId: user.id,
      aadhaarNumber: '999900001111',
      aadhaarPhoto: 'https://example.com/aadhaar.jpg',
      licenseNumber: 'TS09RIDER1234',
      licensePhoto: 'https://example.com/license.jpg',
      rcNumber: 'TS09RC1234',
      rcPhoto: 'https://example.com/rc.jpg',
      selfiePhoto: 'https://example.com/selfie.jpg',
      verificationStatus: 'APPROVED',
      isApproved: true,
      isSuspended: false,
      isOnline: true,
      latitude: 17.389,
      longitude: 78.486,
      lastLocationUpdate: new Date(),
      totalDeliveries: 1,
      completedDeliveries: 1,
      averageRating: 5,
      totalEarnings: 240,
    },
  });

  await prisma.wallet.upsert({
    where: { riderId: rider.id },
    update: {
      balance: 240,
      totalCredit: 240,
      totalDebit: 0,
    },
    create: {
      riderId: rider.id,
      balance: 240,
      totalCredit: 240,
      totalDebit: 0,
    },
  });

  await prisma.vehicle.upsert({
    where: { riderId: rider.id },
    update: {
      vehicleType: VehicleType.AUTO,
      vehicleNumber: 'TS09SMOKE2401',
      vehicleModel: 'Tata Ace',
      vehicleColor: 'White',
      rc: 'RC-TS09SMOKE2401',
      rcExpiryDate: new Date('2030-12-31T00:00:00.000Z'),
      frontPhoto: 'https://example.com/front.jpg',
      sidePhoto: 'https://example.com/side.jpg',
      backPhoto: 'https://example.com/back.jpg',
      isVerified: true,
    },
    create: {
      riderId: rider.id,
      vehicleType: VehicleType.AUTO,
      vehicleNumber: 'TS09SMOKE2401',
      vehicleModel: 'Tata Ace',
      vehicleColor: 'White',
      rc: 'RC-TS09SMOKE2401',
      rcExpiryDate: new Date('2030-12-31T00:00:00.000Z'),
      frontPhoto: 'https://example.com/front.jpg',
      sidePhoto: 'https://example.com/side.jpg',
      backPhoto: 'https://example.com/back.jpg',
      isVerified: true,
    },
  });

  return { user, rider };
}

async function seedOrder(customerId: string, riderId: string, pickupAddressId: string, dropAddressId: string) {
  const orderNumber = 'VT-ORD-1001';
  const existingOrder = await prisma.order.findUnique({ where: { orderNumber } });

  const orderData = {
    customerId,
    riderId,
    pickupAddressId,
    dropAddressId,
    pickupLat: 17.385,
    pickupLng: 78.4867,
    dropLat: 17.4401,
    dropLng: 78.3489,
    estimatedDistance: 12.5,
    parcelCategory: ParcelCategory.OTHER,
    parcelWeight: 3.2,
    parcelValue: 1500,
    parcelDescription: 'Seeded parcel for production smoke tests',
    isFragile: false,
    specialInstructions: 'Handle with care',
    vehicleType: VehicleType.AUTO,
    deliveryType: DeliveryType.STANDARD,
    status: OrderStatus.ASSIGNED,
    assignedAt: new Date(),
    baseFare: 80,
    distanceFare: 90,
    weightFare: 20,
    totalPrice: 240,
    discountAmount: 0,
    finalPrice: 240,
    paymentMethod: PaymentMethod.CASH,
    paymentStatus: 'SUCCESS' as const,
    estimatedPickupTime: new Date(Date.now() + 15 * 60 * 1000),
    estimatedDeliveryTime: new Date(Date.now() + 75 * 60 * 1000),
  };

  const order = existingOrder
    ? await prisma.order.update({
        where: { orderNumber },
        data: orderData,
      })
    : await prisma.order.create({
        data: {
          orderNumber,
          ...orderData,
        },
      });

  await prisma.payment.upsert({
    where: { id: `${order.id}-payment` },
    update: {
      orderId: order.id,
      amount: 240,
      paymentMethod: PaymentMethod.CASH,
      status: 'SUCCESS',
      transactionId: 'seed-transaction-1001',
    },
    create: {
      id: `${order.id}-payment`,
      orderId: order.id,
      amount: 240,
      paymentMethod: PaymentMethod.CASH,
      status: 'SUCCESS',
      transactionId: 'seed-transaction-1001',
    },
  });

  await prisma.delivery.upsert({
    where: { orderId: order.id },
    update: {
      riderId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
    create: {
      orderId: order.id,
      riderId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  await prisma.trackingLog.createMany({
    data: [
      {
        orderId: order.id,
        latitude: 17.385,
        longitude: 78.4867,
        status: OrderStatus.ASSIGNED,
      },
      {
        orderId: order.id,
        latitude: 17.389,
        longitude: 78.486,
        status: OrderStatus.ON_WAY,
      },
    ],
    skipDuplicates: true,
  });

  return order;
}

async function main() {
  const admin = await seedAdmin();
  const customer = await seedCustomer();
  const rider = await seedRider();
  const order = await seedOrder(customer.customer.id, rider.rider.id, customer.pickupAddress.id, customer.dropAddress.id);

  console.log(`Seeded admin user ${admin.phoneNumber}`);
  console.log(`Seeded customer user ${customer.user.phoneNumber}`);
  console.log(`Seeded rider user ${rider.user.phoneNumber}`);
  console.log(`Seeded smoke order ${order.orderNumber}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });