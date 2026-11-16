import {
  CheckLevel,
  OrderStatus,
  OrderType,
  Prisma,
  ShortAction,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { OrderApprovalService } from './modules/orders/order-approval.service';
import { OrdersService } from './modules/orders/orders.service';
import { ProductionService } from './modules/production/production.service';

/**
 * In-memory transactional simulator cho PrismaService để kiểm thử toàn bộ thuật toán
 * Duyệt đơn Xanh - Vàng - Đỏ, Sản xuất Bếp (BOM) và Giao hàng + Tạo đơn bù
 * ngay cả khi chưa bật MySQL Server vật lý.
 */
function createInMemoryPrismaMock(): PrismaService {
  const products = new Map<
    number,
    {
      id: number;
      code: string;
      name: string;
      packageSpec: string | null;
      unit: string;
      price: Prisma.Decimal;
      vatRate: Prisma.Decimal;
      safetyStock: Prisma.Decimal;
      isHidden: boolean;
      recipeItems: Array<{
        id: number;
        productId: number;
        materialId: number;
        qty: Prisma.Decimal;
        material: {
          id: number;
          code: string;
          name: string;
          unit: string;
        };
      }>;
    }
  >();

  // Khởi tạo 2 nguyên liệu BOM: Thịt heo sạch (MAT-01) và Gia vị thảo mộc (MAT-02)
  const matPork = {
    id: 1,
    code: 'NL-HEO-01',
    name: 'Thịt heo nạc vai VietGAP',
    unit: 'kg',
  };
  const matSpice = {
    id: 2,
    code: 'NL-GIAVI-02',
    name: 'Gia vị ướp truyền thống',
    unit: 'kg',
  };

  // Thành phẩm: Xúc xích Đức VietThang 500g (SP-XX-01)
  // Định mức BOM cho 1 gói (0.5kg): 0.4500 kg Thịt heo + 0.0500 kg Gia vị
  products.set(101, {
    id: 101,
    code: 'SP-XX-500G',
    name: 'Xúc xích Đức Việt Thắng gói 500g',
    packageSpec: '500g/gói',
    unit: 'gói',
    price: new Prisma.Decimal('85000.00'),
    vatRate: new Prisma.Decimal('10.00'),
    safetyStock: new Prisma.Decimal('20.000'),
    isHidden: false,
    recipeItems: [
      {
        id: 1,
        productId: 101,
        materialId: 1,
        qty: new Prisma.Decimal('0.4500'),
        material: matPork,
      },
      {
        id: 2,
        productId: 101,
        materialId: 2,
        qty: new Prisma.Decimal('0.0500'),
        material: matSpice,
      },
    ],
  });

  // Thẻ kho ban đầu (stock_movements):
  // - Thành phẩm SP-XX-500G: Tồn kho vật lý = 50 gói
  // - Nguyên liệu NL-HEO-01: Tồn kho vật lý = 45 kg (đủ làm thêm 100 gói)
  // - Nguyên liệu NL-GIAVI-02: Tồn kho vật lý = 10 kg (đủ làm thêm 200 gói)
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
  }> = [
    {
      id: 1n,
      movementDate: new Date(),
      movementType: StockMovementType.production_in,
      productId: 101,
      materialId: null,
      qty: new Prisma.Decimal('50.000'),
      refTable: 'init',
      refId: 1n,
      note: 'Tồn đầu kỳ thành phẩm Xúc xích Đức 500g',
      createdBy: 1,
    },
    {
      id: 2n,
      movementDate: new Date(),
      movementType: StockMovementType.import,
      productId: null,
      materialId: 1,
      qty: new Prisma.Decimal('45.000'),
      refTable: 'purchase_items',
      refId: 1n,
      note: 'Nhập kho Thịt heo nạc vai',
      createdBy: 1,
    },
    {
      id: 3n,
      movementDate: new Date(),
      movementType: StockMovementType.import,
      productId: null,
      materialId: 2,
      qty: new Prisma.Decimal('10.000'),
      refTable: 'purchase_items',
      refId: 2n,
      note: 'Nhập kho Gia vị ướp truyền thống',
      createdBy: 1,
    },
  ];

  // Danh sách 3 đơn hàng chờ duyệt:
  // - Đơn #1 (ORD-001): Đặt 30 gói (<= 50 gói tồn TP) -> Kỳ vọng: XANH (green), giữ 30 gói TP (còn 20 gói khả dụng)
  // - Đơn #2 (ORD-002): Đặt 100 gói -> Lấy 20 gói từ kho TP, cần SX 80 gói (cần 80 * 0.45 = 36kg thịt heo <= 45kg tồn) -> Kỳ vọng: VÀNG (yellow), giữ 20 gói TP + giữ 36kg thịt heo (còn 9kg thịt heo khả dụng)
  // - Đơn #3 (ORD-003): Đặt 50 gói -> Kho TP còn 0, cần SX 50 gói (cần 50 * 0.45 = 22.5kg thịt heo > 9kg khả dụng) -> Kỳ vọng: ĐỎ (red / blocked), báo thiếu 13.500 kg Thịt heo!
  const orders = new Map<
    bigint,
    {
      id: bigint;
      code: string;
      orderType: OrderType;
      parentOrderId: bigint | null;
      customerId: number;
      locationId: number;
      orderDate: Date;
      deliveryAt: Date;
      status: OrderStatus;
      checkLevel: CheckLevel | null;
      note: string | null;
      deliveryCode: string | null;
      deliveredAt: Date | null;
      totalBeforeVat: Prisma.Decimal;
      totalVat: Prisma.Decimal;
      totalAmount: Prisma.Decimal;
      createdBy: number;
      isHidden: boolean;
    }
  >();

  const orderItems = new Map<
    bigint,
    {
      id: bigint;
      orderId: bigint;
      productId: number;
      qtyOrdered: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      vatRate: Prisma.Decimal;
      qtyFromStock: Prisma.Decimal;
      qtyToProduce: Prisma.Decimal;
      qtyDelivered: Prisma.Decimal;
      qtyShort: Prisma.Decimal;
      shortAction: ShortAction | null;
      shortCloseReason: string | null;
      makeUpOrderId: bigint | null;
      note: string | null;
    }
  >();

  const seedOrders = [
    { id: 1n, code: 'ORD-2026-001', itemId: 1001n, qty: '30.000' },
    { id: 2n, code: 'ORD-2026-002', itemId: 1002n, qty: '100.000' },
    { id: 3n, code: 'ORD-2026-003', itemId: 1003n, qty: '50.000' },
  ];

  for (const s of seedOrders) {
    const qtyDec = new Prisma.Decimal(s.qty);
    const beforeVat = qtyDec.mul(new Prisma.Decimal('85000.00'));
    const vat = beforeVat.mul(new Prisma.Decimal('0.10'));
    orders.set(s.id, {
      id: s.id,
      code: s.code,
      orderType: OrderType.standard,
      parentOrderId: null,
      customerId: 1,
      locationId: 1,
      orderDate: new Date('2026-11-09'),
      deliveryAt: new Date('2026-11-10T08:00:00Z'),
      status: OrderStatus.pending,
      checkLevel: null,
      note: null,
      deliveryCode: null,
      deliveredAt: null,
      totalBeforeVat: beforeVat,
      totalVat: vat,
      totalAmount: beforeVat.add(vat),
      createdBy: 1,
      isHidden: false,
    });

    orderItems.set(s.itemId, {
      id: s.itemId,
      orderId: s.id,
      productId: 101,
      qtyOrdered: qtyDec,
      unitPrice: new Prisma.Decimal('85000.00'),
      vatRate: new Prisma.Decimal('10.00'),
      qtyFromStock: new Prisma.Decimal(0),
      qtyToProduce: new Prisma.Decimal(0),
      qtyDelivered: new Prisma.Decimal(0),
      qtyShort: new Prisma.Decimal(0),
      shortAction: null,
      shortCloseReason: null,
      makeUpOrderId: null,
      note: null,
    });
  }

  let nextOrderId = 4n;
  let nextOrderItemId = 1004n;
  let nextMovementId = 4n;

  const txClient = {
    $executeRaw: async () => 1,
    order: {
      findFirst: async ({ where }: { where: { id: bigint; isHidden?: boolean } }) => {
        const found = orders.get(where.id);
        if (!found || (where.isHidden === false && found.isHidden)) {
          return null;
        }
        const items = Array.from(orderItems.values())
          .filter((i) => i.orderId === found.id)
          .map((i) => ({
            ...i,
            product: products.get(i.productId)!,
          }));
        return {
          ...found,
          items,
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: Partial<{
          status: OrderStatus;
          checkLevel: CheckLevel;
          deliveryCode: string;
          deliveredAt: Date;
        }>;
      }) => {
        const existing = orders.get(where.id)!;
        const updated = { ...existing, ...data };
        orders.set(where.id, updated);
        return updated;
      },
      create: async ({
        data,
      }: {
        data: {
          code: string;
          orderType: OrderType;
          parentOrderId?: bigint;
          customerId: number;
          locationId: number;
          orderDate: Date;
          deliveryAt: Date;
          status: OrderStatus;
          note: string | null;
          totalBeforeVat: Prisma.Decimal;
          totalVat: Prisma.Decimal;
          totalAmount: Prisma.Decimal;
          createdBy: number;
          items: {
            create: Array<{
              productId: number;
              qtyOrdered: Prisma.Decimal;
              unitPrice: Prisma.Decimal;
              vatRate: Prisma.Decimal;
              note: string | null;
            }>;
          };
        };
      }) => {
        const newId = nextOrderId++;
        const createdOrder = {
          id: newId,
          code: data.code,
          orderType: data.orderType,
          parentOrderId: data.parentOrderId ?? null,
          customerId: data.customerId,
          locationId: data.locationId,
          orderDate: data.orderDate,
          deliveryAt: data.deliveryAt,
          status: data.status,
          checkLevel: null,
          note: data.note,
          deliveryCode: null,
          deliveredAt: null,
          totalBeforeVat: data.totalBeforeVat,
          totalVat: data.totalVat,
          totalAmount: data.totalAmount,
          createdBy: data.createdBy,
          isHidden: false,
        };
        orders.set(newId, createdOrder);

        for (const item of data.items.create) {
          const itemId = nextOrderItemId++;
          orderItems.set(itemId, {
            id: itemId,
            orderId: newId,
            productId: item.productId,
            qtyOrdered: item.qtyOrdered,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            qtyFromStock: new Prisma.Decimal(0),
            qtyToProduce: new Prisma.Decimal(0),
            qtyDelivered: new Prisma.Decimal(0),
            qtyShort: new Prisma.Decimal(0),
            shortAction: null,
            shortCloseReason: null,
            makeUpOrderId: null,
            note: item.note,
          });
        }

        return createdOrder;
      },
    },
    orderItem: {
      update: async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: Partial<{
          qtyFromStock: Prisma.Decimal;
          qtyToProduce: Prisma.Decimal;
          qtyDelivered: Prisma.Decimal;
          qtyShort: Prisma.Decimal;
          shortAction: ShortAction | null;
          shortCloseReason: string | null;
          makeUpOrderId: bigint | null;
        }>;
      }) => {
        const existing = orderItems.get(where.id)!;
        const updated = { ...existing, ...data };
        orderItems.set(where.id, updated);
        return updated;
      },
      groupBy: async ({
        where,
      }: {
        where: {
          productId: { in: number[] };
          orderId: { not: bigint };
          order: { isHidden: boolean; status: { in: OrderStatus[] } };
        };
      }) => {
        const sums = new Map<number, Prisma.Decimal>();
        for (const item of orderItems.values()) {
          if (item.orderId === where.orderId.not) continue;
          if (!where.productId.in.includes(item.productId)) continue;
          const ord = orders.get(item.orderId);
          if (!ord || ord.isHidden) continue;
          if (!where.order.status.in.includes(ord.status)) continue;

          const cur = sums.get(item.productId) ?? new Prisma.Decimal(0);
          sums.set(item.productId, cur.add(item.qtyFromStock));
        }

        return Array.from(sums.entries()).map(([productId, qtyFromStock]) => ({
          productId,
          _sum: { qtyFromStock },
        }));
      },
      findMany: async ({
        where,
      }: {
        where: {
          orderId: { not: bigint };
          qtyToProduce: { gt: Prisma.Decimal };
          order: { isHidden: boolean; status: OrderStatus };
        };
      }) => {
        const results: Array<{
          qtyToProduce: Prisma.Decimal;
          product: {
            recipeItems: Array<{ materialId: number; qty: Prisma.Decimal }>;
          };
        }> = [];

        for (const item of orderItems.values()) {
          if (item.orderId === where.orderId.not) continue;
          if (item.qtyToProduce.lte(where.qtyToProduce.gt)) continue;
          const ord = orders.get(item.orderId);
          if (!ord || ord.isHidden || ord.status !== where.order.status) {
            continue;
          }
          const prod = products.get(item.productId)!;
          results.push({
            qtyToProduce: item.qtyToProduce,
            product: {
              recipeItems: prod.recipeItems.map((r) => ({
                materialId: r.materialId,
                qty: r.qty,
              })),
            },
          });
        }

        return results;
      },
    },
    stockMovement: {
      groupBy: async ({
        by,
        where,
      }: {
        by: string[];
        where: { productId?: { in: number[] }; materialId?: { in: number[] } };
      }) => {
        if (by.includes('productId') && where.productId) {
          const map = new Map<string, { productId: number; movementType: StockMovementType; qty: Prisma.Decimal }>();
          for (const mv of stockMovements) {
            if (mv.productId === null || !where.productId.in.includes(mv.productId)) {
              continue;
            }
            const key = `${mv.productId}_${mv.movementType}`;
            const cur = map.get(key);
            if (cur) {
              cur.qty = cur.qty.add(mv.qty);
            } else {
              map.set(key, {
                productId: mv.productId,
                movementType: mv.movementType,
                qty: mv.qty,
              });
            }
          }
          return Array.from(map.values()).map((v) => ({
            productId: v.productId,
            movementType: v.movementType,
            _sum: { qty: v.qty },
          }));
        }

        if (by.includes('materialId') && where.materialId) {
          const map = new Map<string, { materialId: number; movementType: StockMovementType; qty: Prisma.Decimal }>();
          for (const mv of stockMovements) {
            if (mv.materialId === null || !where.materialId.in.includes(mv.materialId)) {
              continue;
            }
            const key = `${mv.materialId}_${mv.movementType}`;
            const cur = map.get(key);
            if (cur) {
              cur.qty = cur.qty.add(mv.qty);
            } else {
              map.set(key, {
                materialId: mv.materialId,
                movementType: mv.movementType,
                qty: mv.qty,
              });
            }
          }
          return Array.from(map.values()).map((v) => ({
            materialId: v.materialId,
            movementType: v.movementType,
            _sum: { qty: v.qty },
          }));
        }

        return [];
      },
      create: async ({
        data,
      }: {
        data: {
          movementDate: Date;
          movementType: StockMovementType;
          productId?: number | null;
          materialId?: number | null;
          qty: Prisma.Decimal;
          refTable?: string | null;
          refId?: bigint | null;
          note?: string | null;
          createdBy: number;
        };
      }) => {
        const mv = {
          id: nextMovementId++,
          movementDate: data.movementDate,
          movementType: data.movementType,
          productId: data.productId ?? null,
          materialId: data.materialId ?? null,
          qty: data.qty,
          refTable: data.refTable ?? null,
          refId: data.refId ?? null,
          note: data.note ?? null,
          createdBy: data.createdBy,
        };
        stockMovements.push(mv);
        return mv;
      },
    },
  };

  return {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      return fn(txClient);
    },
  } as unknown as PrismaService;
}

