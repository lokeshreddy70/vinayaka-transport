import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { OrderStatus, Prisma, RiderStatus, RoleCode, VehicleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { UpsertBranchDto } from "../dto/branch.dto";
import { CreateOrderDto, QuoteOrderDto } from "../dto/order.dto";
import { UpsertPricingRuleDto } from "../dto/pricing.dto";
import { PrismaService } from "../prisma.service";

const EARTH_RADIUS_KM = 6371;

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  private haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    return Number((2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
  }

  private generateTrackingNumber(): string {
    const stamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 9000 + 1000).toString();
    return `VT${stamp}${random}`;
  }

  private signToken(payload: { userId: string; roles: RoleCode[] }): string {
    const secret = process.env.JWT_SECRET ?? "vinayaka-transport-secret";
    return jwt.sign(payload, secret, { expiresIn: "1h" });
  }

  async registerUser(dto: {
    name: string;
    phone: string;
    password: string;
    role: RoleCode;
    branchId?: string;
  }) {
    const hash = await bcrypt.hash(dto.password, 10);

    const role = await this.prisma.role.findUnique({ where: { code: dto.role } });
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        passwordHash: hash,
        branchId: dto.branchId,
        roles: {
          create: {
            roleId: role.id
          }
        }
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      roles: user.roles.map((value) => value.role.code)
    };
  }

  async loginUser(dto: { phone: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const roles = user.roles.map((value) => value.role.code);
    const accessToken = this.signToken({ userId: user.id, roles });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        branchId: user.branchId,
        roles
      }
    };
  }

  async listBranches() {
    return this.prisma.branch.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createBranch(dto: UpsertBranchDto) {
    return this.prisma.branch.create({
      data: {
        name: dto.name,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusKm: dto.radiusKm,
        managerId: dto.managerUserId
      }
    });
  }

  async updateBranch(id: string, dto: UpsertBranchDto) {
    return this.prisma.branch.update({
      where: { id },
      data: {
        name: dto.name,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusKm: dto.radiusKm,
        managerId: dto.managerUserId
      }
    });
  }

  async listPricingRules() {
    return this.prisma.pricingRule.findMany({
      include: { branch: true },
      orderBy: { updatedAt: "desc" }
    });
  }

  async createPricingRule(dto: UpsertPricingRuleDto & { branchId?: string }) {
    const branchId = dto.branchId ?? "branch-nellore";
    return this.prisma.pricingRule.create({
      data: {
        branchId,
        vehicleType: dto.vehicleType as VehicleType,
        baseFare: new Prisma.Decimal(dto.baseFare),
        perKmRate: new Prisma.Decimal(dto.perKmRate),
        minFare: new Prisma.Decimal(dto.minFare),
        commissionPercent: new Prisma.Decimal(dto.commissionPercent),
        codEnabled: dto.codEnabled
      }
    });
  }

  async updatePricingRule(id: string, dto: UpsertPricingRuleDto) {
    return this.prisma.pricingRule.update({
      where: { id },
      data: {
        vehicleType: dto.vehicleType as VehicleType,
        baseFare: new Prisma.Decimal(dto.baseFare),
        perKmRate: new Prisma.Decimal(dto.perKmRate),
        minFare: new Prisma.Decimal(dto.minFare),
        commissionPercent: new Prisma.Decimal(dto.commissionPercent),
        codEnabled: dto.codEnabled
      }
    });
  }

  async quoteOrder(dto: QuoteOrderDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id: "branch-nellore" } });
    if (!branch) {
      throw new NotFoundException("Branch not configured");
    }

    const pricing = await this.prisma.pricingRule.findUnique({
      where: {
        branchId_vehicleType: {
          branchId: branch.id,
          vehicleType: dto.vehicleType as VehicleType
        }
      }
    });

    if (!pricing) {
      throw new NotFoundException("Pricing rule not found");
    }

    const distanceKm = this.haversineDistanceKm(dto.pickupLat, dto.pickupLng, dto.dropLat, dto.dropLng);
    const computedFare = Number(pricing.baseFare) + distanceKm * Number(pricing.perKmRate);
    const fare = Math.max(computedFare, Number(pricing.minFare));

    return {
      distanceKm,
      estimatedFare: Number(fare.toFixed(2)),
      etaMinutes: Math.max(15, Math.round(distanceKm * 6))
    };
  }

  async createOrder(dto: CreateOrderDto) {
    const quote = await this.quoteOrder(dto);

    const customer = await this.prisma.customer.upsert({
      where: { phone: dto.senderPhone },
      update: { name: dto.senderName },
      create: {
        name: dto.senderName,
        phone: dto.senderPhone
      }
    });

    const trackingNumber = this.generateTrackingNumber();
    const qrCodeData = await QRCode.toDataURL(trackingNumber);
    const barcodeData = trackingNumber;

    const created = await this.prisma.order.create({
      data: {
        trackingNumber,
        branchId: "branch-nellore",
        customerId: customer.id,
        senderName: dto.senderName,
        senderPhone: dto.senderPhone,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        pickupAddress: dto.pickupAddress,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropAddress: dto.dropAddress,
        dropLat: dto.dropLat,
        dropLng: dto.dropLng,
        vehicleType: dto.vehicleType as VehicleType,
        parcelWeightKg: dto.parcelWeightKg,
        parcelNotes: dto.parcelNotes,
        fragile: dto.fragile ?? false,
        medicine: dto.medicine ?? false,
        codRequired: dto.codRequired,
        codAmount: dto.codAmount ? new Prisma.Decimal(dto.codAmount) : null,
        estimatedFare: new Prisma.Decimal(quote.estimatedFare),
        finalFare: new Prisma.Decimal(quote.estimatedFare),
        status: OrderStatus.BOOKED,
        etaMinutes: quote.etaMinutes,
        qrCodeData,
        barcodeData,
        parcel: {
          create: {
            qrCodePayload: trackingNumber,
            barcodePayload: trackingNumber
          }
        },
        events: {
          create: {
            status: OrderStatus.BOOKED,
            message: "Booking created"
          }
        },
        custodyEvents: {
          create: {
            actorType: "COUNTER_STAFF",
            action: "BOOKING_CREATED"
          }
        }
      },
      include: {
        parcel: true,
        events: true
      }
    });

    return created;
  }

  async listOrders(params: { branchId?: string; status?: string; page: number; limit: number }) {
    const page = Math.max(1, params.page);
    const limit = Math.max(1, Math.min(100, params.limit));
    const where: Prisma.OrderWhereInput = {
      branchId: params.branchId,
      status: params.status ? (params.status as OrderStatus) : undefined
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { parcel: true, customer: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.order.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        parcel: true,
        events: true,
        customer: true,
        assignments: { include: { rider: true } }
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status }
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: id,
        status,
        message: `Order status updated to ${status}`
      }
    });

    return updated;
  }

  async findNearbyRiders(input: {
    branchId: string;
    latitude: number;
    longitude: number;
    vehicleType: VehicleType;
  }) {
    const riders = await this.prisma.rider.findMany({
      where: {
        status: RiderStatus.AVAILABLE,
        isApproved: true,
        vehicleType: input.vehicleType,
        user: {
          branchId: input.branchId
        }
      },
      include: {
        user: true
      },
      take: 100
    });

    return riders
      .map((rider) => {
        const distanceKm =
          rider.currentLat == null || rider.currentLng == null
            ? 9999
            : this.haversineDistanceKm(input.latitude, input.longitude, rider.currentLat, rider.currentLng);

        return {
          ...rider,
          distanceKm
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);
  }

  async updateRiderStatus(id: string, status: RiderStatus) {
    return this.prisma.rider.update({
      where: { id },
      data: { status }
    });
  }

  async updateRiderLocation(id: string, dto: { latitude: number; longitude: number }) {
    await this.prisma.riderLocation.create({
      data: {
        riderId: id,
        latitude: dto.latitude,
        longitude: dto.longitude
      }
    });

    return this.prisma.rider.update({
      where: { id },
      data: {
        currentLat: dto.latitude,
        currentLng: dto.longitude
      }
    });
  }

  async getTracking(trackingNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { trackingNumber },
      include: {
        events: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!order) {
      throw new NotFoundException("Tracking number not found");
    }

    return {
      trackingNumber: order.trackingNumber,
      status: order.status,
      etaMinutes: order.etaMinutes,
      timeline: order.events
    };
  }

  async getTrackingTimeline(trackingNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { trackingNumber },
      include: {
        events: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!order) {
      throw new NotFoundException("Tracking number not found");
    }

    return order.events;
  }
}
