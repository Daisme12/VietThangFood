import { httpRequest } from '../../../lib/httpClient';
import {
  CreatePurchaseReceiptPayload,
  DailyStocktakeSheetData,
  InventoryCatalogsData,
  InventoryMovementReportData,
  InventoryOverviewData,
  InventoryReportFilterParams,
  PurchaseFilterParams,
  PurchaseReceiptGroup,
  RecordWasteLossPayload,
  RecordWasteLossResponse,
  SubmitDailyStocktakePayload,
  SubmitDailyStocktakeResponse,
  WasteLossLogItem,
} from '../types/inventory.types';

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

export const inventoryApi = {
  getCatalogs: (): Promise<InventoryCatalogsData> =>
    httpRequest<InventoryCatalogsData>('/inventory/catalogs', {
      method: 'GET',
    }),

  getOverview: (): Promise<InventoryOverviewData> =>
    httpRequest<InventoryOverviewData>('/inventory/overview', {
      method: 'GET',
    }),

  // Trang 11: Danh sách hàng nhập & Tạo phiếu nhập
  getPurchaseReceipts: (
    params: PurchaseFilterParams,
  ): Promise<PurchaseReceiptGroup[]> =>
    httpRequest<PurchaseReceiptGroup[]>(
      `/inventory/purchases${buildQueryString({
        fromDate: params.fromDate,
        toDate: params.toDate,
        supplierId: params.supplierId,
        materialId: params.materialId,
        keyword: params.keyword,
      })}`,
      { method: 'GET' },
    ),

  createPurchaseReceipt: (
    payload: CreatePurchaseReceiptPayload,
  ): Promise<PurchaseReceiptGroup> =>
    httpRequest<PurchaseReceiptGroup>('/inventory/purchases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Trang 12: Kiểm kê cuối ngày
  getDailyStocktakeSheet: (
    date?: string,
  ): Promise<DailyStocktakeSheetData> =>
    httpRequest<DailyStocktakeSheetData>(
      `/inventory/stocktake-sheet${buildQueryString({ date })}`,
      { method: 'GET' },
    ),

  submitDailyStocktake: (
    payload: SubmitDailyStocktakePayload,
  ): Promise<SubmitDailyStocktakeResponse> =>
    httpRequest<SubmitDailyStocktakeResponse>('/inventory/stocktake', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Trang 13: Hủy và hao hụt
  getWasteLossHistory: (
    fromDate?: string,
    toDate?: string,
  ): Promise<WasteLossLogItem[]> =>
    httpRequest<WasteLossLogItem[]>(
      `/inventory/waste-loss${buildQueryString({ fromDate, toDate })}`,
      { method: 'GET' },
    ),

  recordWasteLoss: (
    payload: RecordWasteLossPayload,
  ): Promise<RecordWasteLossResponse> =>
    httpRequest<RecordWasteLossResponse>('/inventory/waste-loss', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Trang 14: Báo cáo tồn kho
  getInventoryReport: (
    params: InventoryReportFilterParams,
  ): Promise<InventoryMovementReportData> =>
    httpRequest<InventoryMovementReportData>(
      `/inventory/report${buildQueryString({
        fromDate: params.fromDate,
        toDate: params.toDate,
        keyword: params.keyword,
      })}`,
      { method: 'GET' },
    ),
};
