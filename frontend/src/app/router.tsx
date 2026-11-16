import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DeliverySlipListPage } from '../features/orders/components/DeliverySlipListPage';
import { OrderApprovalTable } from '../features/orders/components/OrderApprovalTable';
import { OrderAddPage } from '../features/orders/components/OrderAddPage';
import { InventoryModuleView } from '../features/inventory/components/InventoryModuleView';
import { PurchaseReceiptPage } from '../features/inventory/components/PurchaseReceiptPage';
import { DailyStocktakePage } from '../features/inventory/components/DailyStocktakePage';
import { WasteLossPage } from '../features/inventory/components/WasteLossPage';
import { InventoryReportPage } from '../features/inventory/components/InventoryReportPage';
import { InventoryOverview } from '../features/inventory/components/InventoryOverview';
import { ReportsModuleView } from '../features/reports/components/ReportsModuleView';
import { RevenueReportPage } from '../features/reports/components/RevenueReportPage';
import { CustomerDebtReportPage } from '../features/reports/components/CustomerDebtReportPage';
import { CompanyConfigPage } from '../features/settings/components/CompanyConfigPage';
import { KitchenProductionPage } from '../features/kitchen/KitchenProductionPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        {/* Mặc định mở Trang Dashboard Tổng Quan */}
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Phân hệ Đơn hàng: Tách 2 loại danh sách rõ ràng */}
        <Route path="orders">
          {/* Loại 1: Danh sách đơn hàng đã duyệt (Xem được lượng hàng tổng) */}
          <Route index element={<DeliverySlipListPage />} />
          <Route path="list" element={<DeliverySlipListPage />} />

          {/* Loại 2: Danh sách đơn hàng cần duyệt (Khi lên đơn đến đây để duyệt, tính BOM/kho) */}
          <Route path="approval" element={<OrderApprovalTable />} />
          <Route path="pending" element={<OrderApprovalTable />} />

          {/* Tạo & Sửa đơn hàng */}
          <Route path="add" element={<OrderAddPage />} />
          <Route path="create" element={<OrderAddPage />} />
          <Route path="edit/:id" element={<OrderAddPage />} />
        </Route>
        <Route path="order/add" element={<Navigate to="/orders/add" replace />} />
        <Route path="order/create" element={<Navigate to="/orders/add" replace />} />
        <Route path="order/edit/:id" element={<OrderAddPage />} />

        {/* Phân hệ Tổng Bếp Sản Xuất (Trang Bếp Sản Xuất + Bù định mức an toàn) */}
        <Route path="kitchen">
          <Route index element={<KitchenProductionPage />} />
          <Route path="production" element={<KitchenProductionPage />} />
        </Route>
        <Route path="orders/kitchen" element={<Navigate to="/kitchen/production" replace />} />
        <Route path="orders/kitchen-production" element={<Navigate to="/kitchen/production" replace />} />
        <Route path="production/overview" element={<Navigate to="/kitchen/production" replace />} />

        {/* Phân hệ Kho (Trang 11, 12, 13, 14) */}
        <Route path="inventory" element={<InventoryModuleView />}>
          <Route index element={<Navigate to="purchases" replace />} />
          <Route path="purchases" element={<PurchaseReceiptPage />} />
          <Route path="stocktake" element={<DailyStocktakePage />} />
          <Route path="waste-loss" element={<WasteLossPage />} />
          <Route path="report" element={<InventoryReportPage />} />
          <Route path="overview" element={<InventoryOverview />} />
        </Route>

        {/* Phân hệ Báo cáo Doanh thu & Công nợ (Trang 15, 16) */}
        <Route path="reports" element={<ReportsModuleView />}>
          <Route index element={<Navigate to="revenue" replace />} />
          <Route path="revenue" element={<RevenueReportPage />} />
          <Route path="debts" element={<CustomerDebtReportPage />} />
        </Route>

        {/* Cấu hình hệ thống & Đơn vị giao hàng */}
        <Route path="settings">
          <Route index element={<Navigate to="config" replace />} />
          <Route path="config" element={<CompanyConfigPage />} />
          <Route path="categories" element={<CompanyConfigPage />} />
          <Route path="users" element={<CompanyConfigPage />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
