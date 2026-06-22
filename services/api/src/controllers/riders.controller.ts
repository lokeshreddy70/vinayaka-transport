import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UpdateRiderLocationDto, UpdateRiderStatusDto } from "../dto/rider.dto";
import { OperationsService } from "../services/operations.service";

@Controller("riders")
export class RidersController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get("nearby")
  nearby(
    @Query("branchId") branchId: string,
    @Query("latitude") latitude: string,
    @Query("longitude") longitude: string,
    @Query("vehicleType") vehicleType: "BIKE" | "AUTO" | "CAR"
  ) {
    return this.operationsService.findNearbyRiders({
      branchId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      vehicleType
    });
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateRiderStatusDto) {
    return this.operationsService.updateRiderStatus(id, dto.status);
  }

  @Post(":id/location")
  updateLocation(@Param("id") id: string, @Body() dto: UpdateRiderLocationDto) {
    return this.operationsService.updateRiderLocation(id, dto);
  }
}
