import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto, RegisterDto } from "../dto/auth.dto";
import { OperationsService } from "../services/operations.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly operationsService: OperationsService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.operationsService.registerUser(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.operationsService.loginUser(dto);
  }
}
