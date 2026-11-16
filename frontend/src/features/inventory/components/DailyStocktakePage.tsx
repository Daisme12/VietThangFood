import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useDailyStocktakeSheet,
  useSubmitDailyStocktakeMutation,
} from '../hooks/useInventory';
import {
  InventoryTargetType,
  StocktakeSheetRow,
} from '../types/inventory.types';
import { formatQuantity } from '../../../lib/formatters';
import { Button } from '../../../components/ui/Button';

export const DailyStocktakePage: React.FC = () => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [stocktakeDate, setStocktakeDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'all' | InventoryTargetType>('all');
  const [generalNote, setGeneralNote] = useState<string>('');

  // Map lưu giá trị "Tồn thực tế" người dùng nhập theo key `${targetType}-${targetId}`
  const [actualStockInputs, setActualStockInputs] = useState<
    Record<string, string>
  >({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const {
    data: sheetData,
    isLoading,
    isError,
    error,
    refetch,
  } = useDailyStocktakeSheet(stocktakeDate);

  const submitStocktakeMutation = useSubmitDailyStocktakeMutation();

  // Khởi tạo giá trị mặc định của ô "Tồn thực tế" bằng Tồn hệ thống khi tải dữ liệu
  useEffect(() => {
    if (!sheetData) return;
    const nextInputs: Record<string, string> = {};
    for (const p of sheetData.products) {
      nextInputs[`product-${p.targetId}`] = p.systemStock;
    }
    for (const m of sheetData.materials) {
      nextInputs[`material-${m.targetId}`] = m.systemStock;
    }
    setActualStockInputs(nextInputs);
  }, [sheetData]);

  // Gộp danh sách hiển thị theo Tab đang chọn
  const displayedRows = useMemo<StocktakeSheetRow[]>(() => {
    if (!sheetData) return [];
    if (activeTab === 'product') return sheetData.products;
    if (activeTab === 'material') return sheetData.materials;
    return [...sheetData.products, ...sheetData.materials];
  }, [sheetData, activeTab]);

  // Tính toán chênh lệch (actualStock - systemStock) và thống kê số dòng lệch lớn
  const diffSummary = useMemo(() => {
    const rowDiffMap = new Map<
      string,
      {
        diffNum: number;
        diffPercent: number;
        isLargeVariance: boolean;
        hasVariance: boolean;
      }
    >();

    let changedCount = 0;
    let largeVarianceCount = 0;

    const allRows = sheetData
      ? [...sheetData.products, ...sheetData.materials]
      : [];

    for (const row of allRows) {
      const key = `${row.targetType}-${row.targetId}`;
      const sysNum = Number(row.systemStock) || 0;
      const actualRaw = actualStockInputs[key] ?? row.systemStock;
      const actualNum = Number(actualRaw);

      if (Number.isNaN(actualNum)) {
        rowDiffMap.set(key, {
          diffNum: 0,
          diffPercent: 0,
          isLargeVariance: false,
          hasVariance: false,
        });
        continue;
      }

      const diffNum = Math.round((actualNum - sysNum) * 1000) / 1000;
      const hasVariance = Math.abs(diffNum) >= 0.001;
      const diffPercent =
        sysNum > 0 ? Math.abs((diffNum / sysNum) * 100) : hasVariance ? 100 : 0;

      // Cảnh báo lệch lớn nếu lệch >= 5 đơn vị hoặc lệch >= 10% tồn hệ thống
      const isLargeVariance =
        hasVariance && (Math.abs(diffNum) >= 5 || diffPercent >= 10);

      if (hasVariance) changedCount += 1;
      if (isLargeVariance) largeVarianceCount += 1;

      rowDiffMap.set(key, {
        diffNum,
        diffPercent,
        isLargeVariance,
        hasVariance,
      });
    }

    return {
      rowDiffMap,
      changedCount,
      largeVarianceCount,
    };
  }, [sheetData, actualStockInputs]);

  const handleActualInputChange = useCallback((key: string, value: string) => {
    setActualStockInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleItemNoteChange = useCallback((key: string, value: string) => {
    setItemNotes((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleSubmitStocktake = useCallback(async () => {
    if (!sheetData) return;
    setFeedback(null);

    const allRows = [...sheetData.products, ...sheetData.materials];
    const itemsPayload = allRows.map((row) => {
      const key = `${row.targetType}-${row.targetId}`;
      const actualVal = actualStockInputs[key] ?? row.systemStock;
      return {
        targetType: row.targetType,
        targetId: row.targetId,
        actualStock: String(actualVal),
        note: itemNotes[key]?.trim() || undefined,
      };
    });

    try {
      const result = await submitStocktakeMutation.mutateAsync({
        stocktakeDate,
        generalNote: generalNote.trim() || undefined,
        items: itemsPayload,
      });

      setFeedback({
        type: 'success',
        message: result.message,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi lưu kiểm kê cuối ngày.',
      });
    }
  }, [
    actualStockInputs,
    generalNote,
    itemNotes,
    sheetData,
    stocktakeDate,
    submitStocktakeMutation,
  ]);

  return (
    <div className="space-y-5">
      {/* Header & Thanh công cụ Kiểm kê */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Trang 12: Kiểm Kê Kho Cuối Ngày (Chốt Tồn Thực Tế)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Đối chiếu tồn hệ thống và tồn kiểm đếm thực tế. Hệ thống tự động
              ghi nhận chênh lệch vào{' '}
              <code className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">
                stock_movements (adjustment)
              </code>{' '}
              làm mốc tồn đầu ngày hôm sau.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">
                Ngày chốt kiểm kê:
              </label>
              <input
                type="date"
                value={stocktakeDate}
                onChange={(e) => setStocktakeDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <Button variant="secondary" onClick={() => void refetch()}>
              Tải lại tồn hệ thống
            </Button>

            <Button
              variant="primary"
              isLoading={submitStocktakeMutation.isPending}
              onClick={() => void handleSubmitStocktake()}
            >
              Lưu Kiểm Kê &amp; Chốt Tồn ({diffSummary.changedCount} lệch)
            </Button>
          </div>
        </div>

        {/* Bộ chọn Tab Thành phẩm / Nguyên vật liệu & Ghi chú chung */}
        <div className="mt-4 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả ({(sheetData?.products.length ?? 0) + (sheetData?.materials.length ?? 0)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('product')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'product'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Thành phẩm ({sheetData?.products.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('material')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'material'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Nguyên vật liệu ({sheetData?.materials.length ?? 0})
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">
              Mặt hàng có chênh lệch: {diffSummary.changedCount}
            </span>
            {diffSummary.largeVarianceCount > 0 && (
              <span className="animate-pulse rounded-full bg-rose-600 px-3 py-1 font-bold text-white">
                Cảnh báo lệch lớn (&ge;10% hoặc &ge;5 ĐVT):{' '}
                {diffSummary.largeVarianceCount}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <input
            type="text"
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            placeholder="Ghi chú biên bản kiểm kê cuối ngày (VD: Kiểm kê ca tối 22h00)..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Thông báo kết quả */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-rose-300 bg-rose-50 text-rose-900'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-4 text-xs font-bold underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Bảng Kiểm Kê */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-rose-800">
              {error instanceof Error
                ? error.message
                : 'Không thể tải bảng kiểm kê.'}
            </p>
          </div>
        ) : displayedRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Chưa có mặt hàng nào trong danh mục kho.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Phân loại</th>
                  <th className="px-4 py-3.5">Mã / Tên mặt hàng</th>
                  <th className="px-4 py-3.5 text-center">ĐVT</th>
                  <th className="px-4 py-3.5 text-right">
                    Tồn hệ thống (System)
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    Tồn thực tế (Nhập kiểm đếm)
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    Chênh lệch (Tự tính)
                  </th>
                  <th className="px-4 py-3.5">Ghi chú nguyên nhân lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRows.map((row) => {
                  const key = `${row.targetType}-${row.targetId}`;
                  const actualVal = actualStockInputs[key] ?? row.systemStock;
                  const diffInfo = diffSummary.rowDiffMap.get(key) ?? {
                    diffNum: 0,
                    diffPercent: 0,
                    isLargeVariance: false,
                    hasVariance: false,
                  };

                  return (
                    <tr
                      key={key}
                      className={
                        diffInfo.isLargeVariance
                          ? 'bg-rose-50/70'
                          : diffInfo.hasVariance
                            ? 'bg-amber-50/40'
                            : 'hover:bg-slate-50'
                      }
                    >
                      <td className="px-4 py-3">
                        {row.targetType === 'product' ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            Thành phẩm
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            Nguyên liệu
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {row.name}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {row.code} — {row.categoryOrSupplierName}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-xs font-medium text-slate-600">
                        {row.unit}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {formatQuantity(row.systemStock)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={actualVal}
                          onChange={(e) =>
                            handleActualInputChange(key, e.target.value)
                          }
                          className={`w-32 rounded-lg border px-3 py-1.5 text-right text-sm font-bold focus:outline-none ${
                            diffInfo.isLargeVariance
                              ? 'border-rose-500 bg-white text-rose-900 ring-2 ring-rose-200'
                              : diffInfo.hasVariance
                                ? 'border-amber-500 bg-white text-amber-900'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                          }`}
                        />
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {!diffInfo.hasVariance ? (
                          <span className="text-xs font-medium text-slate-400">
                            0 (Khớp)
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-extrabold ${
                                diffInfo.isLargeVariance
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : diffInfo.diffNum < 0
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {diffInfo.diffNum > 0 ? '+' : ''}
                              {formatQuantity(diffInfo.diffNum)} {row.unit}
                            </span>
                            {diffInfo.isLargeVariance && (
                              <span className="mt-0.5 text-[11px] font-bold text-rose-700">
                                Cảnh báo lệch lớn (
                                {diffInfo.diffPercent.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={itemNotes[key] ?? ''}
                          onChange={(e) =>
                            handleItemNoteChange(key, e.target.value)
                          }
                          placeholder={
                            diffInfo.hasVariance
                              ? 'Nhập lý do lệch...'
                              : 'Ghi chú (tùy chọn)'
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none"
                        />
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

