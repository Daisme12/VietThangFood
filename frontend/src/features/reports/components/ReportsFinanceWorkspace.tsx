import React, { useState } from 'react';
import { CustomerDebtReportPage } from './CustomerDebtReportPage';
import { RevenueReportPage } from './RevenueReportPage';

export type ReportsSubPage = 'page_15_revenue' | 'page_16_debts';

export interface ReportsFinanceWorkspaceProps {
  initialPage?: ReportsSubPage;
}

export const ReportsFinanceWorkspace: React.FC<
  ReportsFinanceWorkspaceProps
> = ({ initialPage = 'page_15_revenue' }) => {
  const [activeSubPage, setActiveSubPage] =
    useState<ReportsSubPage>(initialPage);

  return (
    <div className="space-y-5">
      {/* Thanh chuyển đổi giữa Trang 15 (Doanh thu) & Trang 16 (Công nợ khách hàng) */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Phân Hệ 5: Báo Cáo &amp; Tài Chính (Reports &amp; Debts Module)
          </span>
          <p className="text-xs text-slate-500">
            Tính toán chính xác tuyệt đối bằng <code className="font-mono">Decimal(15, 2)</code> dựa trên số lượng thực giao (<code className="font-mono">qty_delivered</code>)
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveSubPage('page_15_revenue')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeSubPage === 'page_15_revenue'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Trang 15: Báo Cáo Doanh Thu
          </button>

          <button
            type="button"
            onClick={() => setActiveSubPage('page_16_debts')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeSubPage === 'page_16_debts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Trang 16: Báo Cáo Công Nợ Khách Hàng
          </button>
        </div>
      </div>

      {activeSubPage === 'page_15_revenue' ? (
        <RevenueReportPage />
      ) : (
        <CustomerDebtReportPage />
      )}
    </div>
  );
};
