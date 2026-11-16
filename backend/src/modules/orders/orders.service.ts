import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  OrderType,
  Prisma,
  ShortAction,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CancelOrderDto,
  CreateOrderDto,
  DeliverOrderDto,
  QueryOrdersDto,
  UpdateOrderDto,
} from './dto/create-order.dto';

const ZERO_DEC = new Prisma.Decimal(0);
const HUNDRED_DEC = new Prisma.Decimal(100);

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trang 2: Danh sách đơn hàng toàn hệ thống với bộ lọc nâng cao.
   */
  async listOrders(query: QueryOrdersDto) {
    const orders = await this.prisma.order.findMany({
      where: {
        ...(query.includeHidden ? {} : { isHidden: false }),
        ...(query.status ? { status: query.status } : {}),
        ...(query.checkLevel ? { checkLevel: query.checkLevel } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.fromDate || query.toDate
          ? {
              orderDate: {
                ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
                ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
              },
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search.trim() } },
                { deliveryCode: { contains: query.search.trim() } },
                { customer: { name: { contains: query.search.trim() } } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        location: true,
        parentOrder: {
          select: { id: true, code: true },
        },
        items: {
          include: {
            product: true,
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return orders.map((o) => ({
      id: o.id.toString(),
      code: o.code,
      orderType: o.orderType,
      parentOrderId: o.parentOrderId?.toString() ?? null,
      parentOrderCode: o.parentOrder?.code ?? null,
      customerId: o.customerId,
      customerCode: o.customer.code,
      customerName: o.customer.name,
      locationId: o.locationId,
      locationName: o.location.name,
      locationAddress: o.location.address,
      orderDate: o.orderDate.toISOString().slice(0, 10),
      deliveryAt: o.deliveryAt.toISOString(),
      status: o.status,
      checkLevel: o.checkLevel,
      isLockedForEdit: o.status === OrderStatus.delivered,
      cancelReason: o.cancelReason,
      cancelledAt: o.cancelledAt?.toISOString() ?? null,
      deliveryCode: o.deliveryCode,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      totalBeforeVat: o.totalBeforeVat.toFixed(2),
      totalVat: o.totalVat.toFixed(2),
      totalAmount: o.totalAmount.toFixed(2),
      note: o.note,
      isHidden: o.isHidden,
      items: o.items.map((item) => ({
        id: item.id.toString(),
        productId: item.productId,
        productCode: item.product.code,
        productName: item.product.name,
        unit: item.product.unit,
        qtyOrdered: item.qtyOrdered.toFixed(3),
        qtyFromStock: item.qtyFromStock.toFixed(3),
        qtyToProduce: item.qtyToProduce.toFixed(3),
        qtyDelivered: item.qtyDelivered.toFixed(3),
        qtyShort: item.qtyShort.toFixed(3),
        shortAction: item.shortAction,
        shortCloseReason: item.shortCloseReason,
        unitPrice: item.unitPrice.toFixed(2),
        vatRate: item.vatRate.toFixed(2),
      })),
    }));
  }

  /**
   * Trang 2: Tạo đơn hàng mới (Standard Order) với tính toán chính xác tiền hàng & thuế VAT bằng Decimal(15,2)
   * và sinh mã tự động theo tiền tố cấu hình kèm ngày tháng & số thứ tự tăng dần (VD: DH-20261110-001).
   */
  async createOrder(dto: CreateOrderDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const location = await tx.customerLocation.findFirst({
        where: {
          id: dto.locationId,
          customerId: dto.customerId,
          isHidden: false,
        },
      });

      if (!location) {
        throw new BadRequestException(
          'Điểm giao hàng không tồn tại hoặc không thuộc khách hàng đã chọn.',
        );
      }

      const productIds = Array.from(
        new Set(dto.items.map((i) => i.productId)),
      );
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          isHidden: false,
        },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều sản phẩm trong đơn hàng không tồn tại hoặc đã ngừng kinh doanh.',
        );
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalBeforeVat = ZERO_DEC;
      let totalVat = ZERO_DEC;

      const orderItemsData = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const qtyOrdered = new Prisma.Decimal(item.qtyOrdered);
        if (qtyOrdered.lte(ZERO_DEC)) {
          throw new BadRequestException(
            `Số lượng đặt của sản phẩm ${product.name} phải lớn hơn 0.`,
          );
        }

        const lineBeforeVat = qtyOrdered.mul(product.price);
        const lineVat = lineBeforeVat.mul(product.vatRate).div(HUNDRED_DEC);

        totalBeforeVat = totalBeforeVat.add(lineBeforeVat);
        totalVat = totalVat.add(lineVat);

        return {
          productId: product.id,
          qtyOrdered: qtyOrdered.toDecimalPlaces(3),
          unitPrice: product.price,
          vatRate: product.vatRate,
          note: item.note ?? null,
        };
      });

      const roundedBeforeVat = totalBeforeVat.toDecimalPlaces(
        2,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      const roundedVat = totalVat.toDecimalPlaces(
        2,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      const totalAmount = roundedBeforeVat.add(roundedVat);

      const code = await this.generateNextOrderCode(tx, dto.orderDate);

      const created = await tx.order.create({
        data: {
          code,
          orderType: OrderType.standard,
          customerId: dto.customerId,
          locationId: dto.locationId,
          orderDate: new Date(dto.orderDate),
          deliveryAt: new Date(dto.deliveryAt),
          status: OrderStatus.pending,
          note: dto.note ?? null,
          totalBeforeVat: roundedBeforeVat,
          totalVat: roundedVat,
          totalAmount,
          createdBy: userId,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return {
        ...created,
        id: created.id.toString(),
        parentOrderId: created.parentOrderId?.toString() ?? null,
        items: created.items.map((i) => ({
          ...i,
          id: i.id.toString(),
          orderId: i.orderId.toString(),
          makeUpOrderId: i.makeUpOrderId?.toString() ?? null,
        })),
      };
    });
  }

  /**
   * Trang 2: Cập nhật đơn hàng.
   * Quy tắc bắt buộc (Mục 4.2): Đơn Đã giao (delivered) CẤM SỬA tuyệt đối.
   */
  async updateOrder(orderId: number, dto: UpdateOrderDto) {
    const orderBigIntId = BigInt(orderId);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderBigIntId, isHidden: false },
      });

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}.`);
      }

      if (order.status === OrderStatus.delivered) {
        throw new BadRequestException(
          `Đơn hàng ${order.code} đã giao hàng (delivered) — CẤM SỬA theo Quy tắc 4.2.`,
        );
      }

      if (order.status === OrderStatus.cancelled) {
        throw new BadRequestException(
          `Đơn hàng ${order.code} đã hủy. Vui lòng khôi phục về trạng thái Nháp (draft) trước khi chỉnh sửa.`,
        );
      }

      let totalBeforeVat = order.totalBeforeVat;
      let totalVat = order.totalVat;
      let totalAmount = order.totalAmount;

      if (dto.items && dto.items.length > 0) {
        const productIds = Array.from(
          new Set(dto.items.map((i) => i.productId)),
        );
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, isHidden: false },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        totalBeforeVat = ZERO_DEC;
        totalVat = ZERO_DEC;

        await tx.orderItem.deleteMany({
          where: { orderId: orderBigIntId },
        });

        for (const item of dto.items) {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new BadRequestException(
              `Không tìm thấy sản phẩm ID #${item.productId}.`,
            );
          }
          const qtyOrdered = new Prisma.Decimal(item.qtyOrdered).toDecimalPlaces(
            3,
          );
          const lineBefore = qtyOrdered.mul(product.price);
          const lineVat = lineBefore.mul(product.vatRate).div(HUNDRED_DEC);
          totalBeforeVat = totalBeforeVat.add(lineBefore);
          totalVat = totalVat.add(lineVat);

          await tx.orderItem.create({
            data: {
              orderId: orderBigIntId,
              productId: product.id,
              qtyOrdered,
              unitPrice: product.price,
              vatRate: product.vatRate,
              note: item.note ?? null,
            },
          });
        }

        totalBeforeVat = totalBeforeVat.toDecimalPlaces(
          2,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        totalVat = totalVat.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        totalAmount = totalBeforeVat.add(totalVat);
      }

      const updated = await tx.order.update({
        where: { id: orderBigIntId },
        data: {
          ...(dto.locationId !== undefined
            ? { locationId: dto.locationId }
            : {}),
          ...(dto.deliveryAt !== undefined
            ? { deliveryAt: new Date(dto.deliveryAt) }
            : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          ...(dto.items
            ? {
                status: OrderStatus.pending,
                checkLevel: null,
                totalBeforeVat,
                totalVat,
                totalAmount,
              }
            : {}),
        },
      });

      return {
        orderId: updated.id.toString(),
        code: updated.code,
        status: updated.status,
        totalAmount: updated.totalAmount.toFixed(2),
        message: `Đã cập nhật đơn hàng ${updated.code}.`,
      };
    });
  }

  /**
   * Trang 2 & Trang 6: Hủy đơn hàng (Bắt buộc phải nhập lý do cancelReason, giải phóng tồn kho đang giữ).
   */
  async cancelOrder(orderId: number, dto: CancelOrderDto) {
    const orderBigIntId = BigInt(orderId);

    if (!dto.cancelReason || !dto.cancelReason.trim()) {
      throw new BadRequestException(
        'Bắt buộc phải nhập lý do hủy đơn hàng (cancelReason).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderBigIntId, isHidden: false },
      });

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}.`);
      }

      if (order.status === OrderStatus.delivered) {
        throw new BadRequestException(
          `Đơn hàng ${order.code} đã xuất giao thành công nên không thể hủy.`,
        );
      }

      // Giải phóng lượng tồn kho đang giữ (qtyFromStock & qtyToProduce)
      await tx.orderItem.updateMany({
        where: { orderId: orderBigIntId },
        data: {
          qtyFromStock: ZERO_DEC,
          qtyToProduce: ZERO_DEC,
        },
      });

      const updated = await tx.order.update({
        where: { id: orderBigIntId },
        data: {
          status: OrderStatus.cancelled,
          cancelReason: dto.cancelReason.trim(),
          cancelledAt: new Date(),
        },
      });

      return {
        orderId: updated.id.toString(),
        orderCode: updated.code,
        status: updated.status,
        cancelReason: updated.cancelReason,
        cancelledAt: updated.cancelledAt?.toISOString() ?? null,
        message: `Đã hủy đơn hàng ${updated.code} và hoàn trả tồn kho giữ chỗ.`,
      };
    });
  }

  /**
   * Trang 6: Xem danh sách Đơn đã hủy.
   */
  async listCancelledOrders() {
    return this.listOrders({ status: OrderStatus.cancelled });
  }

  /**
   * Trang 6: Khôi phục đơn đã hủy về trạng thái Nháp (draft).
   */
  async restoreCancelledOrderToDraft(orderId: number) {
    const orderBigIntId = BigInt(orderId);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderBigIntId, isHidden: false },
      });

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}.`);
      }

      if (order.status !== OrderStatus.cancelled) {
        throw new BadRequestException(
          `Chỉ có thể khôi phục đơn ở trạng thái 'cancelled' (hiện tại: '${order.status}').`,
        );
      }

      const restored = await tx.order.update({
        where: { id: orderBigIntId },
        data: {
          status: OrderStatus.draft,
          cancelReason: null,
          cancelledAt: null,
          checkLevel: null,
        },
      });

      return {
        orderId: restored.id.toString(),
        orderCode: restored.code,
        status: restored.status,
        message: `Đã khôi phục đơn hàng ${restored.code} về trạng thái Nháp (draft).`,
      };
    });
  }

  /**
   * Trang 4: Đơn hôm nay (Đi đơn) gom theo Khách hàng và Địa điểm + Dữ liệu in phiếu giao hàng (thuế, công ty, chữ ký).
   */
  async getTodayOrdersGroupedByCustomerAndLocation(dateStr?: string) {
    const targetDate = dateStr
      ? new Date(`${dateStr.slice(0, 10)}T00:00:00.000Z`)
      : new Date();
    const dayStart = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        0,
        0,
        0,
      ),
    );
    const dayEnd = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const [orders, settingsRows] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          isHidden: false,
          deliveryAt: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: {
            in: [
              OrderStatus.approved,
              OrderStatus.in_production,
              OrderStatus.ready,
              OrderStatus.delivered,
            ],
          },
        },
        include: {
          customer: true,
          location: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: [
          { customerId: 'asc' },
          { locationId: 'asc' },
          { deliveryAt: 'asc' },
        ],
      }),
      this.prisma.setting.findMany(),
    ]);

    const settingsMap = new Map(
      settingsRows.map((s) => [s.settingKey, s.settingValue]),
    );

    const groupedByCustomer = new Map<
      number,
      {
        customerId: number;
        customerCode: string;
        customerName: string;
        taxCode: string | null;
        locations: Map<
          number,
          {
            locationId: number;
            locationName: string;
            address: string;
            receiverName: string | null;
            receiverPhone: string | null;
            orders: Array<{
              orderId: string;
              orderCode: string;
              status: OrderStatus;
              deliveryAt: string;
              totalBeforeVat: string;
              totalVat: string;
              totalAmount: string;
              items: Array<{
                orderItemId: string;
                productCode: string;
                productName: string;
                unit: string;
                qtyOrdered: string;
                unitPrice: string;
                vatRate: string;
              }>;
            }>;
          }
        >;
      }
    >();

    for (const o of orders) {
      if (!groupedByCustomer.has(o.customerId)) {
        groupedByCustomer.set(o.customerId, {
          customerId: o.customerId,
          customerCode: o.customer.code,
          customerName: o.customer.name,
          taxCode: o.customer.taxCode,
          locations: new Map(),
        });
      }

      const custEntry = groupedByCustomer.get(o.customerId)!;
      if (!custEntry.locations.has(o.locationId)) {
        custEntry.locations.set(o.locationId, {
          locationId: o.locationId,
          locationName: o.location.name,
          address: o.location.address,
          receiverName: o.location.receiverName,
          receiverPhone: o.location.receiverPhone,
          orders: [],
        });
      }

      custEntry.locations.get(o.locationId)!.orders.push({
        orderId: o.id.toString(),
        orderCode: o.code,
        status: o.status,
        deliveryAt: o.deliveryAt.toISOString(),
        totalBeforeVat: o.totalBeforeVat.toFixed(2),
        totalVat: o.totalVat.toFixed(2),
        totalAmount: o.totalAmount.toFixed(2),
        items: o.items.map((item) => ({
          orderItemId: item.id.toString(),
          productCode: item.product.code,
          productName: item.product.name,
          unit: item.product.unit,
          qtyOrdered: item.qtyOrdered.toFixed(3),
          unitPrice: item.unitPrice.toFixed(2),
          vatRate: item.vatRate.toFixed(2),
        })),
      });
    }

    return {
      date: dayStart.toISOString().slice(0, 10),
      totalOrdersCount: orders.length,
      invoicePrintTemplate: {
        companyName:
          settingsMap.get('company_name') ??
          'CÔNG TY TNHH SẢN XUẤT & THỰC PHẨM VIỆT THẮNG',
        companyTaxCode: settingsMap.get('company_tax_code') ?? '0316889900',
        companyAddress:
          settingsMap.get('company_address') ??
          'KCN Tân Bình, Quận Tân Phú, TP. Hồ Chí Minh',
        companyPhone: settingsMap.get('company_phone') ?? '1900 6868',
        logoUrl:
          settingsMap.get('invoice_logo_url') ?? '/assets/logo-vietthang.png',
        footerText:
          settingsMap.get('invoice_footer') ??
          'Quý khách vui lòng kiểm đếm kỹ số lượng thực giao và ký xác nhận.',
        signatures: ['Người lập phiếu', 'Thủ kho / Giao nhận', 'Khách hàng nhận'],
      },
      customers: Array.from(groupedByCustomer.values()).map((c) => ({
        customerId: c.customerId,
        customerCode: c.customerCode,
        customerName: c.customerName,
        taxCode: c.taxCode,
        locations: Array.from(c.locations.values()),
      })),
    };
  }

  /**
   * Trang 5: Giao hàng (Deliver Order) trong Database Transaction (Quy tắc 3.2 & 6.3):
   * - Sinh mã phiếu xuất kho tự động theo tiền tố cấu hình (PXK-YYYYMMDD-XXX).
   * - Xuất kho thành phẩm thực tế (stock_movements: export_delivery).
   * - Tính tổng tiền, thuế VAT và công nợ khách hàng theo SỐ LƯỢNG THỰC GIAO (qty_delivered).
   * - Nếu thực_giao < đặt_hàng và chọn short_action = 'compensate', tự động sinh Đơn bù (order_type = 'compensation', parent_order_id = order.id).
   */
  async deliverOrder(orderId: number, dto: DeliverOrderDto, userId: number) {
    const orderBigIntId = BigInt(orderId);

    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderBigIntId, isHidden: false },
          include: { items: true },
        });

        if (!order) {
          throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
        }

        if (
          order.status !== OrderStatus.ready &&
          order.status !== OrderStatus.approved
        ) {
          throw new BadRequestException(
            `Chỉ có thể xuất giao đơn hàng ở trạng thái 'ready' hoặc 'approved' (hiện tại: '${order.status}').`,
          );
        }

        const deliveryItemMap = new Map(
          dto.items.map((i) => [BigInt(i.orderItemId), i]),
        );

        const compensationItemsToCreate: Array<{
          sourceOrderItemId: bigint;
          productId: number;
          qtyShort: Prisma.Decimal;
          unitPrice: Prisma.Decimal;
          vatRate: Prisma.Decimal;
        }> = [];

        const now = new Date();
        const deliveryCode = await this.generateNextInvoiceCode(tx, now);

        let deliveredBeforeVat = ZERO_DEC;
        let deliveredVat = ZERO_DEC;

        for (const item of order.items) {
          const input = deliveryItemMap.get(item.id);
          if (!input) {
            throw new BadRequestException(
              `Thiếu thông tin giao hàng cho dòng sản phẩm ID #${item.id.toString()}.`,
            );
          }

          const qtyDelivered = new Prisma.Decimal(input.qtyDelivered);
          if (qtyDelivered.lt(ZERO_DEC) || qtyDelivered.gt(item.qtyOrdered)) {
            throw new BadRequestException(
              `Số lượng giao thực tế (${qtyDelivered.toFixed(3)}) không hợp lệ so với số lượng đặt (${item.qtyOrdered.toFixed(3)}).`,
            );
          }

          // Cộng dồn doanh thu & công nợ thực tế theo số lượng thực giao (qtyDelivered)
          const lineDeliveredBefore = qtyDelivered
            .mul(item.unitPrice)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          const lineDeliveredVat = lineDeliveredBefore
            .mul(item.vatRate)
            .div(HUNDRED_DEC)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

          deliveredBeforeVat = deliveredBeforeVat.add(lineDeliveredBefore);
          deliveredVat = deliveredVat.add(lineDeliveredVat);

          const qtyShort = item.qtyOrdered.sub(qtyDelivered);
          let shortAction: ShortAction | null = null;

          if (qtyShort.gt(ZERO_DEC)) {
            if (!input.shortAction) {
              throw new BadRequestException(
                `Dòng sản phẩm #${item.id.toString()} giao thiếu ${qtyShort.toFixed(3)} nhưng chưa chọn hướng xử lý ('compensate' hoặc 'close').`,
              );
            }
            shortAction = input.shortAction;

            if (
              shortAction === ShortAction.close &&
              (!input.shortCloseReason || !input.shortCloseReason.trim())
            ) {
              throw new BadRequestException(
                `Bắt buộc nhập lý do đóng thiếu (shortCloseReason) khi chọn 'close'.`,
              );
            }

            if (shortAction === ShortAction.compensate) {
              compensationItemsToCreate.push({
                sourceOrderItemId: item.id,
                productId: item.productId,
                qtyShort,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate,
              });
            }
          }

          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              qtyDelivered,
              qtyShort,
              shortAction,
              shortCloseReason: input.shortCloseReason ?? null,
            },
          });

          // Ghi thẻ kho xuất giao hàng (export_delivery) nếu số lượng giao > 0
          if (qtyDelivered.gt(ZERO_DEC)) {
            await tx.stockMovement.create({
              data: {
                movementDate: now,
                movementType: StockMovementType.export_delivery,
                productId: item.productId,
                qty: qtyDelivered,
                refTable: 'orders',
                refId: order.id,
                note: `Xuất giao đơn hàng ${order.code} (${deliveryCode})`,
                createdBy: userId,
              },
            });
          }
        }

        // Nếu có mặt hàng chọn giao bù (compensate) -> Tự động tạo đơn bù (order_type = 'compensation')
        let compensationOrderId: bigint | null = null;
        let compensationOrderCode: string | null = null;

        if (compensationItemsToCreate.length > 0) {
          let compBeforeVat = ZERO_DEC;
          let compVat = ZERO_DEC;

          for (const ci of compensationItemsToCreate) {
            const lineBefore = ci.qtyShort.mul(ci.unitPrice);
            const lineVat = lineBefore.mul(ci.vatRate).div(HUNDRED_DEC);
            compBeforeVat = compBeforeVat.add(lineBefore);
            compVat = compVat.add(lineVat);
          }

          const roundedBefore = compBeforeVat.toDecimalPlaces(
            2,
            Prisma.Decimal.ROUND_HALF_UP,
          );
          const roundedVat = compVat.toDecimalPlaces(
            2,
            Prisma.Decimal.ROUND_HALF_UP,
          );

          compensationOrderCode = `${order.code}-BU`;
          const compDeliveryAt = dto.compensationDeliveryAt
            ? new Date(dto.compensationDeliveryAt)
            : new Date(now.getTime() + 24 * 60 * 60 * 1000);

          const compOrder = await tx.order.create({
            data: {
              code: compensationOrderCode,
              orderType: OrderType.compensation,
              parentOrderId: order.id,
              customerId: order.customerId,
              locationId: order.locationId,
              orderDate: now,
              deliveryAt: compDeliveryAt,
              status: OrderStatus.pending,
              note: `Đơn giao bù tự động từ đơn gốc ${order.code}`,
              totalBeforeVat: roundedBefore,
              totalVat: roundedVat,
              totalAmount: roundedBefore.add(roundedVat),
              createdBy: userId,
              items: {
                create: compensationItemsToCreate.map((ci) => ({
                  productId: ci.productId,
                  qtyOrdered: ci.qtyShort,
                  unitPrice: ci.unitPrice,
                  vatRate: ci.vatRate,
                  note: `Bù hàng thiếu từ đơn ${order.code}`,
                })),
              },
            },
          });

          compensationOrderId = compOrder.id;

          // Liên kết make_up_order_id trên các dòng order_items bị thiếu của đơn gốc
          for (const ci of compensationItemsToCreate) {
            await tx.orderItem.update({
              where: { id: ci.sourceOrderItemId },
              data: { makeUpOrderId: compOrder.id },
            });
          }
        }

        const finalBeforeVat = deliveredBeforeVat.toDecimalPlaces(
          2,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        const finalVat = deliveredVat.toDecimalPlaces(
          2,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        const finalTotalAmount = finalBeforeVat.add(finalVat);

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.delivered,
            deliveryCode,
            deliveredAt: now,
            totalBeforeVat: finalBeforeVat,
            totalVat: finalVat,
            totalAmount: finalTotalAmount,
          },
        });

        return {
          orderId: order.id.toString(),
          orderCode: order.code,
          status: OrderStatus.delivered,
          deliveryCode,
          deliveredAt: now.toISOString(),
          totalBeforeVat: finalBeforeVat.toFixed(2),
          totalVat: finalVat.toFixed(2),
          totalAmount: finalTotalAmount.toFixed(2),
          compensationOrderId: compensationOrderId?.toString() ?? null,
          compensationOrderCode,
          message: compensationOrderCode
            ? `Đã xuất giao đơn ${order.code} (${deliveryCode}) và tự động khởi tạo đơn bù ${compensationOrderCode}.`
            : `Đã xuất giao hoàn tất đơn hàng ${order.code} (${deliveryCode}).`,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  /**
   * Sinh mã đơn hàng tự động gọn: Năm(2 số)Tháng(2 số) + STT tăng dần trong tháng (VD: DH2611-0001).
   * Qua tháng mới tự động reset lại từ 0001.
   */
  private async generateNextOrderCode(
    tx: Prisma.TransactionClient,
    orderDateStr: string,
  ): Promise<string> {
    const d = new Date(orderDateStr);
    const year2 = String(d.getFullYear()).slice(-2);
    const month2 = String(d.getMonth() + 1).padStart(2, '0');
    const ym = `${year2}${month2}`;

    const prefixRow = await tx.setting?.findUnique?.({
      where: { settingKey: 'order_prefix' },
    });
    const orderPrefix = prefixRow?.settingValue?.trim() || 'DH';
    const basePrefix = `${orderPrefix}${ym}-`;

    const existingThisMonth = await tx.order?.findMany?.({
      where: {
        code: { startsWith: basePrefix },
      },
      select: { code: true },
    });

    let maxSeq = 0;
    for (const row of existingThisMonth ?? []) {
      const suffix = row.code.slice(basePrefix.length).split('-')[0];
      const num = parseInt(suffix, 10);
      if (!Number.isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${basePrefix}${nextSeq}`;
  }

  /**
   * Sinh mã phiếu xuất kho tự động gọn: Năm(2 số)Tháng(2 số) + STT tăng dần trong tháng (VD: PXK2611-0001).
   * Qua tháng mới tự động reset lại từ 0001.
   */
  private async generateNextInvoiceCode(
    tx: Prisma.TransactionClient,
    dateObj: Date,
  ): Promise<string> {
    const year2 = String(dateObj.getFullYear()).slice(-2);
    const month2 = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ym = `${year2}${month2}`;

    const prefixRow = await tx.setting?.findUnique?.({
      where: { settingKey: 'invoice_prefix' },
    });
    const invoicePrefix = prefixRow?.settingValue?.trim() || 'PXK';
    const basePrefix = `${invoicePrefix}${ym}-`;

    const existingInvoices = await tx.order?.findMany?.({
      where: {
        deliveryCode: { startsWith: basePrefix },
      },
      select: { deliveryCode: true },
    });

    let maxSeq = 0;
    for (const row of existingInvoices ?? []) {
      if (!row.deliveryCode) continue;
      const suffix = row.deliveryCode.slice(basePrefix.length);
      const num = parseInt(suffix, 10);
      if (!Number.isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${basePrefix}${nextSeq}`;
  }
}
