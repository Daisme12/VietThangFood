export type RevenueDimension =
  | 'customer'
  | 'location'
  | 'product'
  | 'category';

export type DebtGroupBy = 'customer' | 'location';

export interface ReportCompanyInfo {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyTaxCode: string;
  invoiceFooter: string;
}

export interface ReportCustomerCatalogItem {
  id: number;
  code: string;
  name: string;
  taxCode: string | null;
  phone: string | null;
}

export interface ReportLocationCatalogItem {
  id: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  name: string;
  address: string;
  receiverName: string | null;
  receiverPhone: string | null;
}

export interface ReportCategoryCatalogItem {
  id: number;
  name: string;
  sortOrder: number;
}

export interface ReportFilterCatalogs {
  customers: ReportCustomerCatalogItem[];
  locations: ReportLocationCatalogItem[];
  categories: ReportCategoryCatalogItem[];
  companyInfo: ReportCompanyInfo;
}

// ============================================================================
// TRANG 15: BÁO CÁO DOANH THU (REVENUE REPORT)
// ============================================================================

export interface RevenueReportQueryParams {
  fromDate?: string;
  toDate?: string;
  month?: string;
  dimension?: RevenueDimension;
  customerId?: number;
  categoryId?: number;
  keyword?: string;
}

export interface RevenueSummaryKpi {
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
  totalDeliveredOrders: number;
  totalQtyOrdered: string;
  totalQtyDelivered: string;
  fulfillmentRatePercent: string;
}

export interface RevenueBreakdownRow {
  key: string;
  dimension: RevenueDimension;
  id: number;
  code: string;
  name: string;
  subLabel: string | null;
  unit: string;
  orderCount: number;
  qtyOrdered: string;
  qtyDelivered: string;
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
  sharePercent: string;
}

export interface RevenueDailyPoint {
  date: string;
  orderCount: number;
  qtyDelivered: string;
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
}

export interface RevenueReportResponse {
  period: {
    fromDate: string;
    toDate: string;
    month: string | null;
  };
  activeDimension: RevenueDimension;
  summary: RevenueSummaryKpi;
  rows: RevenueBreakdownRow[];
  byDimension: Record<RevenueDimension, RevenueBreakdownRow[]>;
  dailySeries: RevenueDailyPoint[];
}

// ============================================================================
// TRANG 16: BÁO CÁO CÔNG NỢ KHÁCH HÀNG (CUSTOMER DEBTS RECONCILIATION)
// ============================================================================

export interface CustomerDebtQueryParams {
  fromDate?: string;
  toDate?: string;
  month?: string;
  customerId?: number;
  locationId?: number;
  groupBy?: DebtGroupBy;
  sortOrder?: 'asc' | 'desc';
  keyword?: string;
}

export interface DebtVoucherItemView {
  orderItemId: string;
  productId: number;
  productCode: string;
  productName: string;
  packageSpec: string | null;
  unit: string;
  qtyOrdered: string;
  qtyDelivered: string;
  qtyShort: string;
  unitPrice: string;
  vatRate: string;
  lineBeforeVat: string;
  lineVat: string;
  lineTotal: string;
}

export interface DebtDeliveryVoucherRow {
  orderId: string;
  orderCode: string;
  orderType: 'standard' | 'compensation';
  parentOrderCode: string | null;
  deliveryCode: string;
  orderDate: string;
  deliveredAt: string;
  deliveredDate: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerTaxCode: string | null;
  customerPhone: string | null;
  locationId: number;
  locationName: string;
  locationAddress: string;
  receiverName: string | null;
  receiverPhone: string | null;
  note: string | null;
  totalQtyOrdered: string;
  totalQtyDelivered: string;
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
  items: DebtVoucherItemView[];
}

export interface DebtGroupView {
  groupKey: string;
  groupBy: DebtGroupBy;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerTaxCode: string | null;
  customerPhone: string | null;
  locationId: number | null;
  locationName: string | null;
  locationAddress: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  voucherCount: number;
  subtotalQtyOrdered: string;
  subtotalQtyDelivered: string;
  subtotalBeforeVat: string;
  subtotalVat: string;
  subtotalAmount: string;
  vouchers: DebtDeliveryVoucherRow[];
}

export interface CustomerDebtReportResponse {
  period: {
    fromDate: string;
    toDate: string;
    month: string | null;
  };
  groupBy: DebtGroupBy;
  sortOrder: 'asc' | 'desc';
  summary: {
    totalVouchers: number;
    totalCustomers: number;
    totalLocations: number;
    totalQtyOrdered: string;
    totalQtyDelivered: string;
    grandTotalBeforeVat: string;
    grandTotalVat: string;
    grandTotalAmount: string;
  };
  groups: DebtGroupView[];
  customerGroups: DebtGroupView[];
  locationGroups: DebtGroupView[];
  companyInfo: ReportCompanyInfo;
}
