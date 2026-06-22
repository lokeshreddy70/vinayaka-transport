import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma.service";
import { AppController } from "./controllers/app.controller";
import { AuthController } from "./controllers/auth.controller";
import { BranchesController } from "./controllers/branches.controller";
import { OrdersController } from "./controllers/orders.controller";
import { TrackingController } from "./controllers/tracking.controller";
import { RidersController } from "./controllers/riders.controller";
import { PricingController } from "./controllers/pricing.controller";
import { OperationsService } from "./services/operations.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [
    AppController,
    AuthController,
    BranchesController,
    PricingController,
    OrdersController,
    RidersController,
    TrackingController
  ],
  providers: [PrismaService, OperationsService]
})
export class AppModule {}
