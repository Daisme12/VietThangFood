import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePurchaseReceiptDto,
  InventoryReportQueryDto,
  InventoryTargetType,
  PurchaseFilterQueryDto,
  RecordWasteLossDto,
  SubmitDailyStocktakeDto,
} from './dto/inventory.dto';

type PrismaTx = Prisma.TransactionClient;

const ZERO_DEC = new Prisma.Decimal(0);

export interface PurchaseReceiptLineView {
  id: string;
  receiptCode: string;
  receiptDate: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  qty: string;
  unitPrice: string;
  lineTotal: string;
  note: string | null;
}

export interface PurchaseReceiptGroupView {
  receiptCode: string;
  receiptDate: string;
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  totalAmount: string;
  lineCount: number;
  lines: PurchaseReceiptLineView[];
}

export interface StocktakeSheetRow {
  targetType: 'product' | 'material';
  targetId: number;
  code: string;
  name: string;
  unit: string;
  categoryOrSupplierName: string;
  minOrSafetyStock: string;
  systemStock: string;
}

export interface InventoryReportRow {
  targetType: 'product' | 'material';
  id: number;
  code: string;
  name: string;
  unit: string;
  minStock: string;
  openingStock: string;
  importQty: string;
  productionQty: string;
  exportDeliveryQty: string;
  wasteLossQty: string;
  adjustmentQty: string;
  closingStock: string;
  isBelowMinStock: boolean;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // DANH MỤC DÙNG CHUNG CHO FORM KHO (NCC, Nguyên vật liệu, Thành phẩm)
  // ==========================================================================

