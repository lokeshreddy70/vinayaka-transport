import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { UpsertPricingRuleDto } from "../dto/pricing.dto";
import { OperationsService } from "../services/operations.service";

@Controller("pricing-rules")
export class PricingController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get()
  list() {
    return this.operationsService.listPricingRules();
  }

  @Post()
  create(@Body() dto: UpsertPricingRuleDto) {
    return this.operationsService.createPricingRule(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpsertPricingRuleDto) {
    return this.operationsService.updatePricingRule(id, dto);
  }
}
