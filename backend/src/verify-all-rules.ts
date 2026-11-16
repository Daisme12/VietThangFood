import { Prisma } from '@prisma/client';
import { AuthService } from './modules/auth/auth.service';
import { OrdersService } from './modules/orders/orders.service';
import { ProductionService } from './modules/production/production.service';
import { RecipesService } from './modules/recipes/recipes.service';

async function runAllBackendRulesVerification() {
  console.log('================================================================');
  console.log('KIỂM THỬ TOÀN DIỆN QUY TẮC BACKEND THEO ACTIVITY.MD');
  console.log('================================================================');

  // 1. Kiểm thử JWT Auth & Mã hóa mật khẩu (Trang 23)
  const authService = new AuthService({} as never);
  const hashed = authService.hashPassword('VietThang@2026');
  const verified = authService.verifyPassword('VietThang@2026', hashed);
  const token = authService.signJwt({
    sub: 1,
    username: 'admin',
    role: 'admin',
  });
  const decoded = authService.verifyJwt(token);
  console.log(
    `1) [Trang 23 - Auth JWT]: Hash=${verified ? 'OK' : 'FAIL'} | JWT sub=${decoded.sub}, role=${decoded.role}`,
  );

  // 2. Tạo Mock Prisma hỗ trợ kiểm thử Công thức Bếp (Mục 3.3), BOM (Trang 9) & Đơn hàng (Mục 4.2, 6.3)
  const stockMovements: Array<{
    productId: number | null;
    materialId: number | null;
    movementDate: Date;
    movementType: string;
    qty: Prisma.Decimal;
  }> = [
    // Tồn đầu ngày thành phẩm (trước ngày 2026-11-10): 20 túi
    {
      productId: 10,
      materialId: null,
      movementDate: new Date('2026-11-09T10:00:00.000Z'),
      movementType: 'production_in',
      qty: new Prisma.Decimal('20.000'),
    },
    // Tồn nguyên vật liệu hiện tại: Bột năng = 50 kg, Đường đen = 10 kg
    {
      productId: null,
      materialId: 1,
      movementDate: new Date('2026-11-09T08:00:00.000Z'),
      movementType: 'import',
      qty: new Prisma.Decimal('50.000'),
    },
    {
      productId: null,
      materialId: 2,
      movementDate: new Date('2026-11-09T08:00:00.000Z'),
      movementType: 'import',
      qty: new Prisma.Decimal('10.000'),
    },
  ];

  const mockPrisma = {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> =>
      fn(mockPrisma),
    product: {
      findMany: async () => [
        {
          id: 10,
          categoryId: 1,
          code: 'TP-TC-HOANGKIM-1KG',
          name: 'Trân Châu Hoàng Kim (Túi 1kg)',
          packageSpec: '1kg/túi',
          unit: 'tui',
          price: new Prisma.Decimal('68000.00'),
          vatRate: new Prisma.Decimal('10.00'),
          safetyStock: new Prisma.Decimal('15.000'),
          isHidden: false,
          category: { id: 1, name: 'Topping Trà Sữa' },
          recipeItems: [
            {
              id: 1,
              productId: 10,
              materialId: 1,
              qty: new Prisma.Decimal('0.5000'), // 0.5kg bột năng / túi
              material: {
                id: 1,
                code: 'NL-BOT-NANG',
                name: 'Tinh Bột Năng Thái Lan',
                unit: 'kg',
              },
            },
            {
              id: 2,
              productId: 10,
              materialId: 2,
              qty: new Prisma.Decimal('0.2000'), // 0.2kg đường đen / túi
              material: {
                id: 2,
                code: 'NL-DUONG-DEN',
                name: 'Đường Đen Hàn Quốc',
                unit: 'kg',
              },
            },
          ],
        },
      ],
      findFirst: async () => ({
        id: 10,
        code: 'TP-TC-HOANGKIM-1KG',
        name: 'Trân Châu Hoàng Kim (Túi 1kg)',
        unit: 'tui',
        recipeItems: [
          {
            id: 1,
            productId: 10,
            materialId: 1,
            qty: new Prisma.Decimal('0.5000'),
            material: {
              id: 1,
              code: 'NL-BOT-NANG',
              name: 'Tinh Bột Năng Thái Lan',
              unit: 'kg',
            },
          },
          {
            id: 2,
            productId: 10,
            materialId: 2,
            qty: new Prisma.Decimal('0.2000'),
            material: {
              id: 2,
              code: 'NL-DUONG-DEN',
              name: 'Đường Đen Hàn Quốc',
              unit: 'kg',
            },
          },
        ],
      }),
    },
    orderItem: {
      findMany: async () => [
        // Tổng đơn hôm nay = 60 túi
        { productId: 10, qtyOrdered: new Prisma.Decimal('60.000') },
      ],
      updateMany: async () => ({ count: 1 }),
    },
    stockMovement: {
      groupBy: async (args: {
        by: string[];
        where?: {
          productId?: unknown;
          materialId?: unknown;
          movementDate?: { lt?: Date };
        };
      }) => {
        const isProductGroup = args.by.includes('productId');
        const filtered = stockMovements.filter((m) => {
          if (isProductGroup && m.productId === null) return false;
          if (!isProductGroup && m.materialId === null) return false;
          if (
            args.where?.movementDate?.lt &&
            m.movementDate >= args.where.movementDate.lt
          ) {
            return false;
          }
          return true;
        });

        const map = new Map<string, Prisma.Decimal>();
        for (const m of filtered) {
          const id = isProductGroup ? m.productId : m.materialId;
          const key = `${id}:${m.movementType}`;
          map.set(key, (map.get(key) ?? new Prisma.Decimal(0)).add(m.qty));
        }

        return Array.from(map.entries()).map(([k, sum]) => {
          const [idStr, movementType] = k.split(':');
          return {
            productId: isProductGroup ? Number(idStr) : null,
            materialId: !isProductGroup ? Number(idStr) : null,
            movementType,
            _sum: { qty: sum },
          };
        });
      },
      create: async (args: {
        data: {
          movementDate: Date;
          movementType: string;
          productId?: number;
          materialId?: number;
          qty: Prisma.Decimal;
        };
      }) => {
        stockMovements.push({
          productId: args.data.productId ?? null,
          materialId: args.data.materialId ?? null,
          movementDate: args.data.movementDate,
          movementType: args.data.movementType,
          qty: args.data.qty,
        });
        return args.data;
      },
    },
    order: {
      findFirst: async (args: { where: { id: bigint } }) => {
        if (args.where.id === BigInt(999)) {
          return {
            id: BigInt(999),
            code: 'DH-20261110-001',
            status: 'delivered',
            isHidden: false,
          };
        }
        return null;
      },
    },
  };

  // 3. Kiểm thử Trang 9 (BOM): Số sản phẩm tối đa làm được theo tồn hiện tại
  // Bột năng 50kg / 0.5 = 100 túi; Đường đen 10kg / 0.2 = 50 túi => Max làm được = 50 túi
  const recipesService = new RecipesService(mockPrisma as never);
  const bomResult = await recipesService.listAllProductRecipesWithMaxProducable();
  console.log(
    `2) [Trang 9 - BOM]: Sản phẩm "${bomResult[0].productName}" làm được tối đa = ${bomResult[0].maxProducableUnits} ${bomResult[0].unit} (Giới hạn bởi: ${bomResult[0].limitingMaterialName})`,
  );

  // 4. Kiểm thử Trang 7 (Tổng sản xuất ngày theo Công thức Mục 3.3):
  // Cần sản xuất = max(0, 60 (Đơn hôm nay) + 15 (Định mức an toàn) - 20 (Tồn đầu ngày)) = 55 túi
  const productionService = new ProductionService(mockPrisma as never);
  const plan = await productionService.getDailyProductionPlan('2026-11-10');
  const p0 = plan.products[0];
  console.log(
    `3) [Trang 7 - Công thức Bếp 3.3]: Đơn hôm nay (${p0.todayOrderQty}) + An toàn (${p0.safetyStockQty}) - Tồn đầu (${p0.openingStockQty}) => Cần SX = ${p0.qtyToProduce} ${p0.unit}`,
  );

  // 5. Kiểm thử Trang 8 (Ghi nhận sản xuất thực tế 60 túi => Đường đen cần 12kg nhưng chỉ có 10kg => Cảnh báo âm kho -2.000 kg!)
  const recordResult = await productionService.recordActualProduction(
    {
      productId: 10,
      actualQty: 60,
      productionDate: '2026-11-10',
    },
    1,
  );
  console.log(
    `4) [Trang 8 - Ghi nhận SX & Cảnh báo âm kho]: ${recordResult.message}`,
  );
  if (recordResult.negativeMaterialWarnings.length > 0) {
    console.log(
      `   -> Chi tiết cảnh báo: ${recordResult.negativeMaterialWarnings[0].warningMessage}`,
    );
  }

  // 6. Kiểm thử Trang 2 (Cấm sửa đơn Đã giao - delivered)
  const ordersService = new OrdersService(mockPrisma as never);
  try {
    await ordersService.updateOrder(999, { note: 'Thử sửa đơn đã giao' });
  } catch (err) {
    console.log(
      `5) [Trang 2 - Khóa sửa đơn Đã giao]: Đã chặn thành công -> "${(err as Error).message}"`,
    );
  }

  console.log('================================================================');
}

runAllBackendRulesVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});

