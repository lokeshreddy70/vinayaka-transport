import { Controller, Get, Param } from "@nestjs/common";
import { OperationsService } from "../services/operations.service";

@Controller("tracking")
export class TrackingController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get(":trackingNumber")
  getTracking(@Param("trackingNumber") trackingNumber: string) {
    return this.operationsService.getTracking(trackingNumber);
  }

  @Get(":trackingNumber/timeline")
  getTimeline(@Param("trackingNumber") trackingNumber: string) {
    return this.operationsService.getTrackingTimeline(trackingNumber);
  }
}
