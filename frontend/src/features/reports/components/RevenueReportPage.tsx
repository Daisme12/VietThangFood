import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import {
  formatCurrencyVnd,
  formatQuantity,
} from '../../../lib/formatters';
import {
  useReportFilterCatalogs,
  useRevenueReport,
} from '../hooks/useReports';
import {
  RevenueBreakdownRow,
  RevenueDimension,
} from '../types/reports.types';
import { exportRevenueReportToExcel } from '../utils/reportExport';

type FilterPeriodMode = 'date_range' | 'month';
type ChartType = 'bar' | 'line';
type ChartDataSource = 'dimension' | 'daily';

const DIMENSION_OPTIONS: Array<{
  key: RevenueDimension;
  label: string;
  shortDesc: string;
}> = [
  {
    key: 'customer',
    label: 'Theo Khách hàng',
    shortDesc: 'Phân tích doanh thu thực giao theo từng đối tác khách hàng',
  },
  {
    key: 'location',
    label: 'Theo Địa điểm',
    shortDesc: 'Phân tích doanh thu theo từng điểm giao nhận thực tế',
  },
  {
    key: 'product',
    label: 'Theo Sản phẩm',
    shortDesc: 'Phân tích sản lượng thực giao & doanh thu từng mã SKU',
  },
  {
    key: 'category',
    label: 'Theo Danh mục (Category)',
    shortDesc: 'Phân tích tỷ trọng doanh thu theo nhóm ngành hàng trà sữa',
  },
];

function getInitialDateRange(): {
  fromDate: string;
  toDate: string;
  month: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const monthNum = String(now.getMonth() + 1).padStart(2, '0');
  const dayNum = String(now.getDate()).padStart(2, '0');
  return {
    fromDate: `${year}-${monthNum}-01`,
    toDate: `${year}-${monthNum}-${dayNum}`,
    month: `${year}-${monthNum}`,
  };
}

