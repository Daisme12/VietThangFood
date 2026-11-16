import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordActualProductionDto } from './dto/production.dto';

const ZERO_DEC = new Prisma.Decimal(0);

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trang 7 (Mục 3.3): Tính bảng Tổng sản xuất ngày của Bếp theo công thức bắt buộc:
   * Cần sản xuất = max(0, Tổng số lượng đơn hôm nay + Định mức an toàn - Tồn thành phẩm đầu ngày)
   * Kèm bảng danh sách nguyên vật liệu cần chuẩn bị theo BOM.
   */
  async getDailyProductionPlan(dateStr?: string) {
    const targetDateStr =
      dateStr?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${targetDateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${targetDateStr}T23:59:59.999Z`);

    const [
      products,
      todayOrderItems,
      openingProductMovements,
      allMaterialMovements,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { isHidden: false },
        include: {
          category: true,
          recipeItems: {
            include: {
              material: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: {
            isHidden: false,
            deliveryAt: {
              gte: dayStart,
              lte: dayEnd,
            },
            status: {
              notIn: [OrderStatus.cancelled, OrderStatus.draft],
            },
          },
        },
        select: {
          productId: true,
          qtyOrdered: true,
        },
      }),
      // Tồn thành phẩm đầu ngày = Tổng biến động trước 00:00:00 của ngày xét
      this.prisma.stockMovement.groupBy({
        by: ['productId', 'movementType'],
        where: {
          productId: { not: null },
          movementDate: { lt: dayStart },
        },
        _sum: { qty: true },
      }),
      // Tồn nguyên vật liệu hiện tại
      this.prisma.stockMovement.groupBy({
        by: ['materialId', 'movementType'],
        where: {
          materialId: { not: null },
        },
        _sum: { qty: true },
      }),
    ]);

    // 1. Tổng số lượng đơn hôm nay theo từng thành phẩm
    const todayOrderQtyMap = new Map<number, Prisma.Decimal>();
    for (const item of todayOrderItems) {
      const current = todayOrderQtyMap.get(item.productId) ?? ZERO_DEC;
      todayOrderQtyMap.set(item.productId, current.add(item.qtyOrdered));
    }

    // 2. Tồn thành phẩm đầu ngày
    const openingProductStockMap = new Map<number, Prisma.Decimal>();
    for (const mov of openingProductMovements) {
      if (mov.productId === null) continue;
      const sumQty = mov._sum.qty ?? ZERO_DEC;
      const current = openingProductStockMap.get(mov.productId) ?? ZERO_DEC;
      const signed = this.resolveSignedMovement(mov.movementType, sumQty);
      openingProductStockMap.set(mov.productId, current.add(signed));
    }

    // 3. Tồn nguyên liệu hiện tại
    const currentMaterialStockMap = new Map<number, Prisma.Decimal>();
    for (const mov of allMaterialMovements) {
      if (mov.materialId === null) continue;
      const sumQty = mov._sum.qty ?? ZERO_DEC;
      const current = currentMaterialStockMap.get(mov.materialId) ?? ZERO_DEC;
      const signed = this.resolveSignedMovement(mov.movementType, sumQty);
      currentMaterialStockMap.set(mov.materialId, current.add(signed));
    }

    // 4. Tính Cần sản xuất & Gom tổng nguyên liệu cần chuẩn bị
    const materialPreparationMap = new Map<
      number,
      {
        materialId: number;
        materialCode: string;
        materialName: string;
        unit: string;
        totalRequiredQty: Prisma.Decimal;
        currentStockQty: Prisma.Decimal;
      }
    >();

    const productPlanRows = products.map((product) => {
      const todayOrdersQty = todayOrderQtyMap.get(product.id) ?? ZERO_DEC;
      const safetyStockQty = product.safetyStock ?? ZERO_DEC;
      const openingStockQty = Prisma.Decimal.max(
        ZERO_DEC,
        openingProductStockMap.get(product.id) ?? ZERO_DEC,
      );

      // Công thức Mục 3.3: Cần sản xuất = max(0, Tổng số lượng đơn hôm nay + Định mức an toàn - Tồn thành phẩm đầu ngày)
      const rawNeeded = todayOrdersQty
        .add(safetyStockQty)
        .sub(openingStockQty);
      const qtyToProduce = Prisma.Decimal.max(ZERO_DEC, rawNeeded);

      if (qtyToProduce.gt(ZERO_DEC)) {
        for (const ri of product.recipeItems) {
          const matRequired = qtyToProduce
            .mul(ri.qty)
            .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
          const existing = materialPreparationMap.get(ri.materialId);
          if (existing) {
            existing.totalRequiredQty =
              existing.totalRequiredQty.add(matRequired);
          } else {
            materialPreparationMap.set(ri.materialId, {
              materialId: ri.materialId,
              materialCode: ri.material.code,
              materialName: ri.material.name,
              unit: ri.material.unit,
              totalRequiredQty: matRequired,
              currentStockQty:
                currentMaterialStockMap.get(ri.materialId) ?? ZERO_DEC,
            });
          }
        }
      }

      return {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        categoryName: product.category.name,
        unit: product.unit,
        todayOrderQty: todayOrdersQty.toFixed(3),
        safetyStockQty: safetyStockQty.toFixed(3),
        openingStockQty: openingStockQty.toFixed(3),
        qtyToProduce: qtyToProduce.toFixed(3),
      };
    });

    const materialsRequired = Array.from(materialPreparationMap.values()).map(
      (m) => {
        const shortage = Prisma.Decimal.max(
          ZERO_DEC,
          m.totalRequiredQty.sub(m.currentStockQty),
        );
        return {
          materialId: m.materialId,
          materialCode: m.materialCode,
          materialName: m.materialName,
          unit: m.unit,
          requiredQty: m.totalRequiredQty.toFixed(3),
          currentStockQty: m.currentStockQty.toFixed(3),
          shortageQty: shortage.toFixed(3),
          isShortage: shortage.gt(ZERO_DEC),
        };
      },
    );

    return {
      date: targetDateStr,
      formula:
        'Cần sản xuất = max(0, Tổng số lượng đơn hôm nay + Định mức an toàn - Tồn thành phẩm đầu ngày)',
      products: productPlanRows,
      materialsRequired,
    };
  }

  /**
   * Trang 8 (Mục 3.3): Ghi nhận sản xuất thực tế của Bếp trong Database Transaction:
   * - Cộng tồn kho thành phẩm (production_in).
   * - Tự động trừ tồn kho nguyên vật liệu tương ứng theo tỷ lệ khai báo trong BOM (production_out).
   * - Cảnh báo ngay lập tức nếu kho nguyên liệu bị âm.
   */
  async recordActualProduction(dto: RecordActualProductionDto, userId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findFirst({
          where: { id: dto.productId, isHidden: false },
          include: {
            recipeItems: {
              include: {
                material: true,
              },
            },
          },
        });

        if (!product) {
          throw new NotFoundException(
            `Không tìm thấy thành phẩm ID #${dto.productId}.`,
          );
        }

        if (product.recipeItems.length === 0) {
          throw new BadRequestException(
            `Thành phẩm ${product.name} (${product.code}) chưa khai báo Định mức nguyên liệu (BOM) tại Trang 9.`,
          );
        }

        const actualQtyDec = new Prisma.Decimal(dto.actualQty).toDecimalPlaces(
          3,
        );
        const movementDate = dto.productionDate
          ? new Date(dto.productionDate)
          : new Date();

        // 1. Cộng tồn kho thành phẩm (production_in)
        await tx.stockMovement.create({
          data: {
            movementDate,
            movementType: StockMovementType.production_in,
            productId: product.id,
            qty: actualQtyDec,
            refTable: 'production_batches',
            note:
              dto.note?.trim() ||
              `Ghi nhận sản xuất thực tế ${actualQtyDec.toFixed(3)} ${product.unit} ${product.name}`,
            createdBy: userId,
          },
        });

        // 2. Tự động trừ tồn kho nguyên vật liệu theo BOM (production_out)
        const materialIds = product.recipeItems.map((r) => r.materialId);
        const materialConsumptionDetails: Array<{
          materialId: number;
          materialCode: string;
          materialName: string;
          unit: string;
          bomQtyPerUnit: string;
          consumedQty: string;
          stockAfterDeduction: string;
          isNegativeStock: boolean;
        }> = [];
        const negativeMaterialWarnings: Array<{
          materialId: number;
          materialCode: string;
          materialName: string;
          unit: string;
          negativeBalance: string;
          warningMessage: string;
        }> = [];

        for (const recipe of product.recipeItems) {
          const consumedQty = actualQtyDec
            .mul(recipe.qty)
            .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);

          if (consumedQty.gt(ZERO_DEC)) {
            await tx.stockMovement.create({
              data: {
                movementDate,
                movementType: StockMovementType.production_out,
                materialId: recipe.materialId,
                qty: consumedQty,
                refTable: 'production_batches',
                note: `Khấu trừ BOM nấu ${actualQtyDec.toFixed(3)} ${product.unit} ${product.code}`,
                createdBy: userId,
              },
            });
          }
        }

        // 3. Kiểm tra tồn kho nguyên vật liệu ngay sau khi trừ để cảnh báo tức thì nếu âm kho
        const movementsAfter = await tx.stockMovement.groupBy({
          by: ['materialId', 'movementType'],
          where: {
            materialId: { in: materialIds },
          },
          _sum: { qty: true },
        });

        const stockAfterMap = new Map<number, Prisma.Decimal>();
        for (const id of materialIds) {
          stockAfterMap.set(id, ZERO_DEC);
        }
        for (const row of movementsAfter) {
          if (row.materialId === null) continue;
          const sumQty = row._sum.qty ?? ZERO_DEC;
          const current = stockAfterMap.get(row.materialId) ?? ZERO_DEC;
          const signed = this.resolveSignedMovement(row.movementType, sumQty);
          stockAfterMap.set(row.materialId, current.add(signed));
        }

        for (const recipe of product.recipeItems) {
          const consumedQty = actualQtyDec
            .mul(recipe.qty)
            .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
          const stockAfter = stockAfterMap.get(recipe.materialId) ?? ZERO_DEC;
          const isNegative = stockAfter.lt(ZERO_DEC);

          materialConsumptionDetails.push({
            materialId: recipe.materialId,
            materialCode: recipe.material.code,
            materialName: recipe.material.name,
            unit: recipe.material.unit,
            bomQtyPerUnit: recipe.qty.toFixed(4),
            consumedQty: consumedQty.toFixed(3),
            stockAfterDeduction: stockAfter.toFixed(3),
            isNegativeStock: isNegative,
          });

          if (isNegative) {
            negativeMaterialWarnings.push({
              materialId: recipe.materialId,
              materialCode: recipe.material.code,
              materialName: recipe.material.name,
              unit: recipe.material.unit,
              negativeBalance: stockAfter.toFixed(3),
              warningMessage: `CẢNH BÁO ÂM KHO: Nguyên vật liệu "${recipe.material.name}" (${recipe.material.code}) đang bị âm ${stockAfter.toFixed(3)} ${recipe.material.unit} sau khi trừ BOM!`,
            });
          }
        }

        return {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          unit: product.unit,
          actualQtyProduced: actualQtyDec.toFixed(3),
          recordedAt: movementDate.toISOString(),
          hasNegativeMaterialWarning: negativeMaterialWarnings.length > 0,
          negativeMaterialWarnings,
          materialConsumptionDetails,
          message:
            negativeMaterialWarnings.length > 0
              ? `Đã cộng +${actualQtyDec.toFixed(3)} ${product.unit} ${product.name} và trừ BOM, nhưng có ${negativeMaterialWarnings.length} nguyên vật liệu bị ÂM KHO!`
              : `Đã cộng +${actualQtyDec.toFixed(3)} ${product.unit} ${product.name} và khấu trừ nguyên vật liệu BOM thành công.`,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  /**
   * Bắt đầu sản xuất đơn hàng tại Bếp (chuyển từ approved -> in_production).
   */
  async startOrderProduction(orderId: number) {
    const orderBigIntId = BigInt(orderId);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderBigIntId, isHidden: false },
      });

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
      }

      if (order.status !== OrderStatus.approved) {
        throw new BadRequestException(
          `Chỉ có thể bắt đầu sản xuất đơn ở trạng thái 'approved' (hiện tại: '${order.status}').`,
        );
      }

      const updated = await tx.order.update({
        where: { id: orderBigIntId },
        data: { status: OrderStatus.in_production },
      });

      return {
        orderId: updated.id.toString(),
        orderCode: updated.code,
        status: updated.status,
        message: `Đơn hàng ${updated.code} đã chuyển sang trạng thái 'in_production'.`,
      };
    });
  }

  /**
   * Hoàn tất sản xuất đơn hàng trong Database Transaction (Serializable):
   * - Cấn trừ nguyên liệu theo công thức BOM (stock_movements: production_out).
   * - Nhập kho thành phẩm vừa nấu xong (stock_movements: production_in).
   * - Chuyển toàn bộ lượng đã sản xuất sang sẵn sàng giao (status = 'ready').
   */
  async completeOrderProduction(orderId: number, userId: number) {
    const orderBigIntId = BigInt(orderId);

    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderBigIntId, isHidden: false },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    recipeItems: true,
                  },
                },
              },
            },
          },
        });

        if (!order) {
          throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
        }

        if (
          order.status !== OrderStatus.in_production &&
          order.status !== OrderStatus.approved
        ) {
          throw new BadRequestException(
            `Đơn hàng ${order.code} phải ở trạng thái 'approved' hoặc 'in_production' mới có thể hoàn tất sản xuất.`,
          );
        }

        const now = new Date();

        for (const item of order.items) {
          if (item.qtyToProduce.lte(ZERO_DEC)) {
            continue;
          }

          // 1. Trừ nguyên liệu theo định mức BOM (production_out)
          for (const recipe of item.product.recipeItems) {
            const consumedMaterialQty = item.qtyToProduce
              .mul(recipe.qty)
              .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);

            if (consumedMaterialQty.gt(ZERO_DEC)) {
              await tx.stockMovement.create({
                data: {
                  movementDate: now,
                  movementType: StockMovementType.production_out,
                  materialId: recipe.materialId,
                  qty: consumedMaterialQty,
                  refTable: 'orders',
                  refId: order.id,
                  note: `Xuất nguyên liệu BOM sản xuất SP ${item.product.code} cho đơn ${order.code}`,
                  createdBy: userId,
                },
              });
            }
          }

          // 2. Nhập kho thành phẩm vừa sản xuất xong (production_in)
          await tx.stockMovement.create({
            data: {
              movementDate: now,
              movementType: StockMovementType.production_in,
              productId: item.productId,
              qty: item.qtyToProduce,
              refTable: 'orders',
              refId: order.id,
              note: `Nhập thành phẩm sản xuất xong cho đơn ${order.code}`,
              createdBy: userId,
            },
          });

          // 3. Chuyển lượng đã sản xuất vào qtyFromStock (đang giữ sẵn sàng xuất giao) và đặt qtyToProduce = 0
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              qtyFromStock: item.qtyFromStock.add(item.qtyToProduce),
              qtyToProduce: ZERO_DEC,
            },
          });
        }

        const updated = await tx.order.update({
          where: { id: orderBigIntId },
          data: { status: OrderStatus.ready },
        });

        return {
          orderId: updated.id.toString(),
          orderCode: updated.code,
          status: updated.status,
          message: `Đã hoàn tất sản xuất, trừ kho nguyên liệu BOM và nhập thành phẩm cho đơn ${updated.code}.`,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private resolveSignedMovement(
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
        return rawQty;
    }
  }
}
