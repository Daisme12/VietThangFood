import React, { useCallback, useMemo, useState } from 'react';
import { useInventoryReport } from '../hooks/useInventory';
import {
  InventoryReportRow,
  InventoryTargetType,
} from '../types/inventory.types';
import { formatQuantity } from '../../../lib/formatters';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { DateRangePicker, DateRangePickerValue } from '../../../components/ui/DateRangePicker';
import { format } from 'date-fns';

export const InventoryReportPage: React.FC = () => {
  const defaultDates = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = `${today.slice(0, 8)}01`;
    return { firstOfMonth, today };
  }, []);

  const [activeTab, setActiveTab] =
    useState<InventoryTargetType>('material');
  const [fromDate, setFromDate] = useState<string>(defaultDates.firstOfMonth);
  const [toDate, setToDate] = useState<string>(defaultDates.today);
  const [keyword, setKeyword] = useState<string>('');

  const reportQuery = useMemo(
    () => ({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      keyword: keyword.trim() || undefined,
    }),
    [fromDate, toDate, keyword],
  );

  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
  } = useInventoryReport(reportQuery);

  const activeRows = useMemo<InventoryReportRow[]>(() => {
    if (!reportData) return [];
    return activeTab === 'product'
      ? reportData.products
      : reportData.materials;
  }, [reportData, activeTab]);

  // Đếm số lượng nguyên liệu/thành phẩm có tồn cuối kỳ < min_stock
  const lowStockCount = useMemo(() => {
    return activeRows.filter((r) => r.isBelowMinStock).length;
  }, [activeRows]);

  // Xuất báo cáo ra file Excel (.csv chuẩn UTF-8 BOM mở trực tiếp trên Microsoft Excel)
  const handleExportExcel = useCallback(() => {
    if (activeRows.length === 0) return;

    const tabTitle =
      activeTab === 'product' ? 'THANH_PHAM' : 'NGUYEN_VAT_LIEU';
    const headers = [
      'Mã mặt hàng',
      'Tên mặt hàng',
      'ĐVT',
      'Định mức tối thiểu (min_stock)',
      'Tồn đầu kỳ',
      'Nhập trong kỳ',
      activeTab === 'product' ? 'Sản xuất (Nhập TP)' : 'Sản xuất (Xuất NL BOM)',
      'Xuất giao hàng',
      'Hủy / Hao hụt',
      'Điều chỉnh kiểm kê',
      'Tồn cuối kỳ',
      'Cảnh báo tồn kho',
    ];

    const escapeCsvCell = (val: string | number): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...activeRows.map((row) =>
        [
          row.code,
          row.name,
          row.unit,
          row.minStock,
          row.openingStock,
          row.importQty,
          row.productionQty,
          row.exportDeliveryQty,
          row.wasteLossQty,
          row.adjustmentQty,
          row.closingStock,
          row.isBelowMinStock ? 'CẢNH BÁO: Dưới định mức tối thiểu' : 'Đủ định mức',
        ]
          .map(escapeCsvCell)
          .join(','),
      ),
    ];

    // Thêm UTF-8 BOM (\uFEFF) để Microsoft Excel hiển thị đúng tiếng Việt có dấu
    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Ton_Kho_${tabTitle}_${fromDate}_${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeRows, activeTab, fromDate, toDate]);

  return (
    <div className="space-y-5">
      {/* Header & Bộ lọc kỳ báo cáo + Nút Xuất Excel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Trang 14: Báo Cáo Tổng Hợp Nhập - Xuất - Tồn Kho
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tổng hợp toàn bộ biến động từ bảng{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                stock_movements
              </code>{' '}
              theo kỳ và cảnh báo các mặt hàng có{' '}
              <code className="rounded bg-rose-50 px-1.5 py-0.5 text-xs text-rose-700">
                tồn cuối &lt; min_stock
              </code>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => void refetch()}>
              Làm mới số liệu
            </Button>

            <Button
              variant="primary"
              disabled={activeRows.length === 0}
              onClick={handleExportExcel}
            >
              ⬇ Xuất Excel (.CSV)
            </Button>
          </div>
        </div>

        {/* Bộ lọc Khoảng ngày & Từ khóa */}
        <div className="mt-5 grid grid-cols-1 items-end gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Kỳ báo cáo (Chọn từ ngày đến ngày)
            </label>
            <DateRangePicker
              value={{
                from: fromDate ? new Date(fromDate) : undefined,
                to: toDate ? new Date(toDate) : undefined,
              }}
              onChange={(range: DateRangePickerValue) => {
                if (range.from) setFromDate(format(range.from, 'yyyy-MM-dd'));
                if (range.to) setToDate(format(range.to, 'yyyy-MM-dd'));
              }}
              className="w-full"
            />
          </div>

          <div className="sm:col-span-7">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Tìm theo mã hoặc tên mặt hàng
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập mã hoặc tên nguyên liệu / thành phẩm..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* 2 Tab: [Nguyên vật liệu] và [Thành phẩm] */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('material')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'material'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tab [Nguyên vật liệu] ({reportData?.materials.length ?? 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('product')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'product'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tab [Thành phẩm] ({reportData?.products.length ?? 0})
            </button>
          </div>

          {lowStockCount > 0 && (
            <StatusBadge
              color="red"
              label={`Có ${lowStockCount} mặt hàng dưới định mức tồn tối thiểu (min_stock)`}
              pulse
            />
          )}
        </div>
      </div>

      {/* Bảng Báo cáo Tồn kho */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((r) => (
              <div
                key={r}
                className="h-12 w-full animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-rose-800">
              {error instanceof Error
                ? error.message
                : 'Không thể tải báo cáo tồn kho.'}
            </p>
          </div>
        ) : activeRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Không có dữ liệu mặt hàng khớp với điều kiện lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-3.5 py-3.5">Mã / Tên mặt hàng</th>
                  <th className="px-3 py-3.5 text-center">ĐVT</th>
                  <th className="px-3.5 py-3.5 text-right">Tồn đầu kỳ</th>
                  <th className="px-3.5 py-3.5 text-right text-emerald-700">
                    Nhập
                  </th>
                  <th className="px-3.5 py-3.5 text-right text-sky-700">
                    {activeTab === 'product'
                      ? 'Sản xuất (+TP)'
                      : 'Sản xuất (-NL)'}
                  </th>
                  <th className="px-3.5 py-3.5 text-right text-indigo-700">
                    Xuất giao
                  </th>
                  <th className="px-3.5 py-3.5 text-right text-rose-700">
                    Hủy / Hao hụt
                  </th>
                  <th className="px-3.5 py-3.5 text-right text-amber-700">
                    Điều chỉnh KK
                  </th>
                  <th className="px-3.5 py-3.5 text-right font-bold text-slate-900">
                    Tồn cuối kỳ
                  </th>
                  <th className="px-3.5 py-3.5">Cảnh báo tồn tối thiểu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRows.map((row) => {
                  const adjNum = Number(row.adjustmentQty) || 0;
                  return (
                    <tr
                      key={`${row.targetType}-${row.id}`}
                      className={
                        row.isBelowMinStock
                          ? 'bg-rose-50/50 hover:bg-rose-50'
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-900">
                          {row.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {row.code}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center font-medium text-slate-600">
                        {row.unit}
                      </td>

                      <td className="px-3.5 py-3 text-right font-semibold text-slate-700">
                        {formatQuantity(row.openingStock)}
                      </td>

                      <td className="px-3.5 py-3 text-right font-semibold text-emerald-700">
                        +{formatQuantity(row.importQty)}
                      </td>

                      <td className="px-3.5 py-3 text-right font-semibold text-sky-700">
                        {activeTab === 'product' ? '+' : '-'}
                        {formatQuantity(row.productionQty)}
                      </td>

                      <td className="px-3.5 py-3 text-right font-semibold text-indigo-700">
                        -{formatQuantity(row.exportDeliveryQty)}
                      </td>

                      <td className="px-3.5 py-3 text-right font-semibold text-rose-700">
                        -{formatQuantity(row.wasteLossQty)}
                      </td>

                      <td className="px-3.5 py-3 text-right font-semibold text-amber-700">
                        {adjNum > 0 ? '+' : ''}
                        {formatQuantity(row.adjustmentQty)}
                      </td>

                      <td className="px-3.5 py-3 text-right text-sm font-extrabold text-slate-900">
                        {formatQuantity(row.closingStock)} {row.unit}
                      </td>

                      <td className="px-3.5 py-3">
                        {row.isBelowMinStock ? (
                          <StatusBadge
                            color="red"
                            label={`Thiếu tồn (< ${formatQuantity(row.minStock)} ${row.unit})`}
                            pulse
                          />
                        ) : (
                          <StatusBadge
                            color="green"
                            label={`Đủ định mức (≥ ${formatQuantity(row.minStock)})`}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

