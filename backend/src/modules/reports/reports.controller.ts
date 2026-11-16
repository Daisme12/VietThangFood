import { Controller, Get, Query } from '@nestjs/common';
import {
  CustomerDebtQueryDto,
  RevenueReportQueryDto,
} from './dto/reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * TRANG 1: DASHBOARD TỔNG QUAN (KPI Xanh/Vàng/Đỏ, Doanh thu ngày/tháng, Cảnh báo NL dưới min_stock, Đơn hạn 24h/48h, Đơn chờ duyệt).
   * GET /api/v1/reports/dashboard
   */
  @Get('dashboard')
  async getDashboardSummary() {
    return this.reportsService.getDashboardSummary();
  }

  /**
   * Danh mục bộ lọc dùng chung cho Phân hệ Báo cáo & Tài chính:
   * - Danh sách Khách hàng
   * - Danh sách Địa điểm giao hàng (1 - N với Khách hàng)
   * - Danh sách Danh mục sản phẩm (Categories)
   * - Thông tin pháp nhân Công ty để in bảng đối soát công nợ
   */
  @Get('catalogs')
  async getFilterCatalogs() {
    return this.reportsService.getReportFilterCatalogs();
  }

  /**
   * TRANG 15: BÁO CÁO DOANH THU (REVENUE REPORT)
   * - Chỉ tính doanh thu trên số lượng THỰC GIAO (qty_delivered) của các đơn
   *   đã có phiếu xuất kho (delivered_at IS NOT NULL).
   * - Hỗ trợ đổi trục phân tích: customer | location | product | category.
   */
  @Get('revenue')
  async getRevenueReport(@Query() query: RevenueReportQueryDto) {
    return this.reportsService.getRevenueReport(query);
  }

  /**
   * TRANG 16: BÁO CÁO CÔNG NỢ KHÁCH HÀNG (CUSTOMER DEBTS RECONCILIATION)
   * - Đối chiếu tiền phải thu theo từng Khách hàng hoặc từng Địa điểm giao hàng.
   * - Bảng đối soát sắp xếp theo ngày giao (delivered_at), có hàng tổng cộng dồn cuối mỗi nhóm.
   */
  @Get('debts')
  async getCustomerDebtReport(@Query() query: CustomerDebtQueryDto) {
    return this.reportsService.getCustomerDebtReport(query);
  }
}
