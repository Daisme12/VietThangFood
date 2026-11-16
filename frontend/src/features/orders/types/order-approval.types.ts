export type OrderCheckLevel = 'green' | 'yellow' | 'red';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'blocked'
  | 'in_production'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type OrderType = 'standard' | 'compensation';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface MaterialShortageAffectedProduct {
  productId: number;
  productCode: string;
  productName: string;
  qtyToProduce: string;
  bomQtyPerUnit: string;
  materialRequiredForProduct: string;
}

export interface MaterialShortageItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  requiredQty: string;
  availableQty: string;
  shortageQty: string;
  affectedProducts: MaterialShortageAffectedProduct[];
}

export interface PendingOrderItemPreview {
  id: string;
  productId: number;
  productCode: string;
  productName: string;
  packageSpec: string | null;
  unit: string;
  qtyOrdered: string;
  unitPrice: string;
  vatRate: string;
  qtyFromStock: string;
  qtyToProduce: string;
}

export interface PendingOrderForApproval {
  id: string;
  code: string;
  kind?: 'pgh' | 'pxk';
  hasTagE?: boolean;
  orderType: OrderType;
  parentOrderCode: string | null;
  customerId: number;
  customerCode: string;
  customerName: string;
  locationId: number;
  locationName: string;
  locationAddress: string;
  orderDate: string;
  deliveryAt: string;
  status: OrderStatus;
  checkLevel: OrderCheckLevel;
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
  note: string | null;
  items: PendingOrderItemPreview[];
  materialShortages: MaterialShortageItem[];
}

export interface ApproveOrderResponse {
  orderId: string;
  orderCode: string;
  previousStatus: OrderStatus;
  status: 'approved' | 'blocked';
  checkLevel: OrderCheckLevel;
  approvedBy: number;
  evaluatedAt: string;
  itemAllocations: Array<{
    orderItemId: string;
    productId: number;
    productCode: string;
    productName: string;
    unit: string;
    qtyOrdered: string;
    availableProductStockBefore: string;
    qtyFromStock: string;
    qtyToProduce: string;
  }>;
  materialShortages: MaterialShortageItem[];
  message: string;
}

export interface BulkApproveGreenYellowResponse {
  approvedOrders: ApproveOrderResponse[];
  blockedOrders: ApproveOrderResponse[];
}

