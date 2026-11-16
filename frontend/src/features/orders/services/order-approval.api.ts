import {
  ApiResponse,
  ApproveOrderResponse,
  BulkApproveGreenYellowResponse,
  PendingOrderForApproval,
} from '../types/order-approval.types';
import { mockErpStore } from '../../../lib/mockStore';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

async function requestJson<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('vtf_access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers ?? {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.message || `Lỗi kết nối máy chủ (HTTP ${response.status})`,
    );
  }

  return payload;
}

export const orderApprovalApi = {
  getPendingOrdersForApproval: async (): Promise<PendingOrderForApproval[]> => {
    try {
      const res = await requestJson<PendingOrderForApproval[]>(
        '/orders/pending-approval',
        { method: 'GET' },
      );
      return res.data;
    } catch {
      return mockErpStore.getPendingOrders();
    }
  },

  approveSingleOrder: async (
    orderId: number,
  ): Promise<ApproveOrderResponse> => {
    try {
      const res = await requestJson<ApproveOrderResponse>(
        `/orders/${orderId}/approve`,
        { method: 'POST' },
      );
      return res.data;
    } catch {
      return mockErpStore.approveSingleOrder(orderId);
    }
  },

  approveAllGreenAndYellow: async (
    orderIds: number[],
  ): Promise<BulkApproveGreenYellowResponse> => {
    try {
      const res = await requestJson<BulkApproveGreenYellowResponse>(
        '/orders/approve-bulk-green-yellow',
        {
          method: 'POST',
          body: JSON.stringify({ orderIds }),
        },
      );
      return res.data;
    } catch {
      return mockErpStore.approveBulkGreenYellow(orderIds);
    }
  },
};
