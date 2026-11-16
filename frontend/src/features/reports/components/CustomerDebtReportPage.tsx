import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  formatCurrencyVnd,
  formatDateTimeVi,
  formatQuantity,
} from '../../../lib/formatters';
import {
  useCustomerDebtReport,
  useReportFilterCatalogs,
} from '../hooks/useReports';
import {
  DebtDeliveryVoucherRow,
  DebtGroupBy,
  DebtGroupView,
} from '../types/reports.types';
import {
  exportAllLocationsDebtFiles,
  exportSingleLocationDebtToExcel,
  numberToVietnameseWords,
  printCustomerDebtStatement,
} from '../utils/reportExport';

function getInitialDates(): { fromDate: string; toDate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    fromDate: `${y}-${m}-01`,
    toDate: `${y}-${m}-${d}`,
  };
}

export const CustomerDebtReportPage: React.FC = () => {
  const initialDates = useMemo(() => getInitialDates(), []);

  const [fromDate, setFromDate] = useState<string>(initialDates.fromDate);
  const [toDate, setToDate] = useState<string>(initialDates.toDate);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [groupBy, setGroupBy] = useState<DebtGroupBy>('location');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const [selectedVoucherForDetail, setSelectedVoucherForDetail] =
    useState<DebtDeliveryVoucherRow | null>(null);
  const [isLocationExportModalOpen, setIsLocationExportModalOpen] =
    useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const { data: catalogs } = useReportFilterCatalogs();

  // Danh sách địa điểm trong dropdown phụ thuộc vào Khách hàng đang chọn
  const availableLocations = useMemo(() => {
    const allLocations = catalogs?.locations ?? [];
    if (!selectedCustomerId) {
      return allLocations;
    }
    const custIdNum = Number(selectedCustomerId);
    return allLocations.filter((loc) => loc.customerId === custIdNum);
  }, [catalogs?.locations, selectedCustomerId]);

  const handleCustomerChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextCustId = e.target.value;
      setSelectedCustomerId(nextCustId);
      setSelectedLocationId('');
    },
    [],
  );

  const queryParams = useMemo(
    () => ({
      fromDate,
      toDate,
      customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
      locationId: selectedLocationId ? Number(selectedLocationId) : undefined,
      groupBy,
      sortOrder,
    }),
    [
      fromDate,
      toDate,
      selectedCustomerId,
      selectedLocationId,
      groupBy,
      sortOrder,
    ],
  );

  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCustomerDebtReport(queryParams);

  // Danh sách nhóm hiển thị theo nút toggle [Khách hàng] hoặc [Địa điểm] + lọc từ khóa nhanh
  const displayedGroups = useMemo<DebtGroupView[]>(() => {
    if (!report) {
      return [];
    }

    const sourceGroups =
      groupBy === 'customer'
        ? report.customerGroups
        : report.locationGroups;

    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) {
      return sourceGroups;
    }

    return sourceGroups.filter(
      (grp) =>
        grp.customerName.toLowerCase().includes(kw) ||
        grp.customerCode.toLowerCase().includes(kw) ||
        (grp.locationName ?? '').toLowerCase().includes(kw) ||
        (grp.locationAddress ?? '').toLowerCase().includes(kw) ||
        grp.vouchers.some(
          (v) =>
            v.deliveryCode.toLowerCase().includes(kw) ||
            v.orderCode.toLowerCase().includes(kw),
        ),
    );
  }, [report, groupBy, searchKeyword]);

  // Xử lý bấm nút "In bảng công nợ"
  const handlePrintDebtStatement = useCallback(() => {
    if (!report || displayedGroups.length === 0) {
      return;
    }
    printCustomerDebtStatement(
      {
        ...report,
        groupBy,
      },
      displayedGroups,
    );
  }, [report, groupBy, displayedGroups]);

  // Xử lý bấm nút "Xuất file công nợ từng địa điểm" (sinh file riêng biệt cho từng địa điểm giao hàng)
  const handleExportAllLocationsFiles = useCallback(() => {
    if (!report || report.locationGroups.length === 0) {
      return;
    }
    const count = exportAllLocationsDebtFiles(
      report.locationGroups,
      report.period,
      report.companyInfo,
    );
    setBannerNotice(
      `Đã khởi tạo và tải xuống ${count} file Excel đối soát công nợ riêng biệt cho ${count} địa điểm giao hàng.`,
    );
  }, [report]);

  // Xuất riêng 1 địa điểm cụ thể
  const handleExportSingleLocation = useCallback(
    (locGroup: DebtGroupView) => {
      if (!report) {
        return;
      }
      exportSingleLocationDebtToExcel(
        locGroup,
        report.period,
        report.companyInfo,
      );
      setBannerNotice(
        `Đã xuất file công nợ riêng cho địa điểm "${locGroup.locationName ?? locGroup.customerName}".`,
      );
    },
    [report],
  );

  return (
    <div className="space-y-6">
      {/* Header Trang 16 & Bộ công cụ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                TRANG 16
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Báo Cáo &amp; Đối Soát Công Nợ Khách Hàng
              </h2>
              {isFetching && (
                <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                  Đang đồng bộ phiếu xuất...
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              Đối chiếu chính xác số tiền phải thu theo từng{' '}
              <strong>Khách hàng</strong> và từng{' '}
              <strong>Địa điểm giao hàng</strong> dựa trên số lượng thực giao (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">
                qty_delivered
              </code>
              ) của các phiếu xuất kho.
            </p>
          </div>

          {/* 2 Nút hành động chuẩn theo yêu cầu */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrintDebtStatement}
              disabled={!report || displayedGroups.length === 0}
            >
              <span>🖨 In bảng công nợ</span>
            </Button>

            <Button
              variant="amber"
              size="sm"
              onClick={() => setIsLocationExportModalOpen(true)}
              disabled={!report || report.locationGroups.length === 0}
            >
              <span>
                📁 Xuất file công nợ từng địa điểm (
                {report?.locationGroups.length ?? 0})
              </span>
            </Button>
          </div>
        </div>

        {/* Bộ lọc: Khoảng ngày | Khách hàng | Địa điểm | Thứ tự ngày giao */}
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-12">
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

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Khách hàng
            </label>
            <select
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- Tất cả khách hàng --</option>
              {(catalogs?.customers ?? []).map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} ({cust.code})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Địa điểm giao hàng
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">
                -- Tất cả địa điểm ({availableLocations.length}) --
              </option>
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} — {loc.customerName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Sắp xếp ngày giao
            </label>
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as 'asc' | 'desc')
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="asc">Cũ → Mới (Tăng dần)</option>
              <option value="desc">Mới → Cũ (Giảm dần)</option>
            </select>
          </div>
        </div>

        {/* Thanh Toggle Gom nhóm theo [Khách hàng] hoặc [Địa điểm] + Tìm kiếm */}
        <div className="mt-4 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Gom nhóm đối soát:
            </span>
            <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setGroupBy('location')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  groupBy === 'location'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo [Địa điểm] ({report?.locationGroups.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('customer')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  groupBy === 'customer'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo [Khách hàng] ({report?.customerGroups.length ?? 0})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:w-80">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm mã phiếu xuất, mã đơn, tên KH, địa điểm..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Thông báo xuất file */}
      {bannerNotice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          <span>{bannerNotice}</span>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="ml-4 underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Trạng thái Loading / Error */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-900">
            {error instanceof Error
              ? error.message
              : 'Không thể tải báo cáo công nợ khách hàng.'}
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
            {/* Tóm tắt Tổng công nợ phải thu toàn kỳ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">
                  Số phiếu xuất / Điểm giao
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {report.summary.totalVouchers} phiếu
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {report.summary.totalCustomers} Khách hàng •{' '}
                  {report.summary.totalLocations} Địa điểm
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">
                  Tổng tiền trước VAT
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {formatCurrencyVnd(report.summary.grandTotalBeforeVat)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  SL thực giao:{' '}
                  {formatQuantity(report.summary.totalQtyDelivered)}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
                <p className="text-xs font-semibold text-amber-800">
                  Tổng tiền thuế VAT
                </p>
                <p className="mt-1 text-xl font-extrabold text-amber-900">
                  {formatCurrencyVnd(report.summary.grandTotalVat)}
                </p>
                <p className="mt-1 text-xs text-amber-800/80">
                  Tính trên sản lượng thực xuất
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 shadow-xs">
                <p className="text-xs font-bold text-emerald-900">
                  Tổng công nợ phải thu
                </p>
                <p className="mt-1 text-xl font-extrabold text-emerald-800">
                  {formatCurrencyVnd(report.summary.grandTotalAmount)}
                </p>
                <p
                  className="mt-1 truncate text-[11px] italic text-emerald-800"
                  title={numberToVietnameseWords(
                    report.summary.grandTotalAmount,
                  )}
                >
                  {numberToVietnameseWords(report.summary.grandTotalAmount)}
                </p>
              </div>
            </div>

            {/* DANH SÁCH BẢNG ĐỐI SOÁT THEO TỪNG NHÓM (KHÁCH HÀNG HOẶC ĐỊA ĐIỂM) */}
            {displayedGroups.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-base font-semibold text-slate-700">
                  Không có phát sinh công nợ xuất kho trong kỳ đối soát này
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Hãy kiểm tra lại bộ lọc khoảng ngày, khách hàng hoặc địa điểm
                  giao hàng.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {displayedGroups.map((group, groupIndex) => (
                  <div
                    key={group.groupKey}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                  >
                    {/* Header của từng Nhóm Khách hàng / Địa điểm */}
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5 lg:flex-row lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                            #{groupIndex + 1}
                          </span>
                          {group.groupBy === 'location' ? (
                            <>
                              <h3 className="text-sm font-bold text-slate-900">
                                Địa điểm: {group.locationName}
                              </h3>
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                KH: {group.customerName} ({group.customerCode})
                              </span>
                            </>
                          ) : (
                            <>
                              <h3 className="text-sm font-bold text-slate-900">
                                Khách hàng: {group.customerName} (
                                {group.customerCode})
                              </h3>
                              {group.customerTaxCode && (
                                <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                                  MST: {group.customerTaxCode}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-slate-600">
                          {group.groupBy === 'location' ? (
                            <>
                              <span>
                                Địa chỉ giao:{' '}
                                <strong>{group.locationAddress}</strong>
                              </span>
                              {group.receiverName && (
                                <span className="ml-3">
                                  • Người nhận: {group.receiverName}{' '}
                                  {group.receiverPhone
                                    ? `(${group.receiverPhone})`
                                    : ''}
                                </span>
                              )}
                            </>
                          ) : (
                            <span>
                              Tổng số phiếu xuất trong kỳ:{' '}
                              <strong>{group.voucherCount} phiếu</strong>{' '}
                              {group.customerPhone
                                ? `• Điện thoại: ${group.customerPhone}`
                                : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            printCustomerDebtStatement(
                              { ...report, groupBy },
                              [group],
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          🖨 In riêng nhóm này
                        </button>

                        {group.groupBy === 'location' && (
                          <button
                            type="button"
                            onClick={() => handleExportSingleLocation(group)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          >
                            ⬇ Xuất file công nợ địa điểm này
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bảng đối soát công nợ của nhóm */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50/70 text-xs font-semibold uppercase text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Ngày giao</th>
                            <th className="px-4 py-3">Mã phiếu xuất</th>
                            <th className="px-4 py-3">Mã đơn hàng</th>
                            <th className="px-4 py-3">
                              {group.groupBy === 'customer'
                                ? 'Địa điểm giao hàng'
                                : 'Khách hàng'}
                            </th>
                            <th className="px-4 py-3 text-right">
                              SL Thực giao
                            </th>
                            <th className="px-4 py-3 text-right">
                              Tiền trước VAT
                            </th>
                            <th className="px-4 py-3 text-right">Tiền VAT</th>
                            <th className="px-4 py-3 text-right">Tổng cộng</th>
                            <th className="px-4 py-3 text-right">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {group.vouchers.map((voucher) => (
                            <tr
                              key={voucher.orderId}
                              className="transition hover:bg-slate-50/80"
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-800">
                                {formatDateTimeVi(voucher.deliveredAt)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                                  {voucher.deliveryCode}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-semibold text-slate-900">
                                    {voucher.orderCode}
                                  </span>
                                  {voucher.orderType === 'compensation' && (
                                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                                      Đơn bù
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-700">
                                {group.groupBy === 'customer' ? (
                                  <div>
                                    <strong className="text-slate-900">
                                      {voucher.locationName}
                                    </strong>
                                    <div className="text-[11px] text-slate-500">
                                      {voucher.locationAddress}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <strong className="text-slate-900">
                                      {voucher.customerName}
                                    </strong>
                                    <div className="text-[11px] text-slate-500">
                                      Mã KH: {voucher.customerCode}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                {formatQuantity(voucher.totalQtyDelivered)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-800">
                                {formatCurrencyVnd(voucher.totalBeforeVat)}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-800">
                                {formatCurrencyVnd(voucher.totalVat)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                {formatCurrencyVnd(voucher.totalAmount)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedVoucherForDetail(voucher)
                                  }
                                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Xem ({voucher.items.length} SP)
                                </button>
                              </td>
                            </tr>
                          ))}

                          {/* HÀNG TỔNG CỘNG DỒN CUỐI MỖI NHÓM KHÁCH / ĐỊA ĐIỂM */}
                          <tr className="bg-amber-50/80 font-bold text-slate-900">
                            <td
                              colSpan={4}
                              className="px-4 py-3 text-right text-xs uppercase tracking-wider text-amber-900"
                            >
                              Tổng cộng dồn{' '}
                              {group.groupBy === 'location'
                                ? `địa điểm [${group.locationName}]`
                                : `khách hàng [${group.customerName}]`}{' '}
                              ({group.voucherCount} phiếu xuất):
                            </td>
                            <td className="px-4 py-3 text-right text-slate-800">
                              {formatQuantity(group.subtotalQtyDelivered)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {formatCurrencyVnd(group.subtotalBeforeVat)}
                            </td>
                            <td className="px-4 py-3 text-right text-amber-900">
                              {formatCurrencyVnd(group.subtotalVat)}
                            </td>
                            <td className="px-4 py-3 text-right text-base text-emerald-800">
                              {formatCurrencyVnd(group.subtotalAmount)}
                            </td>
                            <td className="px-4 py-3" />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* ĐẠI TỔNG CỘNG TOÀN BỘ KỲ ĐỐI SOÁT */}
                <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 p-5 text-white shadow-md">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Đại Tổng Cộng Công Nợ Toàn Kỳ ({report.period.fromDate}{' '}
                        → {report.period.toDate})
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        Bằng chữ:{' '}
                        <em className="font-semibold text-white">
                          {numberToVietnameseWords(
                            report.summary.grandTotalAmount,
                          )}
                        </em>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-right">
                      <div>
                        <p className="text-[11px] text-slate-400">
                          Tổng trước VAT
                        </p>
                        <p className="text-base font-bold">
                          {formatCurrencyVnd(
                            report.summary.grandTotalBeforeVat,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-amber-300">
                          Tổng thuế VAT
                        </p>
                        <p className="text-base font-bold text-amber-300">
                          {formatCurrencyVnd(report.summary.grandTotalVat)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-emerald-300">
                          Tổng thanh toán phải thu
                        </p>
                        <p className="text-2xl font-extrabold text-emerald-400">
                          {formatCurrencyVnd(report.summary.grandTotalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* MODAL 1: CHI TIẾT MẶT HÀNG THỰC GIAO TRONG PHIẾU XUẤT KHO */}
      <Modal
        isOpen={selectedVoucherForDetail !== null}
        title={
          selectedVoucherForDetail
            ? `Chi Tiết Phiếu Xuất Kho: ${selectedVoucherForDetail.deliveryCode}`
            : ''
        }
        subtitle={
          selectedVoucherForDetail
            ? `Đơn hàng: ${selectedVoucherForDetail.orderCode} • Giao lúc: ${formatDateTimeVi(selectedVoucherForDetail.deliveredAt)} • Địa điểm: ${selectedVoucherForDetail.locationName}`
            : undefined
        }
        onClose={() => setSelectedVoucherForDetail(null)}
        footer={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedVoucherForDetail(null)}
          >
            Đóng
          </Button>
        }
      >
        {selectedVoucherForDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 text-xs sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Khách hàng:</p>
                <p className="font-bold text-slate-900">
                  {selectedVoucherForDetail.customerName} (
                  {selectedVoucherForDetail.customerCode})
                </p>
              </div>
              <div>
                <p className="text-slate-500">Địa điểm nhận hàng:</p>
                <p className="font-bold text-slate-900">
                  {selectedVoucherForDetail.locationName} —{' '}
                  {selectedVoucherForDetail.locationAddress}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5">Mã SP</th>
                    <th className="px-3 py-2.5">Tên thành phẩm</th>
                    <th className="px-3 py-2.5 text-right">SL Đặt</th>
                    <th className="px-3 py-2.5 text-right text-emerald-800">
                      SL Thực giao
                    </th>
                    <th className="px-3 py-2.5 text-right">Đơn giá</th>
                    <th className="px-3 py-2.5 text-right">VAT (%)</th>
                    <th className="px-3 py-2.5 text-right">Tiền trước VAT</th>
                    <th className="px-3 py-2.5 text-right">Tiền VAT</th>
                    <th className="px-3 py-2.5 text-right">Tổng cộng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedVoucherForDetail.items.map((item) => (
                    <tr key={item.orderItemId}>
                      <td className="px-3 py-2.5 font-mono text-slate-600">
                        {item.productCode}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-500">
                        {formatQuantity(item.qtyOrdered)} {item.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                        {formatQuantity(item.qtyDelivered)} {item.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatCurrencyVnd(item.unitPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {Number(item.vatRate).toFixed(0)}%
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatCurrencyVnd(item.lineBeforeVat)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-amber-800">
                        {formatCurrencyVnd(item.lineVat)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                        {formatCurrencyVnd(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50 font-bold text-slate-900">
                  <tr>
                    <td colSpan={6} className="px-3 py-2.5 text-right">
                      TỔNG CỘNG PHIẾU XUẤT:
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {formatCurrencyVnd(
                        selectedVoucherForDetail.totalBeforeVat,
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-900">
                      {formatCurrencyVnd(selectedVoucherForDetail.totalVat)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-800">
                      {formatCurrencyVnd(selectedVoucherForDetail.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: XUẤT FILE CÔNG NỢ RIÊNG BIỆT CHO TỪNG ĐỊA ĐIỂM GIAO HÀNG */}
      <Modal
        isOpen={isLocationExportModalOpen}
        title="Xuất File Công Nợ Riêng Từng Địa Điểm Giao Hàng"
        subtitle="Mỗi địa điểm giao hàng được sinh một file Excel (.xls) đối soát công nợ độc lập để gửi cho từng cửa hàng/chi nhánh của khách."
        onClose={() => setIsLocationExportModalOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsLocationExportModalOpen(false)}
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                handleExportAllLocationsFiles();
                setIsLocationExportModalOpen(false);
              }}
              disabled={!report || report.locationGroups.length === 0}
            >
              ⬇ Tải tất cả ({report?.locationGroups.length ?? 0} file riêng
              biệt)
            </Button>
          </>
        }
      >
        {report && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              Hệ thống đã gom nhóm{' '}
              <strong>{report.locationGroups.length} địa điểm giao hàng</strong>{' '}
              có phát sinh phiếu xuất trong kỳ{' '}
              <strong>
                {report.period.fromDate} → {report.period.toDate}
              </strong>
              . Bạn có thể bấm <strong>&quot;Tải tất cả&quot;</strong> để sinh
              tự động từng file cho mọi địa điểm, hoặc tải lẻ từng địa điểm bên
              dưới:
            </div>

            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5">Địa điểm giao hàng</th>
                    <th className="px-3.5 py-2.5">Thuộc Khách hàng</th>
                    <th className="px-3.5 py-2.5 text-center">Số phiếu</th>
                    <th className="px-3.5 py-2.5 text-right">
                      Tổng công nợ phải thu
                    </th>
                    <th className="px-3.5 py-2.5 text-right">Xuất file lẻ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.locationGroups.map((locGroup) => (
                    <tr key={locGroup.groupKey}>
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-900">
                          {locGroup.locationName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {locGroup.locationAddress}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-800">
                        {locGroup.customerName} ({locGroup.customerCode})
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        {locGroup.voucherCount}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700">
                        {formatCurrencyVnd(locGroup.subtotalAmount)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleExportSingleLocation(locGroup)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700"
                        >
                          ⬇ Xuất .xls
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
