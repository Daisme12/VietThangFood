import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApprovalApi } from '../services/order-approval.api';

export const ORDER_APPROVAL_QUERY_KEYS = {
  all: ['orders', 'approval'] as const,
  pendingList: () => [...ORDER_APPROVAL_QUERY_KEYS.all, 'pending-list'] as const,
};

export function usePendingOrdersForApproval() {
  return useQuery({
    queryKey: ORDER_APPROVAL_QUERY_KEYS.pendingList(),
    queryFn: () => orderApprovalApi.getPendingOrdersForApproval(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useApproveOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => orderApprovalApi.approveSingleOrder(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ORDER_APPROVAL_QUERY_KEYS.all,
      });
    },
  });
}

export function useBulkApproveGreenYellowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderIds: number[]) =>
      orderApprovalApi.approveAllGreenAndYellow(orderIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ORDER_APPROVAL_QUERY_KEYS.all,
      });
    },
  });
}

