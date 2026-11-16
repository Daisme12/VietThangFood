import {
  ApproveOrderResponse,
  BulkApproveGreenYellowResponse,
  PendingOrderForApproval,
} from '../features/orders/types/order-approval.types';
import {
  CreatePurchaseReceiptPayload,
  DailyStocktakeSheetData,
  InventoryCatalogsData,
  InventoryMovementReportData,
  InventoryOverviewData,
  PurchaseReceiptGroup,
  RecordWasteLossPayload,
  RecordWasteLossResponse,
  SubmitDailyStocktakePayload,
  SubmitDailyStocktakeResponse,
  WasteLossLogItem,
} from '../features/inventory/types/inventory.types';
import {
  CustomerDebtReportResponse,
  DebtGroupView,
  ReportFilterCatalogs,
  RevenueBreakdownRow,
  RevenueDimension,
  RevenueReportResponse,
} from '../features/reports/types/reports.types';

const state: {
  orders: PendingOrderForApproval[];
  catalogs: InventoryCatalogsData;
  purchases: PurchaseReceiptGroup[];
  wasteLogs: WasteLossLogItem[];
  materialPhysicalStock: Record<number, number>;
  productPhysicalStock: Record<number, number>;
  materialAdjustments: Record<number, number>;
  productAdjustments: Record<number, number>;
} = {
  catalogs: {
    suppliers: [
      {
        id: 1,
        code: 'NCC-HOANGGIA',
        name: 'Công ty Nguyên Liệu Trà Sữa Hoàng Gia',
        phone: '0909 123 456',
      },
      {
        id: 2,
        code: 'NCC-DAILOC',
        name: 'Nhà Phân Phối Nông Sản & Trà Đại Lộc',
        phone: '0918 888 999',
      },
      {
        id: 3,
        code: 'NCC-BAOBI-VT',
        name: 'Xưởng Bao Bì & Chai Nhựa Việt Thắng',
        phone: '0987 654 321',
      },
    ],
    materials: [
      {
        id: 1,
        code: 'NL-TRA-ASSAM',
        name: 'Hồng trà Assam thượng hạng',
        unit: 'kg',
        minStock: '25.000',
        supplierId: 1,
        supplierName: 'Công ty Nguyên Liệu Trà Sữa Hoàng Gia',
      },
      {
        id: 2,
        code: 'NL-TRA-OLONG',
        name: 'Trà Ô Long rang mộc Đài Loan',
        unit: 'kg',
        minStock: '20.000',
        supplierId: 2,
        supplierName: 'Nhà Phân Phối Nông Sản & Trà Đại Lộc',
      },
      {
        id: 3,
        code: 'NL-BOT-SUA',
        name: 'Bột kem béo thực vật Indo',
        unit: 'kg',
        minStock: '60.000',
        supplierId: 1,
        supplierName: 'Công ty Nguyên Liệu Trà Sữa Hoàng Gia',
      },
      {
        id: 4,
        code: 'NL-TRANCHAU',
        name: 'Trân châu hoàng kim đường đen',
        unit: 'kg',
        minStock: '40.000',
        supplierId: 1,
        supplierName: 'Công ty Nguyên Liệu Trà Sữa Hoàng Gia',
      },
      {
        id: 5,
        code: 'NL-DUONG-MIA',
        name: 'Сиrô đường mía nguyên chất',
        unit: 'lít',
        minStock: '50.000',
        supplierId: 2,
        supplierName: 'Nhà Phân Phối Nông Sản & Trà Đại Lộc',
      },
    ],
    products: [
      {
        id: 101,
        code: 'TP-TS-ASSAM-1L',
        name: 'Cốt Trà Sữa Assam Truyền Thống (Chai 1L)',
        unit: 'chai',
        packageSpec: '1 Lít / chai',
        safetyStock: '40.000',
        categoryName: 'Cốt trà sữa đóng chai',
      },
      {
        id: 102,
        code: 'TP-TS-OLONG-1L',
        name: 'Cốt Trà Sữa Ô Long Rang Mộc (Chai 1L)',
        unit: 'chai',
        packageSpec: '1 Lít / chai',
        safetyStock: '30.000',
        categoryName: 'Cốt trà sữa đóng chai',
      },
      {
        id: 103,
        code: 'TP-TC-HOANGKIM',
        name: 'Topping Trân Châu Hoàng Kim Ủ Sẵn (Túi 2kg)',
        unit: 'túi',
        packageSpec: '2 kg / túi',
        safetyStock: '25.000',
        categoryName: 'Topping đóng gói',
      },
    ],
  },
  materialPhysicalStock: {
    1: 42.5,
    2: 28.0,
    3: 48.0, // Dưới minStock (60.0) -> Hiển thị Badge Đỏ ở Trang 14
    4: 31.0, // Dưới minStock (40.0) -> Hiển thị Badge Đỏ ở Trang 14
    5: 85.0,
  },
  productPhysicalStock: {
    101: 65.0,
    102: 24.0,
    103: 40.0,
  },
  materialAdjustments: {
    1: -0.5,
    2: 0,
    3: 0,
    4: -1.0,
    5: 0,
  },
  productAdjustments: {
    101: 0,
    102: 0,
    103: 0,
  },
  orders: [
    {
      id: '100',
      code: 'ORD-2026-080',
      orderType: 'standard',
      parentOrderCode: null,
      customerId: 1,
      customerCode: 'KH-TEAHOUSE',
      customerName: 'Chuỗi Trà Sữa Royal Tea House',
      locationId: 11,
      locationName: 'Cơ sở Quận 1 - Nguyễn Huệ',
      locationAddress: '88 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
      orderDate: '2026-11-09',
      deliveryAt: '2026-11-10T07:30:00.000Z',
      status: 'pending',
      checkLevel: 'green',
      totalBeforeVat: '1700000.00',
      totalVat: '170000.00',
      totalAmount: '1870000.00',
      note: 'Đơn đầu tuần ngày 09/11',
      items: [
        {
          id: '1000',
          productId: 101,
          productCode: 'TP-TS-ASSAM-1L',
          productName: 'Cốt Trà Sữa Assam Truyền Thống (Chai 1L)',
          packageSpec: '1 Lít / chai',
          unit: 'chai',
          qtyOrdered: '20.000',
          unitPrice: '85000.00',
          vatRate: '10.00',
          qtyFromStock: '20.000',
          qtyToProduce: '0.000',
        },
      ],
      materialShortages: [],
    },
    {
      id: '101',
      code: 'ORD-2026-081',
      orderType: 'standard',
      parentOrderCode: null,
      customerId: 1,
      customerCode: 'KH-TEAHOUSE',
      customerName: 'Chuỗi Trà Sữa Royal Tea House',
      locationId: 11,
      locationName: 'Cơ sở Quận 1 - Nguyễn Huệ',
      locationAddress: '88 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
      orderDate: '2026-11-16',
      deliveryAt: '2026-11-17T07:30:00.000Z',
      status: 'pending',
      checkLevel: 'green',
      totalBeforeVat: '3900000.00',
      totalVat: '390000.00',
      totalAmount: '4290000.00',
      note: 'Giao trước 8h sáng trước giờ mở cửa quán',
      items: [
        {
          id: '1001',
          productId: 101,
          productCode: 'TP-TS-ASSAM-1L',
          productName: 'Cốt Trà Sữa Assam Truyền Thống (Chai 1L)',
          packageSpec: '1 Lít / chai',
          unit: 'chai',
          qtyOrdered: '30.000',
          unitPrice: '85000.00',
          vatRate: '10.00',
          qtyFromStock: '30.000',
          qtyToProduce: '0.000',
        },
        {
          id: '1002',
          productId: 103,
          productCode: 'TP-TC-HOANGKIM',
          productName: 'Topping Trân Châu Hoàng Kim Ủ Sẵn (Túi 2kg)',
          packageSpec: '2 kg / túi',
          unit: 'túi',
          qtyOrdered: '15.000',
          unitPrice: '90000.00',
          vatRate: '10.00',
          qtyFromStock: '15.000',
          qtyToProduce: '0.000',
        },
      ],
      materialShortages: [],
    },
    {
      id: '102',
      code: 'ORD-2026-082',
      orderType: 'compensation',
      parentOrderCode: 'ORD-2026-065',
      customerId: 2,
      customerCode: 'KH-BOBAPOP',
      customerName: 'Hệ Thống Trà Tươi BobaPop Sài Gòn',
      locationId: 21,
      locationName: 'Chi nhánh Phan Xích Long - Phú Nhuận',
      locationAddress: '142 Phan Xích Long, P.2, Q. Phú Nhuận, TP.HCM',
      orderDate: '2026-11-16',
      deliveryAt: '2026-11-17T09:00:00.000Z',
      status: 'pending',
      checkLevel: 'green',
      totalBeforeVat: '1700000.00',
      totalVat: '170000.00',
      totalAmount: '1870000.00',
      note: 'Đơn bù hàng thiếu đợt giao ngày 08/11',
      items: [
        {
          id: '1003',
          productId: 101,
          productCode: 'TP-TS-ASSAM-1L',
          productName: 'Cốt Trà Sữa Assam Truyền Thống (Chai 1L)',
          packageSpec: '1 Lít / chai',
          unit: 'chai',
          qtyOrdered: '20.000',
          unitPrice: '85000.00',
          vatRate: '10.00',
          qtyFromStock: '20.000',
          qtyToProduce: '0.000',
        },
      ],
      materialShortages: [],
    },
    {
      id: '103',
      code: 'ORD-2026-083',
      orderType: 'standard',
      parentOrderCode: null,
      customerId: 3,
      customerCode: 'KH-KOITHE',
      customerName: 'Đối Tác Nhượng Quyền Trà Sữa Đài Loan',
      locationId: 31,
      locationName: 'Kho Trung Tâm Thảo Điền - TP. Thủ Đức',
      locationAddress: '25 Xuân Thủy, P. Thảo Điền, TP. Thủ Đức',
      orderDate: '2026-11-16',
      deliveryAt: '2026-11-17T10:30:00.000Z',
      status: 'pending',
      checkLevel: 'yellow',
      totalBeforeVat: '5700000.00',
      totalVat: '570000.00',
      totalAmount: '6270000.00',
      note: 'Cần nấu thêm 36 chai Ô Long từ nguyên liệu BOM trong kho',
      items: [
        {
          id: '1004',
          productId: 102,
          productCode: 'TP-TS-OLONG-1L',
          productName: 'Cốt Trà Sữa Ô Long Rang Mộc (Chai 1L)',
          packageSpec: '1 Lít / chai',
          unit: 'chai',
          qtyOrdered: '60.000',
          unitPrice: '95000.00',
          vatRate: '10.00',
          qtyFromStock: '24.000',
          qtyToProduce: '36.000',
        },
      ],
      materialShortages: [],
    },
    {
      id: '104',
      code: 'ORD-2026-084',
      orderType: 'standard',
      parentOrderCode: null,
      customerId: 1,
      customerCode: 'KH-TEAHOUSE',
      customerName: 'Chuỗi Trà Sữa Royal Tea House',
      locationId: 12,
      locationName: 'Cơ sở Quận 7 - Crescent Mall',
      locationAddress: '101 Tôn Dật Tiên, P. Tân Phú, Quận 7, TP.HCM',
      orderDate: '2026-11-17',
      deliveryAt: '2026-11-18T14:00:00.000Z',
      status: 'blocked',
      checkLevel: 'red',
      totalBeforeVat: '11250000.00',
      totalVat: '1125000.00',
      totalAmount: '12375000.00',
      note: 'Đơn sỉ cuối tuần số lượng lớn',
      items: [
        {
          id: '1005',
          productId: 103,
          productCode: 'TP-TC-HOANGKIM',
          productName: 'Topping Trân Châu Hoàng Kim Ủ Sẵn (Túi 2kg)',
          packageSpec: '2 kg / túi',
          unit: 'túi',
          qtyOrdered: '125.000',
          unitPrice: '90000.00',
          vatRate: '10.00',
          qtyFromStock: '25.000',
          qtyToProduce: '100.000',
        },
      ],
      materialShortages: [
        {
          materialId: 4,
          materialCode: 'NL-TRANCHAU',
          materialName: 'Trân châu hoàng kim đường đen',
          unit: 'kg',
          requiredQty: '85.000',
          availableQty: '31.000',
          shortageQty: '54.000',
          affectedProducts: [
            {
              productId: 103,
              productCode: 'TP-TC-HOANGKIM',
              productName: 'Topping Trân Châu Hoàng Kim Ủ Sẵn (Túi 2kg)',
              qtyToProduce: '100.000',
              bomQtyPerUnit: '0.8500',
              materialRequiredForProduct: '85.000',
            },
          ],
        },
        {
          materialId: 3,
          materialCode: 'NL-BOT-SUA',
          materialName: 'Bột kem béo thực vật Indo',
          unit: 'kg',
          requiredQty: '62.000',
          availableQty: '48.000',
          shortageQty: '14.000',
          affectedProducts: [
            {
              productId: 101,
              productCode: 'TP-TS-ASSAM-1L',
              productName: 'Cốt Trà Sữa Assam Truyền Thống (Chai 1L)',
              qtyToProduce: '100.000',
              bomQtyPerUnit: '0.6200',
              materialRequiredForProduct: '62.000',
            },
          ],
        },
      ],
    },
  ],
  purchases: [
    {
      receiptCode: 'PN-20261109-01',
      receiptDate: '2026-11-09',
      supplierId: 1,
      supplierCode: 'NCC-HOANGGIA',
      supplierName: 'Công ty Nguyên Liệu Trà Sữa Hoàng Gia',
      createdBy: 1,
      createdByName: 'Trần Minh Quân (Thủ kho)',
      createdAt: '2026-11-09T08:15:00.000Z',
      totalAmount: '11250000.00',
      lineCount: 2,
      lines: [
        {
          id: '501',
          receiptCode: 'PN-20261109-01',
          receiptDate: '2026-11-09',
          materialId: 1,
          materialCode: 'NL-TRA-ASSAM',
          materialName: 'Hồng trà Assam thượng hạng',
          unit: 'kg',
          qty: '30.000',
          unitPrice: '220000.00',
          lineTotal: '6600000.00',
          note: 'Lô trà thu hoạch vụ Thu 2026',
        },
        {
          id: '502',
          receiptCode: 'PN-20261109-01',
          receiptDate: '2026-11-09',
          materialId: 3,
          materialCode: 'NL-BOT-SUA',
          materialName: 'Bột kem béo thực vật Indo',
          unit: 'kg',
          qty: '50.000',
          unitPrice: '93000.00',
          lineTotal: '4650000.00',
          note: 'Bao nguyên đai 25kg x 2',
        },
      ],
    },
    {
      receiptCode: 'PN-20261107-02',
      receiptDate: '2026-11-07',
      supplierId: 2,
      supplierCode: 'NCC-DAILOC',
      supplierName: 'Nhà Phân Phối Nông Sản & Trà Đại Lộc',
      createdBy: 1,
      createdByName: 'Trần Minh Quân (Thủ kho)',
      createdAt: '2026-11-07T14:20:00.000Z',
      totalAmount: '8600000.00',
      lineCount: 2,
      lines: [
        {
          id: '503',
          receiptCode: 'PN-20261107-02',
          receiptDate: '2026-11-07',
          materialId: 2,
          materialCode: 'NL-TRA-OLONG',
          materialName: 'Trà Ô Long rang mộc Đài Loan',
          unit: 'kg',
          qty: '20.000',
          unitPrice: '310000.00',
          lineTotal: '6200000.00',
          note: 'Trà Ô Long nguyên lá',
        },
        {
          id: '504',
          receiptCode: 'PN-20261107-02',
          receiptDate: '2026-11-07',
          materialId: 5,
          materialCode: 'NL-DUONG-MIA',
          materialName: 'Sirô đường mía nguyên chất',
          unit: 'lít',
          qty: '60.000',
          unitPrice: '40000.00',
          lineTotal: '2400000.00',
          note: 'Can 20 lít x 3',
        },
      ],
    },
  ],
  wasteLogs: [
    {
      id: '901',
      movementDate: '2026-11-09',
      targetType: 'material',
      targetId: 1,
      code: 'NL-TRA-ASSAM',
      name: 'Hồng trà Assam thượng hạng',
      unit: 'kg',
      qty: '1.500',
      reason: 'Rách túi hút chân không khi bốc xếp lên kệ kho B',
      createdByName: 'Trần Minh Quân (Thủ kho)',
      createdAt: '2026-11-09T11:30:00.000Z',
    },
    {
      id: '902',
      movementDate: '2026-11-08',
      targetType: 'product',
      targetId: 101,
      code: 'TP-TS-ASSAM-1L',
      name: 'Cốt Trà Sữa Assam Truyền Thống (Chai 1L)',
      unit: 'chai',
      qty: '3.000',
      reason: 'Hết hạn bảo quản lạnh 48h ca tối',
      createdByName: 'Lê Hoàng Nam (Bếp trưởng)',
      createdAt: '2026-11-08T21:45:00.000Z',
    },
  ],
};