async function runSimulation(): Promise<void> {
  const prismaMock = createInMemoryPrismaMock();
  const approvalService = new OrderApprovalService(prismaMock);
  const productionService = new ProductionService(prismaMock);
  const ordersService = new OrdersService(prismaMock);

  console.log('================================================================');
  console.log('KIỂM THỬ LUỒNG DUYỆT ĐƠN XANH - VÀNG - ĐỎ & SẢN XUẤT - ĐƠN BÙ');
  console.log('================================================================');
  console.log('Tồn kho đầu kỳ:');
  console.log(' - Thành phẩm [SP-XX-500G]: 50.000 gói');
  console.log(' - Nguyên liệu [NL-HEO-01]: 45.000 kg (BOM: 0.4500 kg/gói)');
  console.log(' - Nguyên liệu [NL-GIAVI-02]: 10.000 kg (BOM: 0.0500 kg/gói)\n');

  // 1. Duyệt đơn #1 (Đặt 30 gói <= 50 gói tồn kho TP -> XANH)
  const res1 = await approvalService.approveOrder(1, 1);
  console.log('1) Kết quả duyệt Đơn #1 (Đặt 30 gói):');
  console.log(`   - checkLevel : ${res1.checkLevel.toUpperCase()} (${res1.status})`);
  console.log(
    `   - Phân bổ    : Lấy từ kho = ${res1.itemAllocations[0]?.qtyFromStock} gói | Cần SX = ${res1.itemAllocations[0]?.qtyToProduce} gói`,
  );
  console.log(`   - Thông báo  : ${res1.message}\n`);

  // 2. Duyệt đơn #2 (Đặt 100 gói -> Kho TP còn 20 gói, cần SX 80 gói -> cần 36kg thịt heo <= 45kg -> VÀNG)
  const res2 = await approvalService.approveOrder(2, 1);
  console.log('2) Kết quả duyệt Đơn #2 (Đặt 100 gói):');
  console.log(`   - checkLevel : ${res2.checkLevel.toUpperCase()} (${res2.status})`);
  console.log(
    `   - Phân bổ    : Lấy từ kho = ${res2.itemAllocations[0]?.qtyFromStock} gói | Cần SX = ${res2.itemAllocations[0]?.qtyToProduce} gói`,
  );
  console.log(`   - Thông báo  : ${res2.message}\n`);

  // 3. Duyệt đơn #3 (Đặt 50 gói -> Kho TP còn 0, cần SX 50 gói -> cần 22.5kg thịt heo > 9kg còn lại -> ĐỎ / BLOCKED)
  const res3 = await approvalService.approveOrder(3, 1);
  console.log('3) Kết quả duyệt Đơn #3 (Đặt 50 gói):');
  console.log(`   - checkLevel : ${res3.checkLevel.toUpperCase()} (${res3.status})`);
  console.log(`   - Thông báo  : ${res3.message}`);
  console.log(
    `   - Chi tiết NL thiếu:`,
    JSON.stringify(res3.materialShortages, null, 2),
  );

  // 4. Bếp hoàn tất sản xuất Đơn #2 (trừ 36kg thịt heo + 4kg gia vị, nhập 80 gói TP)
  const prodRes = await productionService.completeOrderProduction(2, 1);
  console.log('\n4) Kết quả Bếp hoàn tất sản xuất Đơn #2:');
  console.log(`   - Status mới : ${prodRes.status}`);
  console.log(`   - Thông báo  : ${prodRes.message}`);

  // 5. Xuất giao Đơn #2 (Đặt 100 gói nhưng giao thực tế 92 gói -> Thiếu 8 gói, chọn 'compensate' -> Tự động sinh Đơn bù)
  const deliverRes = await ordersService.deliverOrder(
    2,
    {
      items: [
        {
          orderItemId: 1002,
          qtyDelivered: '92.000',
          shortAction: ShortAction.compensate,
        },
      ],
    },
    1,
  );
  console.log('\n5) Kết quả Giao hàng Đơn #2 (Giao 92/100 gói - Tạo đơn bù 8 gói):');
  console.log(`   - Mã phiếu giao : ${deliverRes.deliveryCode}`);
  console.log(`   - Mã đơn bù mới : ${deliverRes.compensationOrderCode} (ID #${deliverRes.compensationOrderId})`);
  console.log(`   - Thông báo     : ${deliverRes.message}`);
  console.log('================================================================');
}

void runSimulation();

