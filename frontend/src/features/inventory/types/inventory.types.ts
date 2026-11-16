export type InventoryTargetType = 'product' | 'material';

export interface SupplierCatalogItem {
  id: number;
  code: string;
  name: string;
  phone: string | null;
}

export interface MaterialCatalogItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  minStock: string;
  supplierId: number | null;
  supplierName: string | null;
}

export interface ProductCatalogItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  packageSpec: string | null;
  safetyStock: string;
  categoryName: string;
}

export interface InventoryCatalogsData {
  suppliers: SupplierCatalogItem[];
  materials: MaterialCatalogItem[];
  products: ProductCatalogItem[];
}

// ============================================================================
// TRANG 11: DANH SÁCH HÀNG NHẬP & TẠO PHIẾU NHẬP (purchase_items)
// ============================================================================

export interface PurchaseReceiptLine {
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

export interface PurchaseReceiptGroup {
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
  lines: PurchaseReceiptLine[];
}

export interface PurchaseFilterParams {
  fromDate?: string;
  toDate?: string;
  supplierId?: number;
  materialId?: number;
  keyword?: string;
}

export interface CreatePurchaseReceiptLinePayload {
  materialId: number;
  qty: string;
  unitPrice: string;
  note?: string;
}

export interface CreatePurchaseReceiptPayload {
  receiptCode?: string;
  receiptDate: string;
  supplierId: number;
  note?: string;
  items: CreatePurchaseReceiptLinePayload[];
}

// ============================================================================
// TRANG 12: KIỂM KÊ CUỐI NGÀY (stock_movements: adjustment)
// ============================================================================

export interface StocktakeSheetRow {
  targetType: InventoryTargetType;
  targetId: number;
  code: string;
  name: string;
  unit: string;
  categoryOrSupplierName: string;
  minOrSafetyStock: string;
  systemStock: string;
}

export interface DailyStocktakeSheetData {
  stocktakeDate: string;
  products: StocktakeSheetRow[];
  materials: StocktakeSheetRow[];
}

export interface SubmitStocktakeItemPayload {
  targetType: InventoryTargetType;
  targetId: number;
  actualStock: string;
  note?: string;
}

export interface SubmitDailyStocktakePayload {
  stocktakeDate: string;
  generalNote?: string;
  items: SubmitStocktakeItemPayload[];
}

export interface SubmitDailyStocktakeResponse {
  stocktakeDate: string;
  totalCheckedItems: number;
  adjustedCount: number;
  adjustments: Array<{
    movementId: string;
    targetType: InventoryTargetType;
    targetId: number;
    systemStock: string;
    actualStock: string;
    diffQty: string;
  }>;
  message: string;
}

// ============================================================================
// TRANG 13: HỦY VÀ HAO HỤT (stock_movements: waste_loss)
// ============================================================================

export interface WasteLossLogItem {
  id: string;
  movementDate: string;
  targetType: InventoryTargetType;
  targetId: number;
  code: string;
  name: string;
  unit: string;
  qty: string;
  reason: string;
  createdByName: string;
  createdAt: string;
}

export interface RecordWasteLossPayload {
  movementDate: string;
  targetType: InventoryTargetType;
  targetId: number;
  qty: string;
  reason: string;
}

export interface RecordWasteLossResponse {
  id: string;
  movementDate: string;
  targetType: InventoryTargetType;
  targetId: number;
  code: string;
  name: string;
  unit: string;
  qty: string;
  remainingStock: string;
  reason: string;
  message: string;
}

// ============================================================================
// TRANG 14: BÁO CÁO TỒN KHO (stock_movements report)
// ============================================================================

export interface InventoryReportRow {
  targetType: InventoryTargetType;
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

export interface InventoryMovementReportData {
  fromDate: string;
  toDate: string;
  products: InventoryReportRow[];
  materials: InventoryReportRow[];
}

export interface InventoryReportFilterParams {
  fromDate?: string;
  toDate?: string;
  keyword?: string;
}

// ============================================================================
// TỔNG QUAN TỒN KHO TỨC THỜI
// ============================================================================

export interface MaterialInventoryBalance {
  materialId: number;
  code: string;
  name: string;
  unit: string;
  minStock: string;
  physicalQty: string;
  reservedQty: string;
  availableQty: string;
  isBelowMinStock: boolean;
}

export interface ProductInventoryBalance {
  productId: number;
  code: string;
  name: string;
  unit: string;
  safetyStock: string;
  physicalQty: string;
  reservedQty: string;
  availableQty: string;
  isBelowSafetyStock: boolean;
}

export interface InventoryOverviewData {
  products: ProductInventoryBalance[];
  materials: MaterialInventoryBalance[];
}
