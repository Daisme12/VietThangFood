import { httpRequest } from '../../../lib/httpClient';
import {
  CustomerDebtQueryParams,
  CustomerDebtReportResponse,
  ReportFilterCatalogs,
  RevenueReportQueryParams,
  RevenueReportResponse,
} from '../types/reports.types';

function buildQueryString(
  params: Record<string, string | number | undefined | null>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  }
  const queryStr = searchParams.toString();
  return queryStr ? `?${queryStr}` : '';
}

export const reportsApi = {
  getFilterCatalogs: (): Promise<ReportFilterCatalogs> =>
    httpRequest<ReportFilterCatalogs>('/reports/catalogs', {
      method: 'GET',
    }),

  getRevenueReport: (
    params: RevenueReportQueryParams,
  ): Promise<RevenueReportResponse> => {
    const queryStr = buildQueryString({
      fromDate: params.fromDate,
      toDate: params.toDate,
      month: params.month,
      dimension: params.dimension,
      customerId: params.customerId,
      categoryId: params.categoryId,
      keyword: params.keyword,
    });
    return httpRequest<RevenueReportResponse>(`/reports/revenue${queryStr}`, {
      method: 'GET',
    });
  },

  getCustomerDebtReport: (
    params: CustomerDebtQueryParams,
  ): Promise<CustomerDebtReportResponse> => {
    const queryStr = buildQueryString({
      fromDate: params.fromDate,
      toDate: params.toDate,
      month: params.month,
      customerId: params.customerId,
      locationId: params.locationId,
      groupBy: params.groupBy,
      sortOrder: params.sortOrder,
      keyword: params.keyword,
    });
    return httpRequest<CustomerDebtReportResponse>(
      `/reports/debts${queryStr}`,
      {
        method: 'GET',
      },
    );
  },
};