  async getInventoryCatalogs() {
    const [suppliers, materials, products] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { isHidden: false },
        orderBy: { name: 'asc' },
      }),
      this.prisma.material.findMany({
        where: { isHidden: false },
        include: { supplier: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { isHidden: false },
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      suppliers: suppliers.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        phone: s.phone,
      })),
      materials: materials.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        minStock: m.minStock.toFixed(3),
        supplierId: m.supplierId,
        supplierName: m.supplier?.name ?? null,
      })),
      products: products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        packageSpec: p.packageSpec,
        safetyStock: p.safetyStock.toFixed(3),
        categoryName: p.category.name,
      })),
    };
  }

  // ==========================================================================
  // TRANG 11: DANH SÁCH HÀNG NHẬP & TẠO PHIẾU NHẬP (purchase_items)
  // ==========================================================================

  /**
   * Lấy danh sách phiếu nhập kho (gom nhóm theo receipt_code) kèm bộ lọc:
   * - Khoảng ngày (fromDate, toDate)
   * - Nhà cung cấp (supplierId)
   * - Nguyên liệu (materialId)
   * - Từ khóa mã phiếu / ghi chú (keyword)
   */
  async getPurchaseReceipts(
    query: PurchaseFilterQueryDto,
  ): Promise<PurchaseReceiptGroupView[]> {
    const whereClause: Prisma.PurchaseItemWhereInput = {
      isHidden: false,
    };

    if (query.fromDate || query.toDate) {
      whereClause.receiptDate = {};
      if (query.fromDate) {
        whereClause.receiptDate.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        whereClause.receiptDate.lte = new Date(query.toDate);
      }
    }

    if (query.supplierId) {
      whereClause.supplierId = query.supplierId;
    }

    if (query.materialId) {
      whereClause.materialId = query.materialId;
    }

    if (query.keyword && query.keyword.trim() !== '') {
      const kw = query.keyword.trim();
      whereClause.OR = [
        { receiptCode: { contains: kw } },
        { note: { contains: kw } },
        { supplier: { name: { contains: kw } } },
        { material: { name: { contains: kw } } },
      ];
    }

    const rows = await this.prisma.purchaseItem.findMany({
      where: whereClause,
      include: {
        supplier: true,
        material: true,
        createdByUser: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ receiptDate: 'desc' }, { id: 'desc' }],
    });

    const groupedMap = new Map<
      string,
      {
        receiptCode: string;
        receiptDate: string;
        supplierId: number;
        supplierCode: string;
        supplierName: string;
        createdBy: number;
        createdByName: string;
        createdAt: string;
        totalAmountDec: Prisma.Decimal;
        lines: PurchaseReceiptLineView[];
      }
    >();

    for (const row of rows) {
      const dateStr = row.receiptDate.toISOString().slice(0, 10);
      const lineView: PurchaseReceiptLineView = {
        id: row.id.toString(),
        receiptCode: row.receiptCode,
        receiptDate: dateStr,
        materialId: row.materialId,
        materialCode: row.material.code,
        materialName: row.material.name,
        unit: row.material.unit,
        qty: row.qty.toFixed(3),
        unitPrice: row.unitPrice.toFixed(2),
        lineTotal: row.lineTotal.toFixed(2),
        note: row.note,
      };

      const existing = groupedMap.get(row.receiptCode);
      if (existing) {
        existing.totalAmountDec = existing.totalAmountDec.add(row.lineTotal);
        existing.lines.push(lineView);
      } else {
        groupedMap.set(row.receiptCode, {
          receiptCode: row.receiptCode,
          receiptDate: dateStr,
          supplierId: row.supplierId,
          supplierCode: row.supplier.code,
          supplierName: row.supplier.name,
          createdBy: row.createdBy,
          createdByName: row.createdByUser.fullName,
          createdAt: row.createdAt.toISOString(),
          totalAmountDec: row.lineTotal,
          lines: [lineView],
        });
      }
    }

    return Array.from(groupedMap.values()).map((group) => ({
      receiptCode: group.receiptCode,
      receiptDate: group.receiptDate,
      supplierId: group.supplierId,
      supplierCode: group.supplierCode,
      supplierName: group.supplierName,
      createdBy: group.createdBy,
      createdByName: group.createdByName,
      createdAt: group.createdAt,
      totalAmount: group.totalAmountDec.toFixed(2),
      lineCount: group.lines.length,
      lines: group.lines,
    }));
  }

  /**
   * Tạo phiếu nhập kho nguyên vật liệu trong Database Transaction (Serializable):
   * 1. Lưu từng dòng nguyên liệu vào bảng `purchase_items`.
   * 2. Tự động ghi 1 dòng tương ứng vào `stock_movements` (`movement_type = 'import'`, `ref_table = 'purchase_items'`, `ref_id = purchaseItem.id`) để tăng tồn kho nguyên liệu tức thì.
   */
  async createPurchaseReceipt(
    dto: CreatePurchaseReceiptDto,
    userId: number,
  ): Promise<PurchaseReceiptGroupView> {
    return this.prisma.$transaction(
      async (tx: PrismaTx): Promise<PurchaseReceiptGroupView> => {
        const supplier = await tx.supplier.findFirst({
          where: { id: dto.supplierId, isHidden: false },
        });

        if (!supplier) {
          throw new NotFoundException(
            `Không tìm thấy nhà cung cấp có ID #${dto.supplierId}.`,
          );
        }

        const materialIds = Array.from(
          new Set(dto.items.map((item) => item.materialId)),
        );
        const materials = await tx.material.findMany({
          where: { id: { in: materialIds }, isHidden: false },
        });

        if (materials.length !== materialIds.length) {
          throw new BadRequestException(
            'Một hoặc nhiều nguyên vật liệu trong phiếu nhập không tồn tại hoặc đã bị ẩn.',
          );
        }

        const materialMap = new Map(materials.map((m) => [m.id, m]));

        const receiptDateObj = new Date(dto.receiptDate);
        const compactDate = dto.receiptDate.replace(/-/g, '');
        const receiptCode =
          dto.receiptCode && dto.receiptCode.trim() !== ''
            ? dto.receiptCode.trim().toUpperCase()
            : `PN-${compactDate}-${Date.now().toString().slice(-4)}`;

        let totalReceiptAmount = ZERO_DEC;
        const createdLines: PurchaseReceiptLineView[] = [];

        for (const lineInput of dto.items) {
          const material = materialMap.get(lineInput.materialId)!;
          const qtyDec = new Prisma.Decimal(lineInput.qty).toDecimalPlaces(
            3,
            Prisma.Decimal.ROUND_HALF_UP,
          );
          const unitPriceDec = new Prisma.Decimal(
            lineInput.unitPrice,
          ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

          if (qtyDec.lte(ZERO_DEC)) {
            throw new BadRequestException(
              `Số lượng nhập của nguyên liệu "${material.name}" phải lớn hơn 0.`,
            );
          }

          if (unitPriceDec.lt(ZERO_DEC)) {
            throw new BadRequestException(
              `Đơn giá nhập của nguyên liệu "${material.name}" không được âm.`,
            );
          }

          // Tự tính thành tiền chuẩn Decimal(15, 2)
          const lineTotalDec = qtyDec
            .mul(unitPriceDec)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

          totalReceiptAmount = totalReceiptAmount.add(lineTotalDec);

          // Bước 1: Ghi nhận chi tiết vào bảng purchase_items
          const createdPurchaseItem = await tx.purchaseItem.create({
            data: {
              receiptCode,
              receiptDate: receiptDateObj,
              supplierId: supplier.id,
              materialId: material.id,
              qty: qtyDec,
              unitPrice: unitPriceDec,
              lineTotal: lineTotalDec,
              note: lineInput.note ?? dto.note ?? null,
              createdBy: userId,
            },
          });

          // Bước 2: Tự động ghi 1 dòng vào stock_movements (movement_type = 'import', ref_table = 'purchase_items')
          await tx.stockMovement.create({
            data: {
              movementDate: receiptDateObj,
              movementType: StockMovementType.import,
              productId: null,
              materialId: material.id,
              qty: qtyDec,
              refTable: 'purchase_items',
              refId: createdPurchaseItem.id,
              note: `Nhập kho theo phiếu ${receiptCode} - NCC: ${supplier.name}`,
              createdBy: userId,
            },
          });

          createdLines.push({
            id: createdPurchaseItem.id.toString(),
            receiptCode,
            receiptDate: dto.receiptDate,
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            unit: material.unit,
            qty: qtyDec.toFixed(3),
            unitPrice: unitPriceDec.toFixed(2),
            lineTotal: lineTotalDec.toFixed(2),
            note: createdPurchaseItem.note,
          });
        }

        const creator = await tx.user.findUnique({
          where: { id: userId },
          select: { fullName: true },
        });

        return {
          receiptCode,
          receiptDate: dto.receiptDate,
          supplierId: supplier.id,
          supplierCode: supplier.code,
          supplierName: supplier.name,
          createdBy: userId,
          createdByName: creator?.fullName ?? 'Nhân viên kho',
          createdAt: new Date().toISOString(),
          totalAmount: totalReceiptAmount.toFixed(2),
          lineCount: createdLines.length,
          lines: createdLines,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  // ==========================================================================
  // TRANG 12: KIỂM KÊ CUỐI NGÀY (stock_movements: adjustment)
  // ==========================================================================

  /**
   * Lấy bảng tồn kho hệ thống tính đến ngày kiểm kê để người dùng nhập "Tồn thực tế".
   */
  async getDailyStocktakeSheet(
    stocktakeDateStr?: string,
  ): Promise<{
    stocktakeDate: string;
    products: StocktakeSheetRow[];
    materials: StocktakeSheetRow[];
  }> {
    const targetDateStr =
      stocktakeDateStr ?? new Date().toISOString().slice(0, 10);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

    const [products, materials, productMovements, materialMovements] =
      await Promise.all([
        this.prisma.product.findMany({
          where: { isHidden: false },
          include: { category: true },
          orderBy: { code: 'asc' },
        }),
        this.prisma.material.findMany({
          where: { isHidden: false },
          include: { supplier: true },
          orderBy: { code: 'asc' },
        }),
        this.prisma.stockMovement.groupBy({
          by: ['productId', 'movementType'],
          where: {
            productId: { not: null },
            movementDate: { lte: endOfDay },
          },
          _sum: { qty: true },
        }),
        this.prisma.stockMovement.groupBy({
          by: ['materialId', 'movementType'],
          where: {
            materialId: { not: null },
            movementDate: { lte: endOfDay },
          },
          _sum: { qty: true },
        }),
      ]);

    const productStockMap = new Map<number, Prisma.Decimal>();
    for (const row of productMovements) {
      if (row.productId === null) continue;
      const current = productStockMap.get(row.productId) ?? ZERO_DEC;
      const delta = this.resolveSignedQty(
        row.movementType,
        row._sum.qty ?? ZERO_DEC,
      );
      productStockMap.set(row.productId, current.add(delta));
    }

    const materialStockMap = new Map<number, Prisma.Decimal>();
    for (const row of materialMovements) {
      if (row.materialId === null) continue;
      const current = materialStockMap.get(row.materialId) ?? ZERO_DEC;
      const delta = this.resolveSignedQty(
        row.movementType,
        row._sum.qty ?? ZERO_DEC,
      );
      materialStockMap.set(row.materialId, current.add(delta));
    }

    return {
      stocktakeDate: targetDateStr,
      products: products.map((p) => ({
        targetType: 'product',
        targetId: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        categoryOrSupplierName: p.category.name,
        minOrSafetyStock: p.safetyStock.toFixed(3),
        systemStock: (productStockMap.get(p.id) ?? ZERO_DEC).toFixed(3),
      })),
      materials: materials.map((m) => ({
        targetType: 'material',
        targetId: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        categoryOrSupplierName: m.supplier?.name ?? 'Chưa gán NCC',
        minOrSafetyStock: m.minStock.toFixed(3),
        systemStock: (materialStockMap.get(m.id) ?? ZERO_DEC).toFixed(3),
      })),
    };
  }

  /**
   * Lưu phiếu kiểm kê cuối ngày trong Database Transaction (Serializable):
   * - Tính lại tồn hệ thống của từng mặt hàng tại thời điểm chốt.
   * - Tính chênh lệch: diffQty = actualStock - systemStock.
   * - Nếu diffQty != 0 -> ghi nhận vào `stock_movements` (`movement_type = 'adjustment'`, `qty = diffQty`)
   *   để chốt tồn thực tế làm mốc tồn đầu ngày hôm sau.
   */
  async submitDailyStocktake(dto: SubmitDailyStocktakeDto, userId: number) {
    const movementDateObj = new Date(dto.stocktakeDate);
    const endOfDay = new Date(`${dto.stocktakeDate}T23:59:59.999Z`);

    return this.prisma.$transaction(
      async (tx: PrismaTx) => {
        const adjustmentsCreated: Array<{
          movementId: string;
          targetType: InventoryTargetType;
          targetId: number;
          systemStock: string;
          actualStock: string;
          diffQty: string;
        }> = [];

        for (const item of dto.items) {
          const actualDec = new Prisma.Decimal(item.actualStock).toDecimalPlaces(
            3,
            Prisma.Decimal.ROUND_HALF_UP,
          );

          if (actualDec.lt(ZERO_DEC)) {
            throw new BadRequestException(
              `Tồn thực tế của mặt hàng #${item.targetId} không được nhỏ hơn 0.`,
            );
          }

          // Tính tồn hệ thống hiện tại của mặt hàng trong Transaction
          const groupedMovements = await tx.stockMovement.groupBy({
            by: ['movementType'],
            where: {
              ...(item.targetType === InventoryTargetType.product
                ? { productId: item.targetId }
                : { materialId: item.targetId }),
              movementDate: { lte: endOfDay },
            },
            _sum: { qty: true },
          });

          let systemDec = ZERO_DEC;
          for (const g of groupedMovements) {
            systemDec = systemDec.add(
              this.resolveSignedQty(g.movementType, g._sum.qty ?? ZERO_DEC),
            );
          }

          const diffDec = actualDec.sub(systemDec);

          // Chỉ ghi nhận stock_movements khi có chênh lệch giữa tồn thực tế và tồn hệ thống
          if (!diffDec.eq(ZERO_DEC)) {
            const noteText =
              item.note?.trim() ||
              dto.generalNote?.trim() ||
              `Kiểm kê cuối ngày ${dto.stocktakeDate} (Tồn HT: ${systemDec.toFixed(3)} -> Thực tế: ${actualDec.toFixed(3)})`;

            const createdMovement = await tx.stockMovement.create({
              data: {
                movementDate: movementDateObj,
                movementType: StockMovementType.adjustment,
                productId:
                  item.targetType === InventoryTargetType.product
                    ? item.targetId
                    : null,
                materialId:
                  item.targetType === InventoryTargetType.material
                    ? item.targetId
                    : null,
                qty: diffDec,
                refTable: 'daily_stocktake',
                refId: null,
                note: noteText,
                createdBy: userId,
              },
            });

            adjustmentsCreated.push({
              movementId: createdMovement.id.toString(),
              targetType: item.targetType,
              targetId: item.targetId,
              systemStock: systemDec.toFixed(3),
              actualStock: actualDec.toFixed(3),
              diffQty: diffDec.toFixed(3),
            });
          }
        }

        return {
          stocktakeDate: dto.stocktakeDate,
          totalCheckedItems: dto.items.length,
          adjustedCount: adjustmentsCreated.length,
          adjustments: adjustmentsCreated,
          message:
            adjustmentsCreated.length > 0
              ? `Đã chốt kiểm kê ngày ${dto.stocktakeDate}: Ghi nhận ${adjustmentsCreated.length} bút toán điều chỉnh chênh lệch vào thẻ kho.`
              : `Đã chốt kiểm kê ngày ${dto.stocktakeDate}: Tồn thực tế khớp 100% với tồn hệ thống (0 chênh lệch).`,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  // ==========================================================================
  // TRANG 13: HỦY VÀ HAO HỤT (stock_movements: waste_loss)
  // ==========================================================================

  /**
   * Danh sách lịch sử hủy hàng & hao hụt.
   */
  async getWasteLossHistory(fromDate?: string, toDate?: string) {
    const whereClause: Prisma.StockMovementWhereInput = {
      movementType: StockMovementType.waste_loss,
    };

    if (fromDate || toDate) {
      whereClause.movementDate = {};
      if (fromDate) {
        whereClause.movementDate.gte = new Date(fromDate);
      }
      if (toDate) {
        whereClause.movementDate.lte = new Date(toDate);
      }
    }

    const logs = await this.prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        product: true,
        material: true,
        createdByUser: {
          select: { fullName: true },
        },
      },
      orderBy: [{ movementDate: 'desc' }, { id: 'desc' }],
      take: 200,
    });

    return logs.map((row) => {
      const isProduct = row.productId !== null && row.product !== null;
      return {
        id: row.id.toString(),
        movementDate: row.movementDate.toISOString().slice(0, 10),
        targetType: isProduct ? ('product' as const) : ('material' as const),
        targetId: isProduct ? row.productId! : row.materialId!,
        code: isProduct ? row.product!.code : (row.material?.code ?? ''),
        name: isProduct ? row.product!.name : (row.material?.name ?? ''),
        unit: isProduct ? row.product!.unit : (row.material?.unit ?? ''),
        qty: row.qty.abs().toFixed(3),
        reason: row.note ?? '',
        createdByName: row.createdByUser.fullName,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  /**
   * Ghi nhận hủy / hao hụt cho Thành phẩm hoặc Nguyên vật liệu trong Database Transaction:
   * - Ghi vào `stock_movements` (`movement_type = 'waste_loss'`) để trừ tồn kho ngay lập tức.
   */
  async recordWasteLoss(dto: RecordWasteLossDto, userId: number) {
    const qtyDec = new Prisma.Decimal(dto.qty).toDecimalPlaces(
      3,
      Prisma.Decimal.ROUND_HALF_UP,
    );

    if (qtyDec.lte(ZERO_DEC)) {
      throw new BadRequestException(
        'Số lượng hủy / hao hụt phải lớn hơn 0.',
      );
    }

    return this.prisma.$transaction(
      async (tx: PrismaTx) => {
        let itemName = '';
        let itemCode = '';
        let itemUnit = '';

        if (dto.targetType === InventoryTargetType.product) {
          const product = await tx.product.findFirst({
            where: { id: dto.targetId, isHidden: false },
          });
          if (!product) {
            throw new NotFoundException(
              `Không tìm thấy thành phẩm #${dto.targetId}.`,
            );
          }
          itemName = product.name;
          itemCode = product.code;
          itemUnit = product.unit;
        } else {
          const material = await tx.material.findFirst({
            where: { id: dto.targetId, isHidden: false },
          });
          if (!material) {
            throw new NotFoundException(
              `Không tìm thấy nguyên vật liệu #${dto.targetId}.`,
            );
          }
          itemName = material.name;
          itemCode = material.code;
          itemUnit = material.unit;
        }

        // Kiểm tra tồn vật lý hiện tại trước khi hủy
        const movements = await tx.stockMovement.groupBy({
          by: ['movementType'],
          where:
            dto.targetType === InventoryTargetType.product
              ? { productId: dto.targetId }
              : { materialId: dto.targetId },
          _sum: { qty: true },
        });

        let currentStock = ZERO_DEC;
        for (const m of movements) {
          currentStock = currentStock.add(
            this.resolveSignedQty(m.movementType, m._sum.qty ?? ZERO_DEC),
          );
        }

        if (currentStock.lt(qtyDec)) {
          throw new BadRequestException(
            `Số lượng hủy (${qtyDec.toFixed(3)} ${itemUnit}) vượt quá tồn kho hiện tại của "${itemName}" (${currentStock.toFixed(3)} ${itemUnit}).`,
          );
        }

        const created = await tx.stockMovement.create({
          data: {
            movementDate: new Date(dto.movementDate),
            movementType: StockMovementType.waste_loss,
            productId:
              dto.targetType === InventoryTargetType.product
                ? dto.targetId
                : null,
            materialId:
              dto.targetType === InventoryTargetType.material
                ? dto.targetId
                : null,
            qty: qtyDec,
            refTable: 'waste_loss',
            refId: null,
            note: dto.reason.trim(),
            createdBy: userId,
          },
        });

        const remainingStock = currentStock.sub(qtyDec);

        return {
          id: created.id.toString(),
          movementDate: dto.movementDate,
          targetType: dto.targetType,
          targetId: dto.targetId,
          code: itemCode,
          name: itemName,
          unit: itemUnit,
          qty: qtyDec.toFixed(3),
          remainingStock: remainingStock.toFixed(3),
          reason: dto.reason.trim(),
          message: `Đã ghi nhận hủy/hao hụt ${qtyDec.toFixed(3)} ${itemUnit} "${itemName}". Tồn kho còn lại: ${remainingStock.toFixed(3)} ${itemUnit}.`,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  // ==========================================================================
  // TRANG 14: BÁO CÁO TỒN KHO (Xây dựng 2 Tab: Thành phẩm & Nguyên vật liệu)
  // ==========================================================================

  /**
   * Tổng hợp biến động tồn kho trong khoảng ngày [fromDate, toDate]:
   * Các cột: Tồn đầu kỳ | Nhập | Sản xuất | Xuất giao | Hủy/Hao hụt | Điều chỉnh kiểm kê | Tồn cuối kỳ
   */
  async getInventoryMovementReport(query: InventoryReportQueryDto): Promise<{
    fromDate: string;
    toDate: string;
    products: InventoryReportRow[];
    materials: InventoryReportRow[];
  }> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const firstDayOfMonthStr = `${todayStr.slice(0, 8)}01`;

    const fromDateStr = query.fromDate ?? firstDayOfMonthStr;
    const toDateStr = query.toDate ?? todayStr;

    const fromDateObj = new Date(`${fromDateStr}T00:00:00.000Z`);
    const toDateObj = new Date(`${toDateStr}T23:59:59.999Z`);

    const keywordFilter = query.keyword?.trim();

    const [
      products,
      materials,
      prodOpeningRows,
      prodPeriodRows,
      matOpeningRows,
      matPeriodRows,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isHidden: false,
          ...(keywordFilter
            ? {
                OR: [
                  { code: { contains: keywordFilter } },
                  { name: { contains: keywordFilter } },
                ],
              }
            : {}),
        },
        orderBy: { code: 'asc' },
      }),
      this.prisma.material.findMany({
        where: {
          isHidden: false,
          ...(keywordFilter
            ? {
                OR: [
                  { code: { contains: keywordFilter } },
                  { name: { contains: keywordFilter } },
                ],
              }
            : {}),
        },
        orderBy: { code: 'asc' },
      }),
      // Biến động Thành phẩm trước kỳ (Tồn đầu kỳ)
      this.prisma.stockMovement.groupBy({
        by: ['productId', 'movementType'],
        where: {
          productId: { not: null },
          movementDate: { lt: fromDateObj },
        },
        _sum: { qty: true },
      }),
      // Biến động Thành phẩm trong kỳ [fromDate, toDate]
      this.prisma.stockMovement.groupBy({
        by: ['productId', 'movementType'],
        where: {
          productId: { not: null },
          movementDate: { gte: fromDateObj, lte: toDateObj },
        },
        _sum: { qty: true },
      }),
      // Biến động Nguyên vật liệu trước kỳ (Tồn đầu kỳ)
      this.prisma.stockMovement.groupBy({
        by: ['materialId', 'movementType'],
        where: {
          materialId: { not: null },
          movementDate: { lt: fromDateObj },
        },
        _sum: { qty: true },
      }),
      // Biến động Nguyên vật liệu trong kỳ [fromDate, toDate]
      this.prisma.stockMovement.groupBy({
        by: ['materialId', 'movementType'],
        where: {
          materialId: { not: null },
          movementDate: { gte: fromDateObj, lte: toDateObj },
        },
        _sum: { qty: true },
      }),
    ]);

    // 1. Tính Tồn đầu kỳ Thành phẩm
    const prodOpeningMap = new Map<number, Prisma.Decimal>();
    for (const row of prodOpeningRows) {
      if (row.productId === null) continue;
      const cur = prodOpeningMap.get(row.productId) ?? ZERO_DEC;
      const signed = this.resolveSignedQty(
        row.movementType,
        row._sum.qty ?? ZERO_DEC,
      );
      prodOpeningMap.set(row.productId, cur.add(signed));
    }

    // 2. Gom biến động trong kỳ của Thành phẩm
    const prodPeriodMap = new Map<
      number,
      {
        importQty: Prisma.Decimal;
        productionQty: Prisma.Decimal;
        exportDeliveryQty: Prisma.Decimal;
        wasteLossQty: Prisma.Decimal;
        adjustmentQty: Prisma.Decimal;
        netDelta: Prisma.Decimal;
      }
    >();

    for (const row of prodPeriodRows) {
      if (row.productId === null) continue;
      const rawQty = row._sum.qty ?? ZERO_DEC;
      const absQty = rawQty.abs();
      const signedQty = this.resolveSignedQty(row.movementType, rawQty);

      const entry = prodPeriodMap.get(row.productId) ?? {
        importQty: ZERO_DEC,
        productionQty: ZERO_DEC,
        exportDeliveryQty: ZERO_DEC,
        wasteLossQty: ZERO_DEC,
        adjustmentQty: ZERO_DEC,
        netDelta: ZERO_DEC,
      };

      switch (row.movementType) {
        case StockMovementType.import:
          entry.importQty = entry.importQty.add(absQty);
          break;
        case StockMovementType.production_in:
          entry.productionQty = entry.productionQty.add(absQty);
          break;
        case StockMovementType.production_out:
          entry.productionQty = entry.productionQty.sub(absQty);
          break;
        case StockMovementType.export_delivery:
          entry.exportDeliveryQty = entry.exportDeliveryQty.add(absQty);
          break;
        case StockMovementType.waste_loss:
          entry.wasteLossQty = entry.wasteLossQty.add(absQty);
          break;
        case StockMovementType.adjustment:
          entry.adjustmentQty = entry.adjustmentQty.add(rawQty);
          break;
      }

      entry.netDelta = entry.netDelta.add(signedQty);
      prodPeriodMap.set(row.productId, entry);
    }

    // 3. Tính Tồn đầu kỳ Nguyên vật liệu
    const matOpeningMap = new Map<number, Prisma.Decimal>();
    for (const row of matOpeningRows) {
      if (row.materialId === null) continue;
      const cur = matOpeningMap.get(row.materialId) ?? ZERO_DEC;
      const signed = this.resolveSignedQty(
        row.movementType,
        row._sum.qty ?? ZERO_DEC,
      );
      matOpeningMap.set(row.materialId, cur.add(signed));
    }

    // 4. Gom biến động trong kỳ của Nguyên vật liệu
    const matPeriodMap = new Map<
      number,
      {
        importQty: Prisma.Decimal;
        productionQty: Prisma.Decimal;
        exportDeliveryQty: Prisma.Decimal;
        wasteLossQty: Prisma.Decimal;
        adjustmentQty: Prisma.Decimal;
        netDelta: Prisma.Decimal;
      }
    >();

    for (const row of matPeriodRows) {
      if (row.materialId === null) continue;
      const rawQty = row._sum.qty ?? ZERO_DEC;
      const absQty = rawQty.abs();
      const signedQty = this.resolveSignedQty(row.movementType, rawQty);

      const entry = matPeriodMap.get(row.materialId) ?? {
        importQty: ZERO_DEC,
        productionQty: ZERO_DEC,
        exportDeliveryQty: ZERO_DEC,
        wasteLossQty: ZERO_DEC,
        adjustmentQty: ZERO_DEC,
        netDelta: ZERO_DEC,
      };

      switch (row.movementType) {
        case StockMovementType.import:
          entry.importQty = entry.importQty.add(absQty);
          break;
        case StockMovementType.production_out:
          entry.productionQty = entry.productionQty.add(absQty);
          break;
        case StockMovementType.production_in:
          entry.productionQty = entry.productionQty.add(absQty);
          break;
        case StockMovementType.export_delivery:
          entry.exportDeliveryQty = entry.exportDeliveryQty.add(absQty);
          break;
        case StockMovementType.waste_loss:
          entry.wasteLossQty = entry.wasteLossQty.add(absQty);
          break;
        case StockMovementType.adjustment:
          entry.adjustmentQty = entry.adjustmentQty.add(rawQty);
          break;
      }

      entry.netDelta = entry.netDelta.add(signedQty);
      matPeriodMap.set(row.materialId, entry);
    }

    const productReportRows: InventoryReportRow[] = products.map((p) => {
      const opening = prodOpeningMap.get(p.id) ?? ZERO_DEC;
      const period = prodPeriodMap.get(p.id) ?? {
        importQty: ZERO_DEC,
        productionQty: ZERO_DEC,
        exportDeliveryQty: ZERO_DEC,
        wasteLossQty: ZERO_DEC,
        adjustmentQty: ZERO_DEC,
        netDelta: ZERO_DEC,
      };
      const closing = opening.add(period.netDelta);

      return {
        targetType: 'product',
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        minStock: p.safetyStock.toFixed(3),
        openingStock: opening.toFixed(3),
        importQty: period.importQty.toFixed(3),
        productionQty: period.productionQty.toFixed(3),
        exportDeliveryQty: period.exportDeliveryQty.toFixed(3),
        wasteLossQty: period.wasteLossQty.toFixed(3),
        adjustmentQty: period.adjustmentQty.toFixed(3),
        closingStock: closing.toFixed(3),
        isBelowMinStock: closing.lt(p.safetyStock),
      };
    });

    const materialReportRows: InventoryReportRow[] = materials.map((m) => {
      const opening = matOpeningMap.get(m.id) ?? ZERO_DEC;
      const period = matPeriodMap.get(m.id) ?? {
        importQty: ZERO_DEC,
        productionQty: ZERO_DEC,
        exportDeliveryQty: ZERO_DEC,
        wasteLossQty: ZERO_DEC,
        adjustmentQty: ZERO_DEC,
        netDelta: ZERO_DEC,
      };
      const closing = opening.add(period.netDelta);

      return {
        targetType: 'material',
        id: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        minStock: m.minStock.toFixed(3),
        openingStock: opening.toFixed(3),
        importQty: period.importQty.toFixed(3),
        productionQty: period.productionQty.toFixed(3),
        exportDeliveryQty: period.exportDeliveryQty.toFixed(3),
        wasteLossQty: period.wasteLossQty.toFixed(3),
        adjustmentQty: period.adjustmentQty.toFixed(3),
        closingStock: closing.toFixed(3),
        isBelowMinStock: closing.lt(m.minStock),
      };
    });

    return {
      fromDate: fromDateStr,
      toDate: toDateStr,
      products: productReportRows,
      materials: materialReportRows,
    };
  }

  // ==========================================================================
  // TỔNG QUAN TỒN KHO TỨC THỜI (DÙNG CHO DASHBOARD KHO)
  // ==========================================================================

  async getOverview() {
    const [
      products,
      materials,
      productMovements,
      materialMovements,
      reservedProductRows,
      activeApprovedItems,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { isHidden: false },
        orderBy: { code: 'asc' },
      }),
      this.prisma.material.findMany({
        where: { isHidden: false },
        orderBy: { code: 'asc' },
      }),
      this.prisma.stockMovement.groupBy({
        by: ['productId', 'movementType'],
        where: { productId: { not: null } },
        _sum: { qty: true },
      }),
      this.prisma.stockMovement.groupBy({
        by: ['materialId', 'movementType'],
        where: { materialId: { not: null } },
        _sum: { qty: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
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
        _sum: { qtyFromStock: true },
      }),
      this.prisma.orderItem.findMany({
        where: {
          qtyToProduce: { gt: ZERO_DEC },
          order: {
            isHidden: false,
            status: OrderStatus.approved,
          },
        },
        select: {
          qtyToProduce: true,
          product: {
            select: {
              recipeItems: {
                select: {
                  materialId: true,
                  qty: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const productPhysicalMap = new Map<number, Prisma.Decimal>();
    for (const row of productMovements) {
      if (row.productId === null) continue;
      const current = productPhysicalMap.get(row.productId) ?? ZERO_DEC;
      const signed = this.resolveSignedQty(
        row.movementType,
        row._sum.qty ?? ZERO_DEC,
      );
      productPhysicalMap.set(row.productId, current.add(signed));
    }

    const productReservedMap = new Map<number, Prisma.Decimal>();
    for (const row of reservedProductRows) {
      productReservedMap.set(
        row.productId,
        row._sum.qtyFromStock ?? ZERO_DEC,
      );
    }

    const materialPhysicalMap = new Map<number, Prisma.Decimal>();
    for (const row of materialMovements) {
      if (row.materialId === null) continue;
      const current = materialPhysicalMap.get(row.materialId) ?? ZERO_DEC;
      const signed = this.resolveSignedQty(
        row.movementType,
        row._sum.qty ?? ZERO_DEC,
      );
      materialPhysicalMap.set(row.materialId, current.add(signed));
    }

    const materialReservedMap = new Map<number, Prisma.Decimal>();
    for (const item of activeApprovedItems) {
      for (const recipe of item.product.recipeItems) {
        const current = materialReservedMap.get(recipe.materialId) ?? ZERO_DEC;
        const needed = item.qtyToProduce
          .mul(recipe.qty)
          .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
        materialReservedMap.set(recipe.materialId, current.add(needed));
      }
    }

    return {
      products: products.map((p) => {
        const physical = productPhysicalMap.get(p.id) ?? ZERO_DEC;
        const reserved = productReservedMap.get(p.id) ?? ZERO_DEC;
        const available = Prisma.Decimal.max(ZERO_DEC, physical.sub(reserved));

        return {
          productId: p.id,
          code: p.code,
          name: p.name,
          unit: p.unit,
          safetyStock: p.safetyStock.toFixed(3),
          physicalQty: physical.toFixed(3),
          reservedQty: reserved.toFixed(3),
          availableQty: available.toFixed(3),
          isBelowSafetyStock: available.lt(p.safetyStock),
        };
      }),
      materials: materials.map((m) => {
        const physical = materialPhysicalMap.get(m.id) ?? ZERO_DEC;
        const reserved = materialReservedMap.get(m.id) ?? ZERO_DEC;
        const available = Prisma.Decimal.max(ZERO_DEC, physical.sub(reserved));

        return {
          materialId: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          minStock: m.minStock.toFixed(3),
          physicalQty: physical.toFixed(3),
          reservedQty: reserved.toFixed(3),
          availableQty: available.toFixed(3),
          isBelowMinStock: available.lt(m.minStock),
        };
      }),
    };
  }

  private resolveSignedQty(
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
