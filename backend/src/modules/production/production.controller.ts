import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RecordActualProductionDto } from './dto/production.dto';
import { ProductionService } from './production.service';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  /**
   * Trang 7: Kế hoạch Tổng sản xuất ngày của Bếp + Danh sách nguyên liệu cần chuẩn bị.
   * GET /api/v1/production/daily-plan
   */
  @Get('daily-plan')
  async getDailyProductionPlan(@Query('date') date?: string) {
    return this.productionService.getDailyProductionPlan(date);
  }

  /**
   * Trang 8: Ghi nhận sản xuất thực tế của Bếp (Cộng thành phẩm, trừ nguyên liệu BOM, cảnh báo nếu âm kho).
   * POST /api/v1/production/record
   */
  @Post('record')
  async recordActualProduction(@Body() dto: RecordActualProductionDto) {
    const defaultUserId = 1;
    return this.productionService.recordActualProduction(dto, defaultUserId);
  }

  @Post('orders/:orderId/start')
  async startProduction(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.productionService.startOrderProduction(orderId);
  }

  @Post('orders/:orderId/complete')
  async completeProduction(@Param('orderId', ParseIntPipe) orderId: number) {
    const defaultUserId = 1;
    return this.productionService.completeOrderProduction(
      orderId,
      defaultUserId,
    );
  }
}
