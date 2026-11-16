import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  CreatePurchaseReceiptDto,
  InventoryReportQueryDto,
  PurchaseFilterQueryDto,
  RecordWasteLossDto,
  SubmitDailyStocktakeDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Danh mục Nhà cung cấp, Nguyên vật liệu, Thành phẩm dùng cho các bộ lọc & popup Kho
   */
  @Get('catalogs')
  async getCatalogs() {
    return this.inventoryService.getInventoryCatalogs();
  }

  /**
   * Tổng quan tồn kho tức thời
   */
  @Get('overview')
  async getOverview() {
    return this.inventoryService.getOverview();
  }

  // ==========================================================================
  // TRANG 11: DANH SÁCH HÀNG NHẬP & TẠO PHIẾU NHẬP (purchase_items)
  // ==========================================================================

  @Get('purchases')
  async getPurchaseReceipts(@Query() query: PurchaseFilterQueryDto) {
    return this.inventoryService.getPurchaseReceipts(query);
  }

  @Post('purchases')
  async createPurchaseReceipt(@Body() dto: CreatePurchaseReceiptDto) {
    const defaultUserId = 1;
    return this.inventoryService.createPurchaseReceipt(dto, defaultUserId);
  }

  // ==========================================================================
  // TRANG 12: KIỂM KÊ CUỐI NGÀY (stock_movements: adjustment)
  // ==========================================================================

  @Get('stocktake-sheet')
  async getDailyStocktakeSheet(@Query('date') date?: string) {
    return this.inventoryService.getDailyStocktakeSheet(date);
  }

  @Post('stocktake')
  async submitDailyStocktake(@Body() dto: SubmitDailyStocktakeDto) {
    const defaultUserId = 1;
    return this.inventoryService.submitDailyStocktake(dto, defaultUserId);
  }

  // ==========================================================================
  // TRANG 13: HỦY VÀ HAO HỤT (stock_movements: waste_loss)
  // ==========================================================================

  @Get('waste-loss')
  async getWasteLossHistory(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.inventoryService.getWasteLossHistory(fromDate, toDate);
  }

  @Post('waste-loss')
  async recordWasteLoss(@Body() dto: RecordWasteLossDto) {
    const defaultUserId = 1;
    return this.inventoryService.recordWasteLoss(dto, defaultUserId);
  }

  // ==========================================================================
  // TRANG 14: BÁO CÁO TỒN KHO (stock_movements report)
  // ==========================================================================

  @Get('report')
  async getInventoryReport(@Query() query: InventoryReportQueryDto) {
    return this.inventoryService.getInventoryMovementReport(query);
  }
}
