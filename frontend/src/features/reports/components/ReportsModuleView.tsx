import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const REPORTS_SUB_ROUTES: Array<{
  to: string;
  stepBadge: string;
  title: string;
  subtitle: string;
}> = [
  {
    to: '/reports/revenue',
    stepBadge: 'TRANG 15',
    title: 'Báo Cáo Phân Tích Doanh Thu',
    subtitle: 'Thống kê theo Khách hàng, Điểm giao, Sản phẩm, Danh mục & Biểu đồ',
  },
  {
    to: '/reports/debts',
    stepBadge: 'TRANG 16',
    title: 'Báo Cáo Đối Soát Công Nợ Khách Hàng',
    subtitle: 'Gom nhóm theo Điểm giao / Khách hàng, Xuất Excel & In Biên Bản Đối Chiếu',
  },
];

export const ReportsModuleView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS_SUB_ROUTES.map((route) => (
          <NavLink
            key={route.to}
            to={route.to}
            className={({ isActive }) =>
              `group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                isActive
                  ? 'border-emerald-600 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20'
                  : 'border-slate-200/90 bg-white text-slate-800 shadow-2xs hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {route.stepBadge}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-300 group-hover:text-emerald-600'
                    }`}
                  >
                    →
                  </span>
                </div>
                <div className="mt-2 text-sm font-extrabold">{route.title}</div>
                <div
                  className={`mt-0.5 text-xs ${
                    isActive ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {route.subtitle}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
};
