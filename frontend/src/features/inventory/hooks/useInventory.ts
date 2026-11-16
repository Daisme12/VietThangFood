import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../services/inventory.api';
import {
  CreatePurchaseReceiptPayload,
  InventoryReportFilterParams,
  PurchaseFilterParams,
  RecordWasteLossPayload,
  SubmitDailyStocktakePayload,
} from '../types/inventory.types';

export const INVENTORY_QUERY_KEYS = {
  all: ['inventory'] as const,
  catalogs: () => [...INVENTORY_QUERY_KEYS.all, 'catalogs'] as const,
  overview: () => [...INVENTORY_QUERY_KEYS.all, 'overview'] as const,
  purchases: (params: PurchaseFilterParams) =>
    [...INVENTORY_QUERY_KEYS.all, 'purchases', params] as const,
  stocktakeSheet: (date?: string) =>
    [...INVENTORY_QUERY_KEYS.all, 'stocktake-sheet', date ?? 'today'] as const,
  wasteLossHistory: (fromDate?: string, toDate?: string) =>
    [...INVENTORY_QUERY_KEYS.all, 'waste-loss', fromDate, toDate] as const,
  report: (params: InventoryReportFilterParams) =>
    [...INVENTORY_QUERY_KEYS.all, 'report', params] as const,
};

export function useInventoryCatalogs() {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.catalogs(),
    queryFn: () => inventoryApi.getCatalogs(),
    staleTime: 60_000,
  });
}

export function useInventoryOverview() {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.overview(),
    queryFn: () => inventoryApi.getOverview(),
    staleTime: 15_000,
  });
}

// Trang 11: Danh sách hàng nhập & Tạo phiếu nhập
export function usePurchaseReceipts(params: PurchaseFilterParams) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.purchases(params),
    queryFn: () => inventoryApi.getPurchaseReceipts(params),
    staleTime: 15_000,
  });
}

export function useCreatePurchaseReceiptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePurchaseReceiptPayload) =>
      inventoryApi.createPurchaseReceipt(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: INVENTORY_QUERY_KEYS.all,
      });
    },
  });
}

// Trang 12: Kiểm kê cuối ngày
export function useDailyStocktakeSheet(date?: string) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.stocktakeSheet(date),
    queryFn: () => inventoryApi.getDailyStocktakeSheet(date),
    staleTime: 10_000,
  });
}

export function useSubmitDailyStocktakeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitDailyStocktakePayload) =>
      inventoryApi.submitDailyStocktake(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: INVENTORY_QUERY_KEYS.all,
      });
    },
  });
}

// Trang 13: Hủy và hao hụt
export function useWasteLossHistory(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.wasteLossHistory(fromDate, toDate),
    queryFn: () => inventoryApi.getWasteLossHistory(fromDate, toDate),
    staleTime: 15_000,
  });
}

export function useRecordWasteLossMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecordWasteLossPayload) =>
      inventoryApi.recordWasteLoss(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: INVENTORY_QUERY_KEYS.all,
      });
    },
  });
}

// Trang 14: Báo cáo tồn kho
export function useInventoryReport(params: InventoryReportFilterParams) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.report(params),
    queryFn: () => inventoryApi.getInventoryReport(params),
    staleTime: 15_000,
  });
}
