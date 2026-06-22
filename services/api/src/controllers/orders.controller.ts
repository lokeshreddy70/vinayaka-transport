import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CreateOrderDto, QuoteOrderDto, UpdateOrderStatusDto } from "../dto/order.dto";
import { OperationsService } from "../services/operations.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly operationsService: OperationsService) {}

  @Post("quote")
  quote(@Body() dto: QuoteOrderDto) {
    return this.operationsService.quoteOrder(dto);
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.operationsService.createOrder(dto);
  }

  @Get()
  list(
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20"
  ) {
    return this.operationsService.listOrders({
      branchId,
      status,
      page: Number(page),
      limit: Number(limit)
    });
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.operationsService.getOrderById(id);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.operationsService.updateOrderStatus(id, dto.status);
  }
}
