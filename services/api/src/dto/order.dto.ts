import { IsBoolean, IsIn, IsNumber, IsOptional, IsPhoneNumber, IsString, Min } from "class-validator";

export class QuoteOrderDto {
  @IsString()
  pickupAddress!: string;

  @IsNumber()
  pickupLat!: number;

  @IsNumber()
  pickupLng!: number;

  @IsString()
  dropAddress!: string;

  @IsNumber()
  dropLat!: number;

  @IsNumber()
  dropLng!: number;

  @IsIn(["BIKE", "AUTO", "CAR"])
  vehicleType!: "BIKE" | "AUTO" | "CAR";

  @IsOptional()
  @IsNumber()
  @Min(0)
  parcelWeightKg?: number;
}

export class CreateOrderDto extends QuoteOrderDto {
  @IsString()
  senderName!: string;

  @IsPhoneNumber("IN")
  senderPhone!: string;

  @IsString()
  receiverName!: string;

  @IsPhoneNumber("IN")
  receiverPhone!: string;

  @IsBoolean()
  codRequired!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;

  @IsOptional()
  @IsString()
  parcelNotes?: string;

  @IsOptional()
  @IsBoolean()
  fragile?: boolean;

  @IsOptional()
  @IsBoolean()
  medicine?: boolean;
}

export class UpdateOrderStatusDto {
  @IsIn(["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"])
  status!:
    | "ASSIGNED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "FAILED"
    | "RETURNED";
}
