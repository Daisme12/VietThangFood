import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { InventoryService } from './modules/inventory/inventory.service';
import { InventoryTargetType } from './modules/inventory/dto/inventory.dto';

function createInventoryPrismaMock(): PrismaService {
  const suppliers = [
    {
      id: 1,
      code: 'NCC-TRASUA-01',
      name: 'Công ty Nguyên Liệu Trà Sữa Hoàng Gia',
      phone: '0909123456',
      isHidden: false,
    },
  ];

  const materials = [
    {
      id: 1,
      code: 'NL-TRA-DEN',
      name: 'Hồng trà Assam thượng hạng',
      unit: 'kg',
      minStock: new Prisma.Decimal('20.000'),
      supplierId: 1,
      supplier: suppliers[0],
      isHidden: false,
    },
    {
      id: 2,
      code: 'NL-BOT-SUA',
      name: 'Bột sữa béo Indo',
      unit: 'kg',
      minStock: new Prisma.Decimal('50.000'),
      supplierId: 1,
      supplier: suppliers[0],
      isHidden: false,
    },
  ];

  const products = [
    {
      id: 101,
      code: 'TP-TS-TRUYENTHONG',
      name: 'Cốt Trà Sữa Truyền Thống Đóng Chai 1L',
      unit: 'chai',
      packageSpec: '1L/chai',
      safetyStock: new Prisma.Decimal('30.000'),
      category: { id: 1, name: 'Cốt trà sữa' },
      isHidden: false,
    },
  ];

  const purchaseItems: Array<{
    id: bigint;
    receiptCode: string;
    receiptDate: Date;
    supplierId: number;
    materialId: number;
    qty: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    note: string | null;
    createdBy: number;
    isHidden: boolean;
    createdAt: Date;
  }> = [];

  const stockMovements: Array<{
    id: bigint;
    movementDate: Date;
    movementType: StockMovementType;
    productId: number | null;
    materialId: number | null;
    qty: Prisma.Decimal;
    refTable: string | null;
    refId: bigint | null;
    note: string | null;
    createdBy: number;
    createdAt: Date;
  }> = [
    // Tồn đầu kỳ trước ngày 2026-11-01
    {
      id: 1n,
      movementDate: new Date('2026-10-25'),
      movementType: StockMovementType.import,
      productId: null,
      materialId: 1,
      qty: new Prisma.Decimal('15.000'),
      refTable: 'init',
      refId: 1n,
      note: 'Tồn đầu kỳ Hồng trà Assam',
      createdBy: 1,
      createdAt: new Date('2026-10-25'),
    },
    {
      id: 2n,
      movementDate: new Date('2026-10-25'),
      movementType: StockMovementType.import,
      productId: null,
      materialId: 2,
      qty: new Prisma.Decimal('30.000'),
      refTable: 'init',
      refId: 2n,
      note: 'Tồn đầu kỳ Bột sữa béo Indo',
      createdBy: 1,
      createdAt: new Date('2026-10-25'),
    },
  ];

  let nextPurchaseId = 1n;
  let nextMovementId = 3n;

  const clientObj = {
    supplier: {
      findMany: async () => suppliers,
      findFirst: async ({ where }: { where: { id: number } }) =>
        suppliers.find((s) => s.id === where.id) ?? null,
    },
    material: {
      findMany: async () => materials,
      findFirst: async ({ where }: { where: { id: number } }) =>
        materials.find((m) => m.id === where.id) ?? null,
    },
    product: {
      findMany: async () => products,
      findFirst: async ({ where }: { where: { id: number } }) =>
        products.find((p) => p.id === where.id) ?? null,
    },
    user: {
      findUnique: async () => ({ fullName: 'Quản lý Kho Việt Thắng' }),
    },
    purchaseItem: {
      create: async ({
        data,
      }: {
        data: {
          receiptCode: string;
          receiptDate: Date;
          supplierId: number;
          materialId: number;
          qty: Prisma.Decimal;
          unitPrice: Prisma.Decimal;
          lineTotal: Prisma.Decimal;
          note: string | null;
          createdBy: number;
        };
      }) => {
        const created = {
          id: nextPurchaseId++,
          ...data,
          isHidden: false,
          createdAt: new Date(),
        };
        purchaseItems.push(created);
        return created;
      },
      findMany: async () =>
        purchaseItems.map((pi) => ({
          ...pi,
          supplier: suppliers.find((s) => s.id === pi.supplierId)!,
          material: materials.find((m) => m.id === pi.materialId)!,
          createdByUser: { id: 1, fullName: 'Quản lý Kho Việt Thắng' },
        })),
    },
    stockMovement: {
      create: async ({
        data,
      }: {
        data: {
          movementDate: Date;
          movementType: StockMovementType;
          productId: number | null;
          materialId: number | null;
          qty: Prisma.Decimal;
          refTable: string | null;
          refId: bigint | null;
          note: string | null;
          createdBy: number;
        };
      }) => {
        const created = {
          id: nextMovementId++,
          ...data,
          createdAt: new Date(),
        };
        stockMovements.push(created);
        return created;
      },
      groupBy: async ({
        by,
        where,
      }: {
        by: string[];
        where: {
          productId?: number | { not: null };
          materialId?: number | { not: null };
          movementDate?: { lte?: Date; lt?: Date; gte?: Date };
        };
      }) => {
        const filtered = stockMovements.filter((m) => {
          if (typeof where.productId === 'number' && m.productId !== where.productId) {
            return false;
          }
          if (
            typeof where.productId === 'object' &&
            where.productId !== null &&
            m.productId === null
          ) {
            return false;
          }
          if (typeof where.materialId === 'number' && m.materialId !== where.materialId) {
            return false;
          }
          if (
            typeof where.materialId === 'object' &&
            where.materialId !== null &&
            m.materialId === null
          ) {
            return false;
          }
          if (where.movementDate?.lt && !(m.movementDate < where.movementDate.lt)) {
            return false;
          }
          if (where.movementDate?.gte && !(m.movementDate >= where.movementDate.gte)) {
            return false;
          }
          if (where.movementDate?.lte && !(m.movementDate <= where.movementDate.lte)) {
            return false;
          }
          return true;
        });

        const map = new Map<
          string,
          {
            productId: number | null;
            materialId: number | null;
            movementType: StockMovementType;
            qty: Prisma.Decimal;
          }
        >();

        for (const m of filtered) {
          const key = by.includes('productId')
            ? `P_${m.productId}_${m.movementType}`
            : by.includes('materialId')
              ? `M_${m.materialId}_${m.movementType}`
              : `T_${m.movementType}`;
          const cur = map.get(key);
          if (cur) {
            cur.qty = cur.qty.add(m.qty);
          } else {
            map.set(key, {
              productId: m.productId,
              materialId: m.materialId,
              movementType: m.movementType,
              qty: m.qty,
            });
          }
        }

        return Array.from(map.values()).map((v) => ({
          productId: v.productId,
          materialId: v.materialId,
          movementType: v.movementType,
          _sum: { qty: v.qty },
        }));
      },
    },
  };

  return {
    ...clientObj,
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> =>
      fn(clientObj),
  } as unknown as PrismaService;
}

