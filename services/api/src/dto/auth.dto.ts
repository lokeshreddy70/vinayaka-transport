import { IsIn, IsOptional, IsPhoneNumber, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsPhoneNumber("IN")
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @IsString()
  name!: string;

  @IsPhoneNumber("IN")
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(["SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER", "COUNTER_STAFF", "DISPATCHER", "RIDER", "ACCOUNTANT"])
  role!: "SUPER_ADMIN" | "ADMIN" | "BRANCH_MANAGER" | "COUNTER_STAFF" | "DISPATCHER" | "RIDER" | "ACCOUNTANT";

  @IsOptional()
  @IsString()
  branchId?: string;
}
