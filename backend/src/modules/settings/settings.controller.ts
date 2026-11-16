import { Body, Controller, Get, Put } from '@nestjs/common';
import { BulkUpdateSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Trang 21: Lấy toàn bộ cấu hình hệ thống.
   * GET /api/v1/settings
   */
  @Get()
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  /**
   * Trang 21: Cập nhật cấu hình hệ thống (ngưỡng 24h/48h, tiền tố mã tự động, thông tin in hóa đơn).
   * PUT /api/v1/settings
   */
  @Put()
  async updateSettings(@Body() dto: BulkUpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}

