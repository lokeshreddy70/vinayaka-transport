import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

const prisma = new PrismaClient();

async function main() {
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

  console.log(`Seeded admin user ${phoneNumber}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });