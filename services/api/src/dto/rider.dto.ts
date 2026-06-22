import { IsIn, IsNumber } from "class-validator";

export class UpdateRiderStatusDto {
  @IsIn(["OFFLINE", "AVAILABLE", "ON_DELIVERY"])
  status!: "OFFLINE" | "AVAILABLE" | "ON_DELIVERY";
}

export class UpdateRiderLocationDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}
