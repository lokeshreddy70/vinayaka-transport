import { PrismaClient, RoleCode, VehicleType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roles = Object.values(RoleCode);

  for (const code of roles) {
    await prisma.role.upsert({
      where: { code },
      update: {},
      create: { code, name: code }
    });
  }

  const nellore = await prisma.branch.upsert({
    where: { id: "branch-nellore" },
    update: {},
    create: {
      id: "branch-nellore",
      name: "Nellore Main Branch",
      city: "Nellore",
      latitude: 14.4426,
      longitude: 79.9865,
      radiusKm: 12
    }
  });

  await prisma.branch.upsert({
    where: { id: "branch-podalakur" },
    update: {},
    create: {
      id: "branch-podalakur",
      name: "Podalakur Branch",
      city: "Podalakur",
      latitude: 14.3167,
      longitude: 79.7833,
      radiusKm: 10
    }
  });

  await prisma.branch.upsert({
    where: { id: "branch-tirupati" },
    update: {},
    create: {
      id: "branch-tirupati",
      name: "Tirupati Branch",
      city: "Tirupati",
      latitude: 13.6288,
      longitude: 79.4192,
      radiusKm: 15
    }
  });

  for (const vehicleType of [VehicleType.BIKE, VehicleType.AUTO, VehicleType.CAR]) {
    await prisma.pricingRule.upsert({
      where: {
        branchId_vehicleType: { branchId: nellore.id, vehicleType }
      },
      update: {},
      create: {
        branchId: nellore.id,
        vehicleType,
        baseFare: vehicleType === VehicleType.BIKE ? 25 : vehicleType === VehicleType.AUTO ? 45 : 80,
        perKmRate: vehicleType === VehicleType.BIKE ? 8 : vehicleType === VehicleType.AUTO ? 12 : 17,
        minFare: vehicleType === VehicleType.BIKE ? 35 : vehicleType === VehicleType.AUTO ? 60 : 120,
        commissionPercent: vehicleType === VehicleType.CAR ? 18 : 15,
        codEnabled: true
      }
    });
  }

  const adminPass = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { phone: "+919999999999" },
    update: {},
    create: {
      name: "Vinayaka Super Admin",
      phone: "+919999999999",
      passwordHash: adminPass,
      branchId: nellore.id
    }
  });

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUPER_ADMIN } });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: superAdminRole.id
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
