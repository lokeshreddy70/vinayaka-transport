import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class UpsertBranchDto {
  @IsString()
  name!: string;

  @IsString()
  city!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm!: number;

  @IsOptional()
  @IsString()
  managerUserId?: string;
}
