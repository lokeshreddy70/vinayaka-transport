import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { UpsertBranchDto } from "../dto/branch.dto";
import { OperationsService } from "../services/operations.service";

@Controller("branches")
export class BranchesController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get()
  list() {
    return this.operationsService.listBranches();
  }

  @Post()
  create(@Body() dto: UpsertBranchDto) {
    return this.operationsService.createBranch(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpsertBranchDto) {
    return this.operationsService.updateBranch(id, dto);
  }
}
