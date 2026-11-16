import { StandardApiEnvelope } from '../types/common.types';
import { mockErpStore } from './mockStore';
import {
  CreatePurchaseReceiptPayload,
  RecordWasteLossPayload,
  SubmitDailyStocktakePayload,
} from '../features/inventory/types/inventory.types';
import { RevenueDimension } from '../features/reports/types/reports.types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

function resolveMockFallback<T>(endpoint: string, options?: RequestInit): T {
  const method = (options?.method ?? 'GET').toUpperCase();
  const bodyObj =
    typeof options?.body === 'string'
      ? (JSON.parse(options.body) as Record<string, unknown>)
      : undefined;

  if (endpoint.startsWith('/inventory/catalogs')) {
    return mockErpStore.getCatalogs() as unknown as T;
  }
  if (endpoint.startsWith('/inventory/overview')) {
    return mockErpStore.getOverview() as unknown as T;
  }
  if (endpoint.startsWith('/inventory/purchases')) {
    if (method === 'POST' && bodyObj) {
      return mockErpStore.createPurchase(
        bodyObj as unknown as CreatePurchaseReceiptPayload,
      ) as unknown as T;
    }
    return mockErpStore.getPurchases() as unknown as T;
  }
  if (endpoint.startsWith('/inventory/stocktake-sheet')) {
    return mockErpStore.getStocktakeSheet() as unknown as T;
  }
  if (endpoint.startsWith('/inventory/stocktake') && method === 'POST' && bodyObj) {
    return mockErpStore.submitStocktake(
      bodyObj as unknown as SubmitDailyStocktakePayload,
    ) as unknown as T;
  }
  if (endpoint.startsWith('/inventory/waste-loss')) {
    if (method === 'POST' && bodyObj) {
      return mockErpStore.recordWasteLoss(
        bodyObj as unknown as RecordWasteLossPayload,
      ) as unknown as T;
    }
    return mockErpStore.getWasteLossHistory() as unknown as T;
  }
  if (endpoint.startsWith('/inventory/report')) {
    return mockErpStore.getInventoryReport() as unknown as T;
  }
  if (endpoint.startsWith('/reports/catalogs')) {
    return mockErpStore.getReportCatalogs() as unknown as T;
  }
  if (endpoint.startsWith('/reports/revenue')) {
    const url = new URL(`http://localhost${endpoint}`);
    const dim = (url.searchParams.get('dimension') ??
      'customer') as RevenueDimension;
    return mockErpStore.getRevenueReport(dim) as unknown as T;
  }
  if (endpoint.startsWith('/reports/customer-debts')) {
    const url = new URL(`http://localhost${endpoint}`);
    const groupBy = (url.searchParams.get('groupBy') ?? 'location') as
      | 'customer'
      | 'location';
    return mockErpStore.getCustomerDebtReport(groupBy) as unknown as T;
  }

  throw new Error(`Endpoint không khả dụng: ${endpoint}`);
}

export async function httpRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem('vtf_access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers ?? {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const payload = (await response.json()) as StandardApiEnvelope<T>;

    if (!response.ok || !payload.success) {
      throw new Error(
        payload.message || `Lỗi kết nối máy chủ (HTTP ${response.status})`,
      );
    }

    return payload.data;
  } catch {
    return resolveMockFallback<T>(endpoint, options);
  }
}
