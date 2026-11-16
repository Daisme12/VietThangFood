import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CheckLevel,
  OrderStatus,
  Prisma,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {ApproveOrderResultDto,
  MaterialShortageDetail,
  OrderItemAllocationSummary,
} from './dto/order-approval.dto';

type PrismaTransactionClient = Prisma.TransactionClient;

const ZERO_DEC = new Prisma.Decimal(0);

@Injectable()
export class OrderApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Duyệt đơn hàng theo thuật toán Xanh - Vàng - Đỏ trong Database Transaction (Serializable).
   * - Xanh (green): Đủ tồn kho thành phẩm khả dụng cho toàn bộ mặt hàng.
   * - Vàng (yellow): Thiếu thành phẩm nhưng đủ tồn kho nguyên liệu (theo BOM recipe_items) để sản xuất phần thiếu.
   * - Đỏ (red): Thiếu nguyên liệu để sản xuất phần thành phẩm thiếu -> chuyển status = 'blocked' và trả về chi tiết nguyên liệu thiếu.
   */
  async approveOrder(
    orderId: number,
    userId: number,
  ): Promise<ApproveOrderResultDto> {
    const orderBigIntId = BigInt(orderId);

    return this.prisma.$transaction(
      async (tx: PrismaTransactionClient): Promise<ApproveOrderResultDto> => {
        // 1. Khóa dòng đơn hàng cần duyệt (SELECT ... FOR UPDATE) để chống race condition khi nhiều người duyệt cùng lúc
        await tx.$executeRaw`SELECT id FROM orders WHERE id = ${orderBigIntId} FOR UPDATE`;

        // 2. Truy vấn thông tin đơn hàng, các dòng sản phẩm và định mức công thức (BOM recipe_items)
        const order = await tx.order.findFirst({
          where: {
            id: orderBigIntId,
            isHidden: false,
          },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    recipeItems: {
                      include: {
                        material: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                id: 'asc',
              },
            },
          },
        });

        if (!order) {
          throw new NotFoundException(
            `Không tìm thấy đơn hàng có ID #${orderId} hoặc đơn hàng đã bị ẩn.`,
          );
        }

        const allowedStatuses: OrderStatus[] = [
          OrderStatus.pending,
          OrderStatus.draft,
          OrderStatus.blocked,
        ];

        if (!allowedStatuses.includes(order.status)) {
          throw new BadRequestException(
            `Đơn hàng ${order.code} đang ở trạng thái '${order.status}', chỉ có thể duyệt đơn ở trạng thái 'pending', 'draft' hoặc 'blocked'.`,
          );
        }

        if (order.items.length === 0) {
          throw new BadRequestException(
            `Đơn hàng ${order.code} không có sản phẩm nào để duyệt.`,
          );
        }

        // 3. Tính tồn kho thành phẩm khả dụng thực tế (Tồn vật lý từ stock_movements - Số lượng đang giữ bởi các đơn đã duyệt khác)
        const productIds = Array.from(
          new Set(order.items.map((item) => item.productId)),
        );

        const availableProductStockMap =
          await this.calculateAvailableProductStockMap(
            tx,
            productIds,
            orderBigIntId,
          );

        // 4. Phân bổ thành phẩm từ kho & tính lượng cần sản xuất cho từng dòng order_items
        const itemAllocations: Array<{
          orderItemId: bigint;
          productId: number;
          productCode: string;
          productName: string;
          unit: string;
          qtyOrdered: Prisma.Decimal;
          availableBefore: Prisma.Decimal;
          qtyFromStock: Prisma.Decimal;
          qtyToProduce: Prisma.Decimal;
          recipeItems: Array<{
            materialId: number;
            materialCode: string;
            materialName: string;
            materialUnit: string;
            bomQty: Prisma.Decimal;
          }>;
        }> = [];

        let hasAnyProductionNeeded = false;

        for (const item of order.items) {
          const currentAvailable =
            availableProductStockMap.get(item.productId) ?? ZERO_DEC;
          const usableStock = Prisma.Decimal.max(ZERO_DEC, currentAvailable);

          // Nếu tồn khả dụng >= số lượng đặt -> lấy toàn bộ từ kho; ngược lại lấy tối đa số khả dụng và phần thiếu đưa vào sản xuất
          const qtyFromStock = Prisma.Decimal.min(item.qtyOrdered, usableStock);
          const qtyToProduce = item.qtyOrdered.sub(qtyFromStock);

          // Giữ tồn kho tức thì trong bộ nhớ đệm cho các dòng tiếp theo của cùng đơn hàng
          availableProductStockMap.set(
            item.productId,
            usableStock.sub(qtyFromStock),
          );

          if (qtyToProduce.gt(ZERO_DEC)) {
            hasAnyProductionNeeded = true;
          }

          itemAllocations.push({
            orderItemId: item.id,
            productId: item.productId,
            productCode: item.product.code,
            productName: item.product.name,
            unit: item.product.unit,
            qtyOrdered: item.qtyOrdered,
            availableBefore: usableStock,
            qtyFromStock,
            qtyToProduce,
            recipeItems: item.product.recipeItems.map((ri) => ({
              materialId: ri.materialId,
              materialCode: ri.material.code,
              materialName: ri.material.name,
              materialUnit: ri.material.unit,
              bomQty: ri.qty,
            })),
          });
        }

        // 5. Nếu cần sản xuất (qtyToProduce > 0), kiểm tra định mức BOM (recipe_items) và tồn kho nguyên liệu khả dụng
        const materialShortages: MaterialShortageDetail[] = [];

        if (hasAnyProductionNeeded) {
          // Gom tổng nhu cầu nguyên liệu của toàn bộ các mặt hàng cần sản xuất trong đơn
          const materialRequirementMap = new Map<
            number,
            {
              materialId: number;
              materialCode: string;
              materialName: string;
              unit: string;
              totalRequiredQty: Prisma.Decimal;
              affectedProducts: Array<{
                productId: number;
                productCode: string;
                productName: string;
                qtyToProduce: string;
                bomQtyPerUnit: string;
                materialRequiredForProduct: string;
              }>;
            }
          >();

          for (const alloc of itemAllocations) {
            if (alloc.qtyToProduce.lte(ZERO_DEC)) {
              continue;
            }

            if (alloc.recipeItems.length === 0) {
              throw new BadRequestException(
                `Sản phẩm "${alloc.productName}" (${alloc.productCode}) thiếu ${alloc.qtyToProduce.toFixed(3)} ${alloc.unit} nhưng chưa được khai báo định mức nguyên liệu (BOM / recipe_items).`,
              );
            }

            for (const recipe of alloc.recipeItems) {
              // Lượng nguyên liệu cần = qtyToProduce (Decimal 15,3) * bomQty (Decimal 15,4)
              const requiredForProduct = alloc.qtyToProduce
                .mul(recipe.bomQty)
                .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);

              const existing = materialRequirementMap.get(recipe.materialId);
              if (existing) {
                existing.totalRequiredQty =
                  existing.totalRequiredQty.add(requiredForProduct);
                existing.affectedProducts.push({
                  productId: alloc.productId,
                  productCode: alloc.productCode,
                  productName: alloc.productName,
                  qtyToProduce: alloc.qtyToProduce.toFixed(3),
                  bomQtyPerUnit: recipe.bomQty.toFixed(4),
                  materialRequiredForProduct: requiredForProduct.toFixed(3),
                });
              } else {
                materialRequirementMap.set(recipe.materialId, {
                  materialId: recipe.materialId,
                  materialCode: recipe.materialCode,
                  materialName: recipe.materialName,
                  unit: recipe.materialUnit,
                  totalRequiredQty: requiredForProduct,
                  affectedProducts: [
                    {
                      productId: alloc.productId,
                      productCode: alloc.productCode,
                      productName: alloc.productName,
                      qtyToProduce: alloc.qtyToProduce.toFixed(3),
                      bomQtyPerUnit: recipe.bomQty.toFixed(4),
                      materialRequiredForProduct: requiredForProduct.toFixed(3),
                    },
                  ],
                });
              }
            }
          }

          const requiredMaterialIds = Array.from(materialRequirementMap.keys());
          const availableMaterialStockMap =
            await this.calculateAvailableMaterialStockMap(
              tx,
              requiredMaterialIds,
              orderBigIntId,
            );

          for (const [materialId, reqInfo] of materialRequirementMap.entries()) {
            const rawAvailable =
              availableMaterialStockMap.get(materialId) ?? ZERO_DEC;
            const usableMaterialStock = Prisma.Decimal.max(
              ZERO_DEC,
              rawAvailable,
            );

            if (usableMaterialStock.lt(reqInfo.totalRequiredQty)) {
              const shortageQty =
                reqInfo.totalRequiredQty.sub(usableMaterialStock);

              materialShortages.push({
                materialId: reqInfo.materialId,
                materialCode: reqInfo.materialCode,
                materialName: reqInfo.materialName,
                unit: reqInfo.unit,
                requiredQty: reqInfo.totalRequiredQty.toFixed(3),
                availableQty: usableMaterialStock.toFixed(3),
                shortageQty: shortageQty.toFixed(3),
                affectedProducts: reqInfo.affectedProducts,
              });
            }
          }
        }

        // 6. Phân định trạng thái check_level (green / yellow / red) và cập nhật DB
        let checkLevel: CheckLevel;
        let nextStatus: 'approved' | 'blocked';
        let resultMessage: string;

        if (!hasAnyProductionNeeded) {
          checkLevel = CheckLevel.green;
          nextStatus = OrderStatus.approved;
          resultMessage = `Đơn hàng ${order.code} đạt trạng thái XANH (Đủ tồn kho thành phẩm). Đã giữ tồn kho và duyệt đơn thành công.`;
        } else if (materialShortages.length === 0) {
          checkLevel = CheckLevel.yellow;
          nextStatus = OrderStatus.approved;
          resultMessage = `Đơn hàng ${order.code} đạt trạng thái VÀNG (Thiếu thành phẩm nhưng đủ nguyên liệu sản xuất). Đã giữ tồn kho và duyệt đơn thành công.`;
        } else {
          checkLevel = CheckLevel.red;
          nextStatus = OrderStatus.approved;
          resultMessage = `Đơn hàng ${order.code} ở trạng thái ĐỎ (Thiếu ${materialShortages.length} loại nguyên liệu sản xuất). Đã xác nhận duyệt và đưa vào kế hoạch sản xuất.`;
        }

        if (
          checkLevel === CheckLevel.green ||
          checkLevel === CheckLevel.yellow
        ) {
          // Cập nhật qty_from_stock và qty_to_produce cho từng dòng order_items (giữ tồn kho tức thì cho đơn approved)
          for (const alloc of itemAllocations) {
            await tx.orderItem.update({
              where: { id: alloc.orderItemId },
              data: {
                qtyFromStock: alloc.qtyFromStock,
                qtyToProduce: alloc.qtyToProduce,
              },
            });
          }

          await tx.order.update({
            where: { id: orderBigIntId },
            data: {
              status: OrderStatus.approved,
              checkLevel,
            },
          });
        } else {
          // Nếu ĐỎ: Người dùng xác nhận duyệt đưa vào kế hoạch sản xuất -> chuyển status = 'approved', ghi nhận qty_to_produce
          for (const alloc of itemAllocations) {
            await tx.orderItem.update({
              where: { id: alloc.orderItemId },
              data: {
                qtyFromStock: ZERO_DEC,
                qtyToProduce: alloc.qtyToProduce,
              },
            });
          }

          await tx.order.update({
            where: { id: orderBigIntId },
            data: {
              status: OrderStatus.approved,
              checkLevel: CheckLevel.red,
            },
          });
        }

        const allocationSummaries: OrderItemAllocationSummary[] =
          itemAllocations.map((alloc) => ({
            orderItemId: alloc.orderItemId.toString(),
            productId: alloc.productId,
            productCode: alloc.productCode,
            productName: alloc.productName,
            unit: alloc.unit,
            qtyOrdered: alloc.qtyOrdered.toFixed(3),
            availableProductStockBefore: alloc.availableBefore.toFixed(3),
            qtyFromStock:
              checkLevel === CheckLevel.red
                ? ZERO_DEC.toFixed(3)
                : alloc.qtyFromStock.toFixed(3),
            qtyToProduce: alloc.qtyToProduce.toFixed(3),
          }));

        return {
          orderId: order.id.toString(),
          orderCode: order.code,
          previousStatus: order.status,
          status: nextStatus,
          checkLevel,
          approvedBy: userId,
          evaluatedAt: new Date().toISOString(),
          itemAllocations: allocationSummaries,
          materialShortages,
          message: resultMessage,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      },
    );
  }

  /**
   * Lấy danh sách đơn chờ duyệt (pending / blocked) kèm đánh giá nhanh trạng thái Xanh - Vàng - Đỏ.
   */
  async getPendingOrdersWithStockPreview() {
    const orders = await this.prisma.order.findMany({
      where: {
        isHidden: false,
        status: {
          in: [OrderStatus.pending, OrderStatus.blocked, OrderStatus.draft],
        },
      },
      include: {
        customer: true,
        location: true,
        parentOrder: {
          select: {
            code: true,
          },
        },
        items: {
          include: {
            product: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: [{ deliveryAt: 'asc' }, { id: 'asc' }],
    });

    return orders.map((order) => ({
      id: order.id.toString(),
      code: order.code,
      orderType: order.orderType,
      parentOrderCode: order.parentOrder?.code ?? null,
      customerId: order.customerId,
      customerCode: order.customer.code,
      customerName: order.customer.name,
      locationId: order.locationId,
      locationName: order.location.name,
      locationAddress: order.location.address,
      orderDate: order.orderDate.toISOString().slice(0, 10),
      deliveryAt: order.deliveryAt.toISOString(),
      status: order.status,
      checkLevel: order.checkLevel ?? CheckLevel.green,
      totalBeforeVat: order.totalBeforeVat.toFixed(2),
      totalVat: order.totalVat.toFixed(2),
      totalAmount: order.totalAmount.toFixed(2),
      note: order.note,
      items: order.items.map((item) => ({
        id: item.id.toString(),
        productId: item.productId,
        productCode: item.product.code,
        productName: item.product.name,
        packageSpec: item.product.packageSpec,
        unit: item.product.unit,
        qtyOrdered: item.qtyOrdered.toFixed(3),
        unitPrice: item.unitPrice.toFixed(2),
        vatRate: item.vatRate.toFixed(2),
        qtyFromStock: item.qtyFromStock.toFixed(3),
        qtyToProduce: item.qtyToProduce.toFixed(3),
      })),
      materialShortages: [],
    }));
  }

  /**
   * Duyệt hàng loạt toàn bộ đơn hàng đủ điều kiện Xanh & Vàng theo đúng Quy tắc 3.1 (activity.md):
   * 1. Đơn có thời hạn giao trong ngưỡng cấu hình khẩn cấp (24h hoặc 48h) được duyệt trước.
   * 2. Các đơn còn lại xét theo thứ tự thời gian tạo sớm hơn (created_at ASC).
   * Sau mỗi đơn được duyệt, hệ thống giữ tồn kho ngay lập tức trước khi xét đơn tiếp theo.
   */
  async approveAllGreenAndYellowOrders(
    userId: number,
    orderIds?: number[],
  ): Promise<{
    approvedOrders: ApproveOrderResultDto[];
    blockedOrders: ApproveOrderResultDto[];
  }> {
    const urgentSetting = await this.prisma.setting.findUnique({
      where: { settingKey: 'urgent_hours_threshold' },
    });
    const urgentHours = urgentSetting
      ? Number(urgentSetting.settingValue) || 24
      : 24;
    const urgentCutoff = new Date(Date.now() + urgentHours * 3600 * 1000);

    const targetOrders = await this.prisma.order.findMany({
      where: {
        isHidden: false,
        status: {
          in: [OrderStatus.pending, OrderStatus.draft],
        },
        ...(orderIds && orderIds.length > 0
          ? { id: { in: orderIds.map((id) => BigInt(id)) } }
          : {}),
      },
      select: {
        id: true,
        deliveryAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    // Sắp xếp theo Quy tắc 3.1: Đơn khẩn cấp (deliveryAt <= urgentCutoff) lên trước, sau đó theo createdAt ASC
    const sortedTargets = [...targetOrders].sort((a, b) => {
      const aUrgent = a.deliveryAt.getTime() <= urgentCutoff.getTime() ? 0 : 1;
      const bUrgent = b.deliveryAt.getTime() <= urgentCutoff.getTime() ? 0 : 1;
      if (aUrgent !== bUrgent) {
        return aUrgent - bUrgent;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const approvedOrders: ApproveOrderResultDto[] = [];
    const blockedOrders: ApproveOrderResultDto[] = [];

    for (const target of sortedTargets) {
      const result = await this.approveOrder(Number(target.id), userId);
      if (result.status === 'approved') {
        approvedOrders.push(result);
      } else {
        blockedOrders.push(result);
      }
    }

    return {
      approvedOrders,
      blockedOrders,
    };
  }

  /**
   * Tính tồn kho thành phẩm khả dụng thực tế cho danh sách productIds:
   * Tồn khả dụng = (Tổng nhập/sản xuất - Tổng xuất/hao hụt trong stock_movements)
   *              - (Tổng qty_from_stock của các đơn đã duyệt nhưng chưa giao hàng)
   */
  private async calculateAvailableProductStockMap(
    tx: PrismaTransactionClient,
    productIds: number[],
    excludeOrderId: bigint,
  ): Promise<Map<number, Prisma.Decimal>> {
    const stockMap = new Map<number, Prisma.Decimal>();
    for (const id of productIds) {
      stockMap.set(id, ZERO_DEC);
    }

    if (productIds.length === 0) {
      return stockMap;
    }

    // 1. Tổng hợp biến động vật lý từ bảng stock_movements
    const movements = await tx.stockMovement.groupBy({
      by: ['productId', 'movementType'],
      where: {
        productId: { in: productIds },
      },
      _sum: {
        qty: true,
      },
    });

    for (const row of movements) {
      if (row.productId === null) {
        continue;
      }
      const sumQty = row._sum.qty ?? ZERO_DEC;
      const current = stockMap.get(row.productId) ?? ZERO_DEC;
      const delta = this.resolveMovementSignedQty(row.movementType, sumQty);
      stockMap.set(row.productId, current.add(delta));
    }

    // 2. Trừ đi lượng thành phẩm đang được giữ (reserved) bởi các đơn hàng khác đã duyệt (approved / in_production / ready)
    const reservedItems = await tx.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        orderId: { not: excludeOrderId },
        order: {
          isHidden: false,
          status: {
            in: [
              OrderStatus.approved,
              OrderStatus.in_production,
              OrderStatus.ready,
            ],
          },
        },
      },
      _sum: {
        qtyFromStock: true,
      },
    });

    for (const reserved of reservedItems) {
      const reservedQty = reserved._sum.qtyFromStock ?? ZERO_DEC;
      const current = stockMap.get(reserved.productId) ?? ZERO_DEC;
      stockMap.set(reserved.productId, current.sub(reservedQty));
    }

    return stockMap;
  }

  /**
   * Tính tồn kho nguyên liệu khả dụng thực tế cho danh sách materialIds:
   * Tồn nguyên liệu khả dụng = (Tồn vật lý trong stock_movements)
   *                          - (Lượng nguyên liệu đã giữ bởi các đơn 'approved' chưa xuất kho sản xuất)
   */
  private async calculateAvailableMaterialStockMap(
    tx: PrismaTransactionClient,
    materialIds: number[],
    excludeOrderId: bigint,
  ): Promise<Map<number, Prisma.Decimal>> {
    const materialStockMap = new Map<number, Prisma.Decimal>();
    for (const id of materialIds) {
      materialStockMap.set(id, ZERO_DEC);
    }

    if (materialIds.length === 0) {
      return materialStockMap;
    }

    // 1. Tổng hợp biến động vật lý của nguyên liệu từ bảng stock_movements
    const movements = await tx.stockMovement.groupBy({
      by: ['materialId', 'movementType'],
      where: {
        materialId: { in: materialIds },
      },
      _sum: {
        qty: true,
      },
    });

    for (const row of movements) {
      if (row.materialId === null) {
        continue;
      }
      const sumQty = row._sum.qty ?? ZERO_DEC;
      const current = materialStockMap.get(row.materialId) ?? ZERO_DEC;
      const delta = this.resolveMovementSignedQty(row.movementType, sumQty);
      materialStockMap.set(row.materialId, current.add(delta));
    }

    // 2. Trừ đi lượng nguyên liệu đang được cam kết giữ cho các đơn hàng đã 'approved' (chờ đưa vào sản xuất)
    const activeApprovedItems = await tx.orderItem.findMany({
      where: {
        orderId: { not: excludeOrderId },
        qtyToProduce: { gt: ZERO_DEC },
        order: {
          isHidden: false,
          status: OrderStatus.approved,
        },
        product: {
          recipeItems: {
            some: {
              materialId: { in: materialIds },
            },
          },
        },
      },
      select: {
        qtyToProduce: true,
        product: {
          select: {
            recipeItems: {
              where: {
                materialId: { in: materialIds },
              },
              select: {
                materialId: true,
                qty: true,
              },
            },
          },
        },
      },
    });

    for (const activeItem of activeApprovedItems) {
      for (const recipe of activeItem.product.recipeItems) {
        const reservedMaterialQty = activeItem.qtyToProduce
          .mul(recipe.qty)
          .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
        const current = materialStockMap.get(recipe.materialId) ?? ZERO_DEC;
        materialStockMap.set(
          recipe.materialId,
          current.sub(reservedMaterialQty),
        );
      }
    }

    return materialStockMap;
  }

  /**
   * Chuẩn hóa dấu (+/-) của số lượng theo loại giao dịch kho (StockMovementType).
   */
  private resolveMovementSignedQty(
    movementType: StockMovementType,
    rawQty: Prisma.Decimal,
  ): Prisma.Decimal {
    switch (movementType) {
      case StockMovementType.import:
      case StockMovementType.production_in:
        return rawQty.abs();
      case StockMovementType.production_out:
      case StockMovementType.export_delivery:
      case StockMovementType.waste_loss:
        return rawQty.abs().neg();
      case StockMovementType.adjustment:
        // Với kiểm kê / điều chỉnh (adjustment), giữ nguyên dấu âm/dương của bản ghi
        return rawQty;
    }
  }
}
