import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/reports.api';
import {
  CustomerDebtQueryParams,
  RevenueReportQueryParams,
} from '../types/reports.types';

export const REPORTS_QUERY_KEYS = {
  catalogs: ['reports', 'catalogs'] as const,
  revenue: (params: RevenueReportQueryParams) =>
    ['reports', 'revenue', params] as const,
  debts: (params: CustomerDebtQueryParams) =>
    ['reports', 'debts', params] as const,
};

export function useReportFilterCatalogs() {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.catalogs,
    queryFn: () => reportsApi.getFilterCatalogs(),
    staleTime: 60_000,
  });
}

export function useRevenueReport(params: RevenueReportQueryParams) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.revenue(params),
    queryFn: () => reportsApi.getRevenueReport(params),
  });
}

export function useCustomerDebtReport(params: CustomerDebtQueryParams) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.debts(params),
    queryFn: () => reportsApi.getCustomerDebtReport(params),
  });
}