function formatShortVnd(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} tr`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

export const RevenueReportPage: React.FC = () => {
  const initialDates = useMemo(() => getInitialDateRange(), []);

  const [periodMode, setPeriodMode] = useState<FilterPeriodMode>('date_range');
  const [fromDate, setFromDate] = useState<string>(initialDates.fromDate);
  const [toDate, setToDate] = useState<string>(initialDates.toDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialDates.month,
  );
  const [activeDimension, setActiveDimension] =
    useState<RevenueDimension>('customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [chartDataSource, setChartDataSource] =
    useState<ChartDataSource>('dimension');
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(
    null,
  );

  const { data: catalogs } = useReportFilterCatalogs();

  const queryParams = useMemo(
    () => ({
      ...(periodMode === 'month'
        ? { month: selectedMonth }
        : { fromDate, toDate }),
      dimension: activeDimension,
      customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
      categoryId: selectedCategoryId ? Number(selectedCategoryId) : undefined,
    }),
    [
      periodMode,
      selectedMonth,
      fromDate,
      toDate,
      activeDimension,
      selectedCustomerId,
      selectedCategoryId,
    ],
  );

  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useRevenueReport(queryParams);

  // Áp dụng phím tắt chọn nhanh kỳ báo cáo
  const handleQuickRange = useCallback(
    (preset: 'this_month' | 'last_month' | 'last_7_days') => {
      const now = new Date();
      if (preset === 'this_month') {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        setPeriodMode('date_range');
        setFromDate(`${y}-${m}-01`);
        setToDate(`${y}-${m}-${d}`);
        setSelectedMonth(`${y}-${m}`);
      } else if (preset === 'last_month') {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
        ).getDate();
        const y = prev.getFullYear();
        const m = String(prev.getMonth() + 1).padStart(2, '0');
        setPeriodMode('month');
        setSelectedMonth(`${y}-${m}`);
        setFromDate(`${y}-${m}-01`);
        setToDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
      } else {
        const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const formatIsoDate = (dt: Date) => {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };
        setPeriodMode('date_range');
        setFromDate(formatIsoDate(past7));
        setToDate(formatIsoDate(now));
      }
    },
    [],
  );

  // Dữ liệu bảng theo trục phân tích đang chọn + lọc từ khóa tức thì trên UI
  const dimensionRows = useMemo<RevenueBreakdownRow[]>(() => {
    if (!report) {
      return [];
    }
    const baseRows =
      report.byDimension?.[activeDimension] ?? report.rows ?? [];
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) {
      return baseRows;
    }
    return baseRows.filter(
      (r) =>
        r.code.toLowerCase().includes(kw) ||
        r.name.toLowerCase().includes(kw) ||
        (r.subLabel ?? '').toLowerCase().includes(kw),
    );
  }, [report, activeDimension, searchKeyword]);

  // Chuẩn bị điểm dữ liệu cho Biểu đồ Cột / Đường
  const chartPoints = useMemo(() => {
    if (!report) {
      return [];
    }

    if (chartDataSource === 'daily') {
      return report.dailySeries.map((d) => ({
        label: d.date.slice(5), // MM-DD
        fullTitle: `Ngày giao: ${d.date}`,
        beforeVat: Number(d.totalBeforeVat) || 0,
        vat: Number(d.totalVat) || 0,
        totalAmount: Number(d.totalAmount) || 0,
        subInfo: `${d.orderCount} phiếu xuất • SL thực giao: ${formatQuantity(d.qtyDelivered)}`,
      }));
    }

    return dimensionRows.slice(0, 10).map((r) => ({
      label: r.name.length > 16 ? `${r.name.slice(0, 15)}…` : r.name,
      fullTitle: `${r.name} (${r.code})`,
      beforeVat: Number(r.totalBeforeVat) || 0,
      vat: Number(r.totalVat) || 0,
      totalAmount: Number(r.totalAmount) || 0,
      subInfo: `${r.orderCount} phiếu xuất • Tỷ trọng: ${r.sharePercent}%`,
    }));
  }, [report, chartDataSource, dimensionRows]);

  const maxChartValue = useMemo(() => {
    let maxVal = 0;
    for (const pt of chartPoints) {
      if (pt.totalAmount > maxVal) {
        maxVal = pt.totalAmount;
      }
    }
    return maxVal > 0 ? maxVal : 1;
  }, [chartPoints]);

  const handleExportExcel = useCallback(() => {
    if (!report) {
      return;
    }
    exportRevenueReportToExcel(report, activeDimension, dimensionRows);
  }, [report, activeDimension, dimensionRows]);

  const activeDimMeta =
    DIMENSION_OPTIONS.find((d) => d.key === activeDimension) ??
    DIMENSION_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Header Trang 15 & Nguyên tắc nghiệp vụ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                TRANG 15
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Báo Cáo Doanh Thu Thực Giao
              </h2>
              {isFetching && (
                <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                  Đang tính toán Decimal...
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              <strong className="text-emerald-700">
                Nguyên tắc sống còn:
              </strong>{' '}
              Doanh thu chỉ được ghi nhận trên{' '}
              <code className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono font-semibold text-emerald-800">
                qty_delivered
              </code>{' '}
              (số lượng thực giao) của các đơn đã có phiếu xuất kho (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">
                delivered_at IS NOT NULL
              </code>
              ), tuyệt đối không tính trên số lượng đặt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refetch()}
              isLoading={isFetching}
            >
              Làm mới dữ liệu
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExportExcel}
              disabled={!report || dimensionRows.length === 0}
            >
              <span>⬇ Xuất Excel (.xls)</span>
            </Button>
          </div>
        </div>

        {/* Bộ lọc Khoảng ngày / Tháng + Khách hàng / Danh mục */}
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-12">
          {/* Chế độ lọc Kỳ */}
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Chế độ lọc thời gian
            </label>
            <div className="inline-flex w-full rounded-lg border border-slate-300 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setPeriodMode('date_range')}
                className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  periodMode === 'date_range'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Khoảng ngày
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('month')}
                className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  periodMode === 'month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo tháng
              </button>
            </div>
          </div>

          {periodMode === 'date_range' ? (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Từ ngày giao
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Đến ngày giao
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Chọn tháng báo cáo
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          )}

          {/* Lọc Khách hàng */}
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Lọc theo Khách hàng
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- Tất cả khách hàng --</option>
              {(catalogs?.customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Danh mục */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Danh mục (Category)
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- Tất cả danh mục --</option>
              {(catalogs?.categories ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Phím tắt chọn kỳ nhanh */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500">Chọn nhanh:</span>
            <button
              type="button"
              onClick={() => handleQuickRange('this_month')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => handleQuickRange('last_month')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
            >
              Tháng trước
            </button>
            <button
              type="button"
              onClick={() => handleQuickRange('last_7_days')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
            >
              7 ngày gần nhất
            </button>
          </div>

          {report && (
            <div className="text-slate-500">
              Kỳ đang xem:{' '}
              <strong className="text-slate-800">
                {report.period.fromDate} → {report.period.toDate}
              </strong>{' '}
              ({report.summary.totalDeliveredOrders} phiếu xuất kho)
            </div>
          )}
        </div>
      </div>

      {/* Trạng thái Loading / Error */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-900">
            {error instanceof Error
              ? error.message
              : 'Không thể tải dữ liệu báo cáo doanh thu.'}
          </p>
          <div className="mt-3">
            <Button variant="danger" size="sm" onClick={() => void refetch()}>
              Thử tải lại
            </Button>
          </div>
        </div>
      ) : (
        report && (
          <>
            {/* 3 CHỈ SỐ THẺ (KPI CARDS): Doanh thu trước VAT | Thuế VAT | Tổng tiền thanh toán */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Thẻ 1: Doanh thu trước VAT */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Doanh thu trước VAT
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    Net Revenue
                  </span>
                </div>
                <p className="mt-2.5 text-2xl font-extrabold text-slate-900">
                  {formatCurrencyVnd(report.summary.totalBeforeVat)}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Tổng SL thực giao:{' '}
                    <strong className="text-slate-800">
                      {formatQuantity(report.summary.totalQtyDelivered)}
                    </strong>
                  </span>
                  <span>
                    Đặt:{' '}
                    {formatQuantity(report.summary.totalQtyOrdered)} (
                    {report.summary.fulfillmentRatePercent}%)
                  </span>
                </div>
              </div>

              {/* Thẻ 2: Thuế VAT */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    2. Thuế GTGT (VAT)
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                    VAT Thực giao
                  </span>
                </div>
                <p className="mt-2.5 text-2xl font-extrabold text-amber-900">
                  {formatCurrencyVnd(report.summary.totalVat)}
                </p>
                <p className="mt-2 text-xs text-amber-800/80">
                  Tính chính xác theo từng dòng sản phẩm thực xuất kho (
                  <code className="font-mono">ROUND_HALF_UP</code>)
                </p>
              </div>

              {/* Thẻ 3: Tổng tiền thanh toán */}
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    3. Tổng tiền thanh toán
                  </span>
                  <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    {report.summary.totalDeliveredOrders} Phiếu xuất
                  </span>
                </div>
                <p className="mt-2.5 text-2xl font-extrabold text-emerald-800">
                  {formatCurrencyVnd(report.summary.totalAmount)}
                </p>
                <p className="mt-2 text-xs text-emerald-800/90">
                  = Doanh thu trước VAT + Thuế VAT (Khớp 100% công nợ phải thu)
                </p>
              </div>
            </div>

            {/* THANH CHUYỂN ĐỔI TRỤC PHÂN TÍCH (4 TRỤC) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    Trục Phân Tích Doanh Thu
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {activeDimMeta.shortDesc}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {DIMENSION_OPTIONS.map((dim) => {
                    const isActive = activeDimension === dim.key;
                    const count =
                      report.byDimension?.[dim.key]?.length ?? 0;
                    return (
                      <button
                        key={dim.key}
                        type="button"
                        onClick={() => setActiveDimension(dim.key)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                          isActive
                            ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{dim.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                            isActive
                              ? 'bg-emerald-900/60 text-emerald-100'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BIỂU ĐỒ CỘT / ĐƯỜNG TRỰC QUAN */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Biểu Đồ Doanh Thu Thực Giao (
                      {chartDataSource === 'dimension'
                        ? activeDimMeta.label
                        : 'Xu hướng theo Ngày giao'}
                      )
                    </h4>
                    <p className="text-xs text-slate-500">
                      Di chuột vào cột hoặc điểm dữ liệu để xem chi tiết Trước
                      VAT, Thuế VAT và Tổng thanh toán.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Nguồn dữ liệu biểu đồ */}
                    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setChartDataSource('dimension')}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          chartDataSource === 'dimension'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Theo trục phân tích
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartDataSource('daily')}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          chartDataSource === 'daily'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Theo ngày giao
                      </button>
                    </div>

                    {/* Loại biểu đồ Cột / Đường */}
                    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setChartType('bar')}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          chartType === 'bar'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Biểu đồ Cột
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartType('line')}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          chartType === 'line'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Biểu đồ Đường
                      </button>
                    </div>
                  </div>
                </div>

                {chartPoints.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Chưa có phiếu xuất kho đã giao nào trong khoảng thời gian đã
                    chọn để vẽ biểu đồ.
                  </div>
                ) : chartType === 'bar' ? (
                  /* BIỂU ĐỒ CỘT (STACKED BEFORE VAT + VAT) */
                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
                      {chartPoints.map((pt, idx) => {
                        const totalHeightPct = Math.max(
                          6,
                          Math.round((pt.totalAmount / maxChartValue) * 100),
                        );
                        const vatRatioPct =
                          pt.totalAmount > 0
                            ? Math.round((pt.vat / pt.totalAmount) * 100)
                            : 0;
                        const isHovered = hoveredChartIndex === idx;

                        return (
                          <div
                            key={`${pt.label}-${idx}`}
                            onMouseEnter={() => setHoveredChartIndex(idx)}
                            onMouseLeave={() => setHoveredChartIndex(null)}
                            className="group relative flex flex-col items-center"
                          >
                            <div className="mb-1 text-[11px] font-bold text-slate-700">
                              {formatShortVnd(pt.totalAmount)}
                            </div>

                            <div className="flex h-44 w-full items-end justify-center rounded-lg bg-white/80 px-2 pt-3 pb-1 ring-1 ring-slate-200/70">
                              <div
                                style={{ height: `${totalHeightPct}%` }}
                                className="flex w-full max-w-[38px] flex-col overflow-hidden rounded-t-md shadow-xs transition-all duration-300 group-hover:scale-105"
                              >
                                {/* Phần VAT phía trên */}
                                <div
                                  style={{ height: `${vatRatioPct}%` }}
                                  className="w-full bg-amber-400"
                                  title={`VAT: ${formatCurrencyVnd(pt.vat)}`}
                                />
                                {/* Phần Trước VAT phía dưới */}
                                <div className="flex-1 bg-emerald-600" />
                              </div>
                            </div>

                            <div
                              className="mt-2 w-full truncate text-center text-[11px] font-medium text-slate-700"
                              title={pt.fullTitle}
                            >
                              {pt.label}
                            </div>

                            {isHovered && (
                              <div className="pointer-events-none absolute bottom-full z-30 mb-2 w-60 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
                                <p className="font-bold text-emerald-300">
                                  {pt.fullTitle}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-300">
                                  {pt.subInfo}
                                </p>
                                <div className="mt-2 space-y-1 border-t border-slate-700 pt-1.5 text-[11px]">
                                  <div className="flex justify-between">
                                    <span>Trước VAT:</span>
                                    <strong>
                                      {formatCurrencyVnd(pt.beforeVat)}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between text-amber-300">
                                    <span>Thuế VAT:</span>
                                    <strong>{formatCurrencyVnd(pt.vat)}</strong>
                                  </div>
                                  <div className="flex justify-between font-bold text-emerald-300">
                                    <span>Tổng cộng:</span>
                                    <span>
                                      {formatCurrencyVnd(pt.totalAmount)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-xs bg-emerald-600" />
                        Doanh thu trước VAT
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-xs bg-amber-400" />
                        Thuế GTGT (VAT)
                      </span>
                    </div>
                  </div>
                ) : (
                  /* BIỂU ĐỒ ĐƯỜNG (SVG LINE CHART) */
                  <div className="mt-4 overflow-x-auto">
                    <svg
                      viewBox="0 0 800 220"
                      className="h-56 w-full min-w-[600px] rounded-lg bg-white p-3 ring-1 ring-slate-200"
                    >
                      {/* Đường lưới ngang */}
                      {[0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = 180 - ratio * 150;
                        return (
                          <g key={ratio}>
                            <line
                              x1={50}
                              y1={y}
                              x2={770}
                              y2={y}
                              stroke="#e2e8f0"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={44}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-slate-400 text-[10px]"
                            >
                              {formatShortVnd(maxChartValue * ratio)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Đường biểu diễn Tổng thanh toán & Doanh thu trước VAT */}
                      {(() => {
                        const count = chartPoints.length;
                        const stepX =
                          count > 1 ? 700 / (count - 1) : 0;

                        const totalCoords = chartPoints.map((pt, i) => {
                          const x = count > 1 ? 60 + i * stepX : 400;
                          const y =
                            180 - (pt.totalAmount / maxChartValue) * 150;
                          return { x, y, pt, i };
                        });

                        const beforeVatCoords = chartPoints.map((pt, i) => {
                          const x = count > 1 ? 60 + i * stepX : 400;
                          const y =
                            180 - (pt.beforeVat / maxChartValue) * 150;
                          return { x, y };
                        });

                        const totalPolyline = totalCoords
                          .map((c) => `${c.x},${c.y}`)
                          .join(' ');
                        const beforeVatPolyline = beforeVatCoords
                          .map((c) => `${c.x},${c.y}`)
                          .join(' ');

                        return (
                          <>
                            <polyline
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth={2.5}
                              strokeDasharray="5 3"
                              points={beforeVatPolyline}
                            />
                            <polyline
                              fill="none"
                              stroke="#059669"
                              strokeWidth={3}
                              points={totalPolyline}
                            />
                            {totalCoords.map(({ x, y, pt, i }) => (
                              <g key={`${pt.label}-${i}`}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={5}
                                  className="fill-emerald-600 stroke-white stroke-2"
                                />
                                <text
                                  x={x}
                                  y={y - 10}
                                  textAnchor="middle"
                                  className="fill-slate-700 text-[10px] font-bold"
                                >
                                  {formatShortVnd(pt.totalAmount)}
                                </text>
                                <text
                                  x={x}
                                  y={202}
                                  textAnchor="middle"
                                  className="fill-slate-600 text-[10px]"
                                >
                                  {pt.label}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                    <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 bg-emerald-600" />
                        Tổng tiền thanh toán (Sau VAT)
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 border-b-2 border-dashed border-amber-500" />
                        Doanh thu trước VAT
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* BẢNG PHÂN TÍCH DOANH THU CHI TIẾT THEO TRỤC */}
              <div className="mt-5">
                <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <h4 className="text-sm font-bold text-slate-900">
                    Bảng Đối Soát Doanh Thu ({activeDimMeta.label})
                  </h4>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder={`Tìm nhanh trong bảng (${activeDimMeta.label})...`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none sm:max-w-xs"
                  />
                </div>

                {dimensionRows.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Không có dữ liệu doanh thu thực giao trong kỳ này
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Chỉ các đơn hàng đã xuất kho giao hàng (
                      <code className="font-mono">delivered_at IS NOT NULL</code>
                      ) mới được ghi nhận vào báo cáo doanh thu.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="px-3.5 py-3 text-center">STT</th>
                          <th className="px-3.5 py-3">Mã</th>
                          <th className="px-3.5 py-3">
                            {activeDimMeta.label}
                          </th>
                          <th className="px-3.5 py-3 text-center">
                            Số phiếu xuất
                          </th>
                          <th className="px-3.5 py-3 text-right">SL Đặt</th>
                          <th className="px-3.5 py-3 text-right text-emerald-800">
                            SL Thực giao
                          </th>
                          <th className="px-3.5 py-3 text-right">
                            Doanh thu trước VAT
                          </th>
                          <th className="px-3.5 py-3 text-right">Thuế VAT</th>
                          <th className="px-3.5 py-3 text-right">
                            Tổng thanh toán
                          </th>
                          <th className="px-3.5 py-3 text-right">Tỷ trọng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {dimensionRows.map((row, index) => (
                          <tr
                            key={row.key}
                            className="transition hover:bg-slate-50/80"
                          >
                            <td className="px-3.5 py-3 text-center text-xs text-slate-500">
                              {index + 1}
                            </td>
                            <td className="px-3.5 py-3 font-mono text-xs font-semibold text-slate-700">
                              {row.code}
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="font-semibold text-slate-900">
                                {row.name}
                              </div>
                              {row.subLabel && (
                                <div className="text-xs text-slate-500">
                                  {row.subLabel}
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                {row.orderCount}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-right text-xs text-slate-500">
                              {formatQuantity(row.qtyOrdered)} {row.unit}
                            </td>
                            <td className="px-3.5 py-3 text-right font-bold text-emerald-700">
                              {formatQuantity(row.qtyDelivered)} {row.unit}
                            </td>
                            <td className="px-3.5 py-3 text-right font-medium text-slate-800">
                              {formatCurrencyVnd(row.totalBeforeVat)}
                            </td>
                            <td className="px-3.5 py-3 text-right text-amber-800">
                              {formatCurrencyVnd(row.totalVat)}
                            </td>
                            <td className="px-3.5 py-3 text-right font-bold text-slate-900">
                              {formatCurrencyVnd(row.totalAmount)}
                            </td>
                            <td className="px-3.5 py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-semibold text-slate-700">
                                  {row.sharePercent}%
                                </span>
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    style={{
                                      width: `${Math.min(100, Number(row.sharePercent) || 0)}%`,
                                    }}
                                    className="h-full bg-emerald-500"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50/70 font-bold text-slate-900">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3.5 py-3 text-right text-xs uppercase tracking-wider text-emerald-900"
                          >
                            Tổng cộng toàn kỳ:
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            {report.summary.totalDeliveredOrders}
                          </td>
                          <td className="px-3.5 py-3 text-right text-xs text-slate-600">
                            {formatQuantity(report.summary.totalQtyOrdered)}
                          </td>
                          <td className="px-3.5 py-3 text-right text-emerald-800">
                            {formatQuantity(report.summary.totalQtyDelivered)}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            {formatCurrencyVnd(report.summary.totalBeforeVat)}
                          </td>
                          <td className="px-3.5 py-3 text-right text-amber-900">
                            {formatCurrencyVnd(report.summary.totalVat)}
                          </td>
                          <td className="px-3.5 py-3 text-right text-emerald-800">
                            {formatCurrencyVnd(report.summary.totalAmount)}
                          </td>
                          <td className="px-3.5 py-3 text-right text-xs">
                            100.00%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
};