export const mockErpStore = {
  getPendingOrders(): PendingOrderForApproval[] {
    return [...state.orders];
  },

  approveSingleOrder(orderId: number): ApproveOrderResponse {
    const idx = state.orders.findIndex((o) => Number(o.id) === orderId);
    if (idx === -1) {
      throw new Error(`Không tìm thấy đơn hàng #${orderId}`);
    }
    const target = state.orders[idx]!;
    const isRed = target.checkLevel === 'red';
    state.orders.splice(idx, 1);

    return {
      orderId: target.id,
      orderCode: target.code,
      previousStatus: target.status,
      status: 'approved',
      checkLevel: target.checkLevel,
      approvedBy: 1,
      evaluatedAt: new Date().toISOString(),
      itemAllocations: target.items.map((item) => ({
        orderItemId: item.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        qtyOrdered: item.qtyOrdered,
        availableProductStockBefore: item.qtyFromStock,
        qtyFromStock: isRed ? '0.000' : item.qtyFromStock,
        qtyToProduce: item.qtyToProduce,
      })),
      materialShortages: target.materialShortages,
      message: isRed
        ? `Đơn hàng ${target.code} ở trạng thái ĐỎ (Thiếu ${target.materialShortages.length} loại nguyên liệu BOM). Đã chuyển sang trạng thái 'blocked'.`
        : `Đã duyệt thành công đơn hàng ${target.code} (Mức ${target.checkLevel.toUpperCase()}) và giữ tồn kho tức thì!`,
    };
  },

  approveBulkGreenYellow(orderIds: number[]): BulkApproveGreenYellowResponse {
    const approvedOrders: ApproveOrderResponse[] = [];
    const blockedOrders: ApproveOrderResponse[] = [];

    for (const id of orderIds) {
      const found = state.orders.find((o) => Number(o.id) === id);
      if (!found) continue;
      const res = this.approveSingleOrder(id);
      if (res.status === 'approved') {
        approvedOrders.push(res);
      } else {
        blockedOrders.push(res);
      }
    }

    return { approvedOrders, blockedOrders };
  },

  getCatalogs(): InventoryCatalogsData {
    return state.catalogs;
  },

  getOverview(): InventoryOverviewData {
    return {
      products: state.catalogs.products.map((p) => {
        const physical = state.productPhysicalStock[p.id] ?? 0;
        const reserved = 10;
        const available = Math.max(0, physical - reserved);
        return {
          productId: p.id,
          code: p.code,
          name: p.name,
          unit: p.unit,
          safetyStock: p.safetyStock,
          physicalQty: physical.toFixed(3),
          reservedQty: reserved.toFixed(3),
          availableQty: available.toFixed(3),
          isBelowSafetyStock: available < Number(p.safetyStock),
        };
      }),
      materials: state.catalogs.materials.map((m) => {
        const physical = state.materialPhysicalStock[m.id] ?? 0;
        const reserved = 4;
        const available = Math.max(0, physical - reserved);
        return {
          materialId: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          minStock: m.minStock,
          physicalQty: physical.toFixed(3),
          reservedQty: reserved.toFixed(3),
          availableQty: available.toFixed(3),
          isBelowMinStock: available < Number(m.minStock),
        };
      }),
    };
  },

  getPurchases(): PurchaseReceiptGroup[] {
    return [...state.purchases];
  },

  createPurchase(payload: CreatePurchaseReceiptPayload): PurchaseReceiptGroup {
    const supplier =
      state.catalogs.suppliers.find((s) => s.id === payload.supplierId) ??
      state.catalogs.suppliers[0]!;
    const code =
      payload.receiptCode?.trim() ||
      `PN-${payload.receiptDate.replace(/-/g, '')}-${String(state.purchases.length + 1).padStart(2, '0')}`;

    let total = 0;
    const lines = payload.items.map((item, idx) => {
      const mat =
        state.catalogs.materials.find((m) => m.id === item.materialId) ??
        state.catalogs.materials[0]!;
      const qtyNum = Number(item.qty) || 0;
      const priceNum = Number(item.unitPrice) || 0;
      const lineTotal = qtyNum * priceNum;
      total += lineTotal;

      state.materialPhysicalStock[mat.id] =
        (state.materialPhysicalStock[mat.id] ?? 0) + qtyNum;

      return {
        id: `${Date.now()}-${idx}`,
        receiptCode: code,
        receiptDate: payload.receiptDate,
        materialId: mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        unit: mat.unit,
        qty: qtyNum.toFixed(3),
        unitPrice: priceNum.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        note: item.note ?? payload.note ?? null,
      };
    });

    const createdGroup: PurchaseReceiptGroup = {
      receiptCode: code,
      receiptDate: payload.receiptDate,
      supplierId: supplier.id,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      createdBy: 1,
      createdByName: 'Quản trị viên VietThangFood',
      createdAt: new Date().toISOString(),
      totalAmount: total.toFixed(2),
      lineCount: lines.length,
      lines,
    };

    state.purchases.unshift(createdGroup);
    return createdGroup;
  },

  getStocktakeSheet(date?: string): DailyStocktakeSheetData {
    const stocktakeDate = date || new Date().toISOString().slice(0, 10);
    return {
      stocktakeDate,
      products: state.catalogs.products.map((p) => ({
        targetType: 'product',
        targetId: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        categoryOrSupplierName: p.categoryName,
        minOrSafetyStock: p.safetyStock,
        systemStock: (state.productPhysicalStock[p.id] ?? 0).toFixed(3),
      })),
      materials: state.catalogs.materials.map((m) => ({
        targetType: 'material',
        targetId: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        categoryOrSupplierName: m.supplierName ?? 'NCC Hoàng Gia',
        minOrSafetyStock: m.minStock,
        systemStock: (state.materialPhysicalStock[m.id] ?? 0).toFixed(3),
      })),
    };
  },

  submitStocktake(
    payload: SubmitDailyStocktakePayload,
  ): SubmitDailyStocktakeResponse {
    const adjustments: SubmitDailyStocktakeResponse['adjustments'] = [];

    for (const item of payload.items) {
      const actualNum = Number(item.actualStock) || 0;
      if (item.targetType === 'product') {
        const sysNum = state.productPhysicalStock[item.targetId] ?? 0;
        const diff = actualNum - sysNum;
        if (Math.abs(diff) >= 0.001) {
          state.productPhysicalStock[item.targetId] = actualNum;
          state.productAdjustments[item.targetId] =
            (state.productAdjustments[item.targetId] ?? 0) + diff;
          adjustments.push({
            movementId: String(Date.now() + item.targetId),
            targetType: 'product',
            targetId: item.targetId,
            systemStock: sysNum.toFixed(3),
            actualStock: actualNum.toFixed(3),
            diffQty: diff.toFixed(3),
          });
        }
      } else {
        const sysNum = state.materialPhysicalStock[item.targetId] ?? 0;
        const diff = actualNum - sysNum;
        if (Math.abs(diff) >= 0.001) {
          state.materialPhysicalStock[item.targetId] = actualNum;
          state.materialAdjustments[item.targetId] =
            (state.materialAdjustments[item.targetId] ?? 0) + diff;
          adjustments.push({
            movementId: String(Date.now() + item.targetId),
            targetType: 'material',
            targetId: item.targetId,
            systemStock: sysNum.toFixed(3),
            actualStock: actualNum.toFixed(3),
            diffQty: diff.toFixed(3),
          });
        }
      }
    }

    return {
      stocktakeDate: payload.stocktakeDate,
      totalCheckedItems: payload.items.length,
      adjustedCount: adjustments.length,
      adjustments,
      message:
        adjustments.length > 0
          ? `Đã chốt kiểm kê ngày ${payload.stocktakeDate}: Ghi nhận ${adjustments.length} bút toán điều chỉnh (adjustment) vào thẻ kho!`
          : `Đã chốt kiểm kê ngày ${payload.stocktakeDate}: Tồn thực tế khớp 100% với tồn hệ thống.`,
    };
  },

  getWasteLossHistory(): WasteLossLogItem[] {
    return [...state.wasteLogs];
  },

  recordWasteLoss(payload: RecordWasteLossPayload): RecordWasteLossResponse {
    const qtyNum = Number(payload.qty) || 0;
    if (payload.targetType === 'product') {
      const prod =
        state.catalogs.products.find((p) => p.id === payload.targetId) ??
        state.catalogs.products[0]!;
      const cur = state.productPhysicalStock[prod.id] ?? 0;
      const next = Math.max(0, cur - qtyNum);
      state.productPhysicalStock[prod.id] = next;

      const logItem: WasteLossLogItem = {
        id: String(Date.now()),
        movementDate: payload.movementDate,
        targetType: 'product',
        targetId: prod.id,
        code: prod.code,
        name: prod.name,
        unit: prod.unit,
        qty: qtyNum.toFixed(3),
        reason: payload.reason,
        createdByName: 'Quản trị viên VietThangFood',
        createdAt: new Date().toISOString(),
      };
      state.wasteLogs.unshift(logItem);

      return {
        id: logItem.id,
        movementDate: payload.movementDate,
        targetType: 'product',
        targetId: prod.id,
        code: prod.code,
        name: prod.name,
        unit: prod.unit,
        qty: qtyNum.toFixed(3),
        remainingStock: next.toFixed(3),
        reason: payload.reason,
        message: `Đã ghi nhận hủy/hao hụt ${qtyNum.toFixed(3)} ${prod.unit} "${prod.name}". Tồn kho còn lại: ${next.toFixed(3)} ${prod.unit}.`,
      };
    }

    const mat =
      state.catalogs.materials.find((m) => m.id === payload.targetId) ??
      state.catalogs.materials[0]!;
    const cur = state.materialPhysicalStock[mat.id] ?? 0;
    const next = Math.max(0, cur - qtyNum);
    state.materialPhysicalStock[mat.id] = next;

    const logItem: WasteLossLogItem = {
      id: String(Date.now()),
      movementDate: payload.movementDate,
      targetType: 'material',
      targetId: mat.id,
      code: mat.code,
      name: mat.name,
      unit: mat.unit,
      qty: qtyNum.toFixed(3),
      reason: payload.reason,
      createdByName: 'Quản trị viên VietThangFood',
      createdAt: new Date().toISOString(),
    };
    state.wasteLogs.unshift(logItem);

    return {
      id: logItem.id,
      movementDate: payload.movementDate,
      targetType: 'material',
      targetId: mat.id,
      code: mat.code,
      name: mat.name,
      unit: mat.unit,
      qty: qtyNum.toFixed(3),
      remainingStock: next.toFixed(3),
      reason: payload.reason,
      message: `Đã ghi nhận hủy/hao hụt ${qtyNum.toFixed(3)} ${mat.unit} "${mat.name}". Tồn kho còn lại: ${next.toFixed(3)} ${mat.unit}.`,
    };
  },

  getInventoryReport(): InventoryMovementReportData {
    const today = new Date().toISOString().slice(0, 10);
    return {
      fromDate: `${today.slice(0, 8)}01`,
      toDate: today,
      products: state.catalogs.products.map((p) => {
        const closing = state.productPhysicalStock[p.id] ?? 0;
        const adj = state.productAdjustments[p.id] ?? 0;
        const opening = Math.max(0, closing - 40 + 25 - adj);
        return {
          targetType: 'product',
          id: p.id,
          code: p.code,
          name: p.name,
          unit: p.unit,
          minStock: p.safetyStock,
          openingStock: opening.toFixed(3),
          importQty: '0.000',
          productionQty: '40.000',
          exportDeliveryQty: '22.000',
          wasteLossQty: '3.000',
          adjustmentQty: adj.toFixed(3),
          closingStock: closing.toFixed(3),
          isBelowMinStock: closing < Number(p.safetyStock),
        };
      }),
      materials: state.catalogs.materials.map((m) => {
        const closing = state.materialPhysicalStock[m.id] ?? 0;
        const adj = state.materialAdjustments[m.id] ?? 0;
        const opening = Math.max(0, closing - 30 + 18.5 - adj);
        return {
          targetType: 'material',
          id: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          minStock: m.minStock,
          openingStock: opening.toFixed(3),
          importQty: '30.000',
          productionQty: '17.000',
          exportDeliveryQty: '0.000',
          wasteLossQty: '1.500',
          adjustmentQty: adj.toFixed(3),
          closingStock: closing.toFixed(3),
          isBelowMinStock: closing < Number(m.minStock),
        };
      }),
    };
  },

  getReportCatalogs(): ReportFilterCatalogs {
    return {
      customers: [
        {
          id: 1,
          code: 'KH-TEAHOUSE',
          name: 'Chuỗi Trà Sữa Royal Tea House',
          taxCode: '0315892411',
          phone: '0908 111 222',
        },
        {
          id: 2,
          code: 'KH-BOBAPOP',
          name: 'Hệ Thống Trà Tươi BobaPop Sài Gòn',
          taxCode: '0314455667',
          phone: '0903 333 444',
        },
        {
          id: 3,
          code: 'KH-KOITHE',
          name: 'Đối Tác Nhượng Quyền Trà Sữa Đài Loan',
          taxCode: '0319988776',
          phone: '0919 555 666',
        },
      ],
      locations: [
        {
          id: 11,
          customerId: 1,
          customerCode: 'KH-TEAHOUSE',
          customerName: 'Chuỗi Trà Sữa Royal Tea House',
          name: 'Cơ sở Quận 1 - Nguyễn Huệ',
          address: '88 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
          receiverName: 'Anh Tuấn (Cửa hàng trưởng)',
          receiverPhone: '0908 111 222',
        },
        {
          id: 12,
          customerId: 1,
          customerCode: 'KH-TEAHOUSE',
          customerName: 'Chuỗi Trà Sữa Royal Tea House',
          name: 'Cơ sở Quận 7 - Crescent Mall',
          address: '101 Tôn Dật Tiên, P. Tân Phú, Quận 7, TP.HCM',
          receiverName: 'Chị Lan (Quản lý ca)',
          receiverPhone: '0908 111 333',
        },
        {
          id: 21,
          customerId: 2,
          customerCode: 'KH-BOBAPOP',
          customerName: 'Hệ Thống Trà Tươi BobaPop Sài Gòn',
          name: 'Chi nhánh Phan Xích Long - Phú Nhuận',
          address: '142 Phan Xích Long, P.2, Q. Phú Nhuận, TP.HCM',
          receiverName: 'Anh Khoa',
          receiverPhone: '0903 333 444',
        },
      ],
      categories: [
        { id: 1, name: 'Cốt trà sữa đóng chai', sortOrder: 1 },
        { id: 2, name: 'Topping đóng gói', sortOrder: 2 },
      ],
      companyInfo: {
        companyName: 'CÔNG TY TNHH SẢN XUẤT & CHẾ BIẾN THỰC PHẨM VIỆT THẮNG',
        companyAddress: 'Khu Công Nghiệp Tân Bình, Quận Tân Phú, TP. Hồ Chí Minh',
        companyPhone: '028 3815 9999',
        companyTaxCode: '0316889900',
        invoiceFooter:
          'Biên bản được trích xuất tự động từ Hệ thống ERP VietThangFood.',
      },
    };
  },

  getRevenueReport(dimension: RevenueDimension = 'customer'): RevenueReportResponse {
    const byDimension: Record<RevenueDimension, RevenueBreakdownRow[]> = {
      customer: [
        {
          key: 'customer-1',
          dimension: 'customer',
          id: 1,
          code: 'KH-TEAHOUSE',
          name: 'Chuỗi Trà Sữa Royal Tea House',
          subLabel: 'MST: 0315892411 — 2 điểm giao',
          unit: 'đơn',
          orderCount: 14,
          qtyOrdered: '640.000',
          qtyDelivered: '625.000',
          totalBeforeVat: '54250000.00',
          totalVat: '5425000.00',
          totalAmount: '59675000.00',
          sharePercent: '48.20',
        },
        {
          key: 'customer-2',
          dimension: 'customer',
          id: 2,
          code: 'KH-BOBAPOP',
          name: 'Hệ Thống Trà Tươi BobaPop Sài Gòn',
          subLabel: 'MST: 0314455667 — 1 điểm giao',
          unit: 'đơn',
          orderCount: 9,
          qtyOrdered: '420.000',
          qtyDelivered: '410.000',
          totalBeforeVat: '36900000.00',
          totalVat: '3690000.00',
          totalAmount: '40590000.00',
          sharePercent: '32.78',
        },
        {
          key: 'customer-3',
          dimension: 'customer',
          id: 3,
          code: 'KH-KOITHE',
          name: 'Đối Tác Nhượng Quyền Trà Sữa Đài Loan',
          subLabel: 'MST: 0319988776 — 1 điểm giao',
          unit: 'đơn',
          orderCount: 6,
          qtyOrdered: '250.000',
          qtyDelivered: '248.000',
          totalBeforeVat: '21400000.00',
          totalVat: '2140000.00',
          totalAmount: '23540000.00',
          sharePercent: '19.02',
        },
      ],
      location: [
        {
          key: 'location-11',
          dimension: 'location',
          id: 11,
          code: 'LOC-Q1',
          name: 'Cơ sở Quận 1 - Nguyễn Huệ',
          subLabel: 'Chuỗi Trà Sữa Royal Tea House',
          unit: 'đơn',
          orderCount: 8,
          qtyOrdered: '380.000',
          qtyDelivered: '375.000',
          totalBeforeVat: '32500000.00',
          totalVat: '3250000.00',
          totalAmount: '35750000.00',
          sharePercent: '28.88',
        },
        {
          key: 'location-21',
          dimension: 'location',
          id: 21,
          code: 'LOC-PN',
          name: 'Chi nhánh Phan Xích Long - Phú Nhuận',
          subLabel: 'Hệ Thống Trà Tươi BobaPop Sài Gòn',
          unit: 'đơn',
          orderCount: 9,
          qtyOrdered: '420.000',
          qtyDelivered: '410.000',
          totalBeforeVat: '36900000.00',
          totalVat: '3690000.00',
          totalAmount: '40590000.00',
          sharePercent: '32.78',
        },
        {
          key: 'location-12',
          dimension: 'location',
          id: 12,
          code: 'LOC-Q7',
          name: 'Cơ sở Quận 7 - Crescent Mall',
          subLabel: 'Chuỗi Trà Sữa Royal Tea House',
          unit: 'đơn',
          orderCount: 6,
          qtyOrdered: '260.000',
          qtyDelivered: '250.000',
          totalBeforeVat: '21750000.00',
          totalVat: '2175000.00',
          totalAmount: '23925000.00',
          sharePercent: '19.32',
        },
      ],
      product: [
        {
          key: 'product-101',
          dimension: 'product',
          id: 101,
          code: 'TP-TS-ASSAM-1L',
          name: 'Cốt Trà Sữa Assam Truyền Thống (Chai 1L)',
          subLabel: 'Cốt trà sữa đóng chai',
          unit: 'chai',
          orderCount: 22,
          qtyOrdered: '680.000',
          qtyDelivered: '665.000',
          totalBeforeVat: '56525000.00',
          totalVat: '5652500.00',
          totalAmount: '62177500.00',
          sharePercent: '50.22',
        },
        {
          key: 'product-102',
          dimension: 'product',
          id: 102,
          code: 'TP-TS-OLONG-1L',
          name: 'Cốt Trà Sữa Ô Long Rang Mộc (Chai 1L)',
          subLabel: 'Cốt trà sữa đóng chai',
          unit: 'chai',
          orderCount: 15,
          qtyOrdered: '360.000',
          qtyDelivered: '358.000',
          totalBeforeVat: '34010000.00',
          totalVat: '3401000.00',
          totalAmount: '37411000.00',
          sharePercent: '30.22',
        },
        {
          key: 'product-103',
          dimension: 'product',
          id: 103,
          code: 'TP-TC-HOANGKIM',
          name: 'Topping Trân Châu Hoàng Kim Ủ Sẵn (Túi 2kg)',
          subLabel: 'Topping đóng gói',
          unit: 'túi',
          orderCount: 12,
          qtyOrdered: '270.000',
          qtyDelivered: '260.000',
          totalBeforeVat: '22015000.00',
          totalVat: '2201500.00',
          totalAmount: '24216500.00',
          sharePercent: '19.56',
        },
      ],
      category: [
        {
          key: 'cat-1',
          dimension: 'category',
          id: 1,
          code: 'CAT-COT-TRA',
          name: 'Cốt trà sữa đóng chai',
          subLabel: '2 sản phẩm chủ lực',
          unit: 'chai',
          orderCount: 25,
          qtyOrdered: '1040.000',
          qtyDelivered: '1023.000',
          totalBeforeVat: '90535000.00',
          totalVat: '9053500.00',
          totalAmount: '99588500.00',
          sharePercent: '80.44',
        },
        {
          key: 'cat-2',
          dimension: 'category',
          id: 2,
          code: 'CAT-TOPPING',
          name: 'Topping đóng gói',
          subLabel: '1 sản phẩm',
          unit: 'túi',
          orderCount: 12,
          qtyOrdered: '270.000',
          qtyDelivered: '260.000',
          totalBeforeVat: '22015000.00',
          totalVat: '2201500.00',
          totalAmount: '24216500.00',
          sharePercent: '19.56',
        },
      ],
    };

    return {
      period: {
        fromDate: '2026-11-01',
        toDate: '2026-11-09',
        month: '2026-11',
      },
      activeDimension: dimension,
      summary: {
        totalBeforeVat: '112550000.00',
        totalVat: '11255000.00',
        totalAmount: '123805000.00',
        totalDeliveredOrders: 29,
        totalQtyOrdered: '1310.000',
        totalQtyDelivered: '1283.000',
        fulfillmentRatePercent: '97.94',
      },
      rows: byDimension[dimension],
      byDimension,
      dailySeries: [
        {
          date: '2026-11-05',
          orderCount: 5,
          qtyDelivered: '210.000',
          totalBeforeVat: '18500000.00',
          totalVat: '1850000.00',
          totalAmount: '20350000.00',
        },
        {
          date: '2026-11-06',
          orderCount: 6,
          qtyDelivered: '250.000',
          totalBeforeVat: '21800000.00',
          totalVat: '2180000.00',
          totalAmount: '23980000.00',
        },
        {
          date: '2026-11-07',
          orderCount: 5,
          qtyDelivered: '235.000',
          totalBeforeVat: '20450000.00',
          totalVat: '2045000.00',
          totalAmount: '22495000.00',
        },
        {
          date: '2026-11-08',
          orderCount: 7,
          qtyDelivered: '310.000',
          totalBeforeVat: '27200000.00',
          totalVat: '2720000.00',
          totalAmount: '29920000.00',
        },
        {
          date: '2026-11-09',
          orderCount: 6,
          qtyDelivered: '278.000',
          totalBeforeVat: '24600000.00',
          totalVat: '2460000.00',
          totalAmount: '27060000.00',
        },
      ],
    };
  },

  getCustomerDebtReport(groupBy: 'customer' | 'location' = 'location'): CustomerDebtReportResponse {
    const locationGroups: DebtGroupView[] = [
      {
        groupKey: 'location-11',
        groupBy: 'location',
        customerId: 1,
        customerCode: 'KH-TEAHOUSE',
        customerName: 'Chuỗi Trà Sữa Royal Tea House',
        customerTaxCode: '0315892411',
        customerPhone: '0908 111 222',
        locationId: 11,
        locationName: 'Cơ sở Quận 1 - Nguyễn Huệ',
        locationAddress: '88 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
        receiverName: 'Anh Tuấn (Cửa hàng trưởng)',
        receiverPhone: '0908 111 222',
        voucherCount: 2,
        subtotalQtyOrdered: '95.000',
        subtotalQtyDelivered: '92.000',
        subtotalBeforeVat: '7990000.00',
        subtotalVat: '799000.00',
        subtotalAmount: '8789000.00',
        vouchers: [
          {
            orderId: '71',
            orderCode: 'ORD-2026-071',
            orderType: 'standard',
            parentOrderCode: null,
            deliveryCode: 'DLV-2026-071',
            orderDate: '2026-11-07',
            deliveredAt: '2026-11-08T08:10:00.000Z',
            deliveredDate: '2026-11-08',
            customerId: 1,
            customerCode: 'KH-TEAHOUSE',
            customerName: 'Chuỗi Trà Sữa Royal Tea House',
            customerTaxCode: '0315892411',
            customerPhone: '0908 111 222',
            locationId: 11,
            locationName: 'Cơ sở Quận 1 - Nguyễn Huệ',
            locationAddress: '88 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
            receiverName: 'Anh Tuấn (Cửa hàng trưởng)',
            receiverPhone: '0908 111 222',
            note: 'Đã ký nhận đủ tại quầy pha chế',
            totalQtyOrdered: '50.000',
            totalQtyDelivered: '50.000',
            totalBeforeVat: '4250000.00',
            totalVat: '425000.00',
            totalAmount: '4675000.00',
            items: [
              {
                orderItemId: '701',
                productId: 101,
                productCode: 'TP-TS-ASSAM-1L',
                productName: 'Cốt Trà Sữa Assam Truyền Thống (Chai 1L)',
                packageSpec: '1 Lít / chai',
                unit: 'chai',
                qtyOrdered: '50.000',
                qtyDelivered: '50.000',
                qtyShort: '0.000',
                unitPrice: '85000.00',
                vatRate: '10.00',
                lineBeforeVat: '4250000.00',
                lineVat: '425000.00',
                lineTotal: '4675000.00',
              },
            ],
          },
          {
            orderId: '75',
            orderCode: 'ORD-2026-075',
            orderType: 'standard',
            parentOrderCode: null,
            deliveryCode: 'DLV-2026-075',
            orderDate: '2026-11-08',
            deliveredAt: '2026-11-09T07:50:00.000Z',
            deliveredDate: '2026-11-09',
            customerId: 1,
            customerCode: 'KH-TEAHOUSE',
            customerName: 'Chuỗi Trà Sữa Royal Tea House',
            customerTaxCode: '0315892411',
            customerPhone: '0908 111 222',
            locationId: 11,
            locationName: 'Cơ sở Quận 1 - Nguyễn Huệ',
            locationAddress: '88 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
            receiverName: 'Anh Tuấn (Cửa hàng trưởng)',
            receiverPhone: '0908 111 222',
            note: 'Giao thiếu 3 túi trân châu -> Đã tách đơn bù',
            totalQtyOrdered: '45.000',
            totalQtyDelivered: '42.000',
            totalBeforeVat: '3740000.00',
            totalVat: '374000.00',
            totalAmount: '4114000.00',
            items: [
              {
                orderItemId: '702',
                productId: 103,
                productCode: 'TP-TC-HOANGKIM',
                productName: 'Topping Trân Châu Hoàng Kim Ủ Sẵn (Túi 2kg)',
                packageSpec: '2 kg / túi',
                unit: 'túi',
                qtyOrdered: '45.000',
                qtyDelivered: '42.000',
                qtyShort: '3.000',
                unitPrice: '89047.62',
                vatRate: '10.00',
                lineBeforeVat: '3740000.00',
                lineVat: '374000.00',
                lineTotal: '4114000.00',
              },
            ],
          },
        ],
      },
      {
        groupKey: 'location-21',
        groupBy: 'location',
        customerId: 2,
        customerCode: 'KH-BOBAPOP',
        customerName: 'Hệ Thống Trà Tươi BobaPop Sài Gòn',
        customerTaxCode: '0314455667',
        customerPhone: '0903 333 444',
        locationId: 21,
        locationName: 'Chi nhánh Phan Xích Long - Phú Nhuận',
        locationAddress: '142 Phan Xích Long, P.2, Q. Phú Nhuận, TP.HCM',
        receiverName: 'Anh Khoa',
        receiverPhone: '0903 333 444',
        voucherCount: 1,
        subtotalQtyOrdered: '60.000',
        subtotalQtyDelivered: '60.000',
        subtotalBeforeVat: '5700000.00',
        subtotalVat: '570000.00',
        subtotalAmount: '6270000.00',
        vouchers: [
          {
            orderId: '78',
            orderCode: 'ORD-2026-078',
            orderType: 'standard',
            parentOrderCode: null,
            deliveryCode: 'DLV-2026-078',
            orderDate: '2026-11-08',
            deliveredAt: '2026-11-09T09:15:00.000Z',
            deliveredDate: '2026-11-09',
            customerId: 2,
            customerCode: 'KH-BOBAPOP',
            customerName: 'Hệ Thống Trà Tươi BobaPop Sài Gòn',
            customerTaxCode: '0314455667',
            customerPhone: '0903 333 444',
            locationId: 21,
            locationName: 'Chi nhánh Phan Xích Long - Phú Nhuận',
            locationAddress: '142 Phan Xích Long, P.2, Q. Phú Nhuận, TP.HCM',
            receiverName: 'Anh Khoa',
            receiverPhone: '0903 333 444',
            note: 'Giao đủ 60 chai Ô Long',
            totalQtyOrdered: '60.000',
            totalQtyDelivered: '60.000',
            totalBeforeVat: '5700000.00',
            totalVat: '570000.00',
            totalAmount: '6270000.00',
            items: [
              {
                orderItemId: '705',
                productId: 102,
                productCode: 'TP-TS-OLONG-1L',
                productName: 'Cốt Trà Sữa Ô Long Rang Mộc (Chai 1L)',
                packageSpec: '1 Lít / chai',
                unit: 'chai',
                qtyOrdered: '60.000',
                qtyDelivered: '60.000',
                qtyShort: '0.000',
                unitPrice: '95000.00',
                vatRate: '10.00',
                lineBeforeVat: '5700000.00',
                lineVat: '570000.00',
                lineTotal: '6270000.00',
              },
            ],
          },
        ],
      },
    ];

    return {
      period: {
        fromDate: '2026-11-01',
        toDate: '2026-11-09',
        month: '2026-11',
      },
      groupBy,
      sortOrder: 'asc',
      summary: {
        totalVouchers: 3,
        totalCustomers: 2,
        totalLocations: 2,
        totalQtyOrdered: '155.000',
        totalQtyDelivered: '152.000',
        grandTotalBeforeVat: '13690000.00',
        grandTotalVat: '1369000.00',
        grandTotalAmount: '15059000.00',
      },
      groups: locationGroups,
      customerGroups: locationGroups,
      locationGroups,
      companyInfo: this.getReportCatalogs().companyInfo,
    };
  },
};

