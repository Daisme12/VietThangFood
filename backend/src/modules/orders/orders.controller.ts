import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApproveOrderParamDto,
  ApproveOrderResultDto,
  BulkApproveGreenYellowDto,
} from './dto/order-approval.dto';
import {
  CancelOrderDto,
  CreateOrderDto,
  DeliverOrderDto,
  QueryOrdersDto,
  UpdateOrderDto,
} from './dto/create-order.dto';
import { OrderApprovalService } from './order-approval.service';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orderApprovalService: OrderApprovalService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Trang 2: Danh sách đơn hàng toàn hệ thống với bộ lọc nâng cao.
   * GET /api/v1/orders
   */
  @Get()
  async listOrders(@Query() query: QueryOrdersDto) {
    return this.ordersService.listOrders(query);
  }

  /**
   * Trang 3: Danh sách đơn chờ duyệt kèm đánh giá nhanh tồn kho Xanh - Vàng - Đỏ.
   * GET /api/v1/orders/pending-approval
   */
  @Get('pending-approval')
  async getPendingOrdersForApproval() {
    return this.orderApprovalService.getPendingOrdersWithStockPreview();
  }

  /**
   * Trang 4: Đơn hôm nay (Đi đơn) gom theo Khách hàng & Địa điểm + Thông tin in phiếu giao hàng.
   * GET /api/v1/orders/today-delivery
   */
  @Get('today-delivery')
  async getTodayOrdersForDelivery(@Query('date') date?: string) {
    return this.ordersService.getTodayOrdersGroupedByCustomerAndLocation(date);
  }

  /**
   * Trang 6: Danh sách đơn đã hủy.
   * GET /api/v1/orders/cancelled
   */
  @Get('cancelled')
  async listCancelledOrders() {
    return this.ordersService.listCancelledOrders();
  }

  /**
   * Trang 2: Tạo đơn hàng mới (Sinh mã tự động DH-YYYYMMDD-XXX).
   * POST /api/v1/orders
   */
  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    const defaultUserId = 1;
    return this.ordersService.createOrder(dto, defaultUserId);
  }

  /**
   * Trang 2: Cập nhật đơn hàng (Đơn Đã giao cấm sửa).
   * PATCH /api/v1/orders/:orderId
   */
  @Patch(':orderId')
  async updateOrder(
    @Param() params: ApproveOrderParamDto,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.updateOrder(params.orderId, dto);
  }

  /**
   * Trang 2 & Trang 6: Hủy đơn hàng (Bắt buộc có lý do hủy cancelReason).
   * POST /api/v1/orders/:orderId/cancel
   */
  @Post(':orderId/cancel')
  async cancelOrder(
    @Param() params: ApproveOrderParamDto,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(params.orderId, dto);
  }

  /**
   * Trang 6: Khôi phục đơn đã hủy về trạng thái Nháp (draft).
   * POST /api/v1/orders/:orderId/restore-draft
   */
  @Post(':orderId/restore-draft')
  async restoreCancelledOrderToDraft(@Param() params: ApproveOrderParamDto) {
    return this.ordersService.restoreCancelledOrderToDraft(params.orderId);
  }

  /**
   * Trang 3: Duyệt đơn lẻ theo thuật toán Xanh - Vàng - Đỏ.
   * POST /api/v1/orders/:orderId/approve
   */
  @Post(':orderId/approve')
  async approveOrder(
    @Param() params: ApproveOrderParamDto,
  ): Promise<ApproveOrderResultDto> {
    const defaultUserId = 1;
    return this.orderApprovalService.approveOrder(
      params.orderId,
      defaultUserId,
    );
  }

  /**
   * Trang 3: Duyệt hàng loạt đơn Xanh & Vàng (Ưu tiên đơn hạn 24h/48h trước, sau đó theo created_at ASC).
   * POST /api/v1/orders/approve-bulk-green-yellow
   */
  @Post('approve-bulk-green-yellow')
  async approveBulkGreenAndYellow(@Body() body: BulkApproveGreenYellowDto) {
    const defaultUserId = 1;
    return this.orderApprovalService.approveAllGreenAndYellowOrders(
      defaultUserId,
      body.orderIds,
    );
  }

  /**
   * Trang 5: Xác nhận Phiếu xuất kho (Giao hàng) & xử lý Giao bù.
   * POST /api/v1/orders/:orderId/deliver
   */
  @Post(':orderId/deliver')
  async deliverOrder(
    @Param() params: ApproveOrderParamDto,
    @Body() dto: DeliverOrderDto,
  ) {
    const defaultUserId = 1;
    return this.ordersService.deliverOrder(
      params.orderId,
      dto,
      defaultUserId,
    );
  }
}