async function verifyInventoryModule(): Promise<void> {
  const prismaMock = createInventoryPrismaMock();
  const inventoryService = new InventoryService(prismaMock);

  console.log('================================================================');
  console.log('KIỂM THỬ TOÀN DIỆN PHÂN HỆ KHO (TRANG 11, 12, 13, 14)');
  console.log('================================================================');

  // 1. Trang 11: Tạo phiếu nhập kho (purchase_items -> stock_movements: import)
  const receipt = await inventoryService.createPurchaseReceipt(
    {
      receiptCode: 'PN-20261109-01',
      receiptDate: '2026-11-09',
      supplierId: 1,
      note: 'Nhập nguyên liệu trà sữa đợt 1 tháng 11',
      items: [
        {
          materialId: 1,
          qty: '25.000',
          unitPrice: '180000',
          note: 'Hồng trà Assam',
        },
        {
          materialId: 2,
          qty: '10.000',
          unitPrice: '95000',
          note: 'Bột sữa béo Indo',
        },
      ],
    },
    1,
  );
  console.log('1) [Trang 11] Tạo phiếu nhập kho thành công:');
  console.log(`   - Mã phiếu  : ${receipt.receiptCode} (${receipt.lineCount} dòng NL)`);
  console.log(`   - Tổng tiền : ${receipt.totalAmount} VNĐ`);

  // 2. Trang 13: Ghi nhận hủy & hao hụt 2.500 kg Hồng trà Assam (waste_loss)
  const wasteRes = await inventoryService.recordWasteLoss(
    {
      movementDate: '2026-11-09',
      targetType: InventoryTargetType.material,
      targetId: 1,
      qty: '2.500',
      reason: 'Rách bao bì chống ẩm khi vận chuyển nội bộ',
    },
    1,
  );
  console.log('\n2) [Trang 13] Ghi nhận Hủy & Hao hụt:');
  console.log(`   - Thông báo : ${wasteRes.message}`);

  // 3. Trang 12: Kiểm kê cuối ngày (Hồng trà Assam tồn hệ thống = 15 + 25 - 2.5 = 37.5kg -> Kiểm đếm thực tế = 37.0kg -> Lệch -0.5kg)
  const stocktakeRes = await inventoryService.submitDailyStocktake(
    {
      stocktakeDate: '2026-11-09',
      generalNote: 'Kiểm kê chốt ca tối 09/11/2026',
      items: [
        {
          targetType: InventoryTargetType.material,
          targetId: 1,
          actualStock: '37.000',
          note: 'Hao hụt tự nhiên khi chia mẻ',
        },
        {
          targetType: InventoryTargetType.material,
          targetId: 2,
          actualStock: '40.000',
        },
      ],
    },
    1,
  );
  console.log('\n3) [Trang 12] Kiểm kê cuối ngày:');
  console.log(`   - Thông báo : ${stocktakeRes.message}`);
  console.log(`   - Chi tiết điều chỉnh:`, JSON.stringify(stocktakeRes.adjustments));

  // 4. Trang 14: Báo cáo tồn kho từ 2026-11-01 đến 2026-11-09
  const report = await inventoryService.getInventoryMovementReport({
    fromDate: '2026-11-01',
    toDate: '2026-11-09',
  });
  console.log('\n4) [Trang 14] Báo cáo Tồn kho Nguyên vật liệu (01/11 -> 09/11):');
  for (const row of report.materials) {
    console.log(
      `   - [${row.code}] ${row.name}: Đầu kỳ=${row.openingStock} | Nhập=${row.importQty} | Hủy=${row.wasteLossQty} | Điều chỉnh KK=${row.adjustmentQty} => Cuối kỳ=${row.closingStock} ${row.unit} (Cảnh báo < min_stock ${row.minStock}: ${row.isBelowMinStock ? 'ĐỎ - THIẾU TỒN' : 'XANH - ĐỦ'})`,
    );
  }
  console.log('================================================================');
}

void verifyInventoryModule();

