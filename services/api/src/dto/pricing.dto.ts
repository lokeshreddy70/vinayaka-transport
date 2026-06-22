import { IsBoolean, IsIn, IsNumber, Min } from "class-validator";

export class UpsertPricingRuleDto {
  @IsIn(["BIKE", "AUTO", "CAR"])
  vehicleType!: "BIKE" | "AUTO" | "CAR";

  @IsNumber()
  @Min(0)
  baseFare!: number;

  @IsNumber()
  @Min(0)
  perKmRate!: number;

  @IsNumber()
  @Min(0)
  minFare!: number;

  @IsNumber()
  @Min(0)
  commissionPercent!: number;

  @IsBoolean()
  codEnabled!: boolean;
}
