import React, { useCallback, useMemo, useState } from 'react';
import {
  useInventoryCatalogs,
  useInventoryOverview,
  useRecordWasteLossMutation,
  useWasteLossHistory,
} from '../hooks/useInventory';
import { InventoryTargetType } from '../types/inventory.types';
import { formatQuantity } from '../../../lib/formatters';
import { Button } from '../../../components/ui/Button';

export const WasteLossPage: React.FC = () => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // State cho Form ghi nhận Hủy & Hao hụt
  const [movementDate, setMovementDate] = useState<string>(todayStr);
  const [targetType, setTargetType] =
    useState<InventoryTargetType>('material');
  const [targetId, setTargetId] = useState<number>(0);
  const [qty, setQty] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Bộ lọc lịch sử hủy
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data: catalogs } = useInventoryCatalogs();
  const { data: overview } = useInventoryOverview();
  const {
    data: historyLogs = [],
    isLoading,
    refetch,
  } = useWasteLossHistory(fromDate || undefined, toDate || undefined);

  const recordWasteMutation = useRecordWasteLossMutation();

  const selectableItems = useMemo(() => {
    if (targetType === 'product') {
      const stockMap = new Map(
        (overview?.products ?? []).map((p) => [p.productId, p.physicalQty]),
      );
      return (catalogs?.products ?? []).map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        currentStock: stockMap.get(p.id) ?? '0.000',
      }));
    }

    const stockMap = new Map(
      (overview?.materials ?? []).map((m) => [m.materialId, m.physicalQty]),
    );
    return (catalogs?.materials ?? []).map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      unit: m.unit,
      currentStock: stockMap.get(m.id) ?? '0.000',
    }));
  }, [catalogs, overview, targetType]);

  const selectedItemInfo = useMemo(
    () => selectableItems.find((i) => i.id === targetId) ?? null,
    [selectableItems, targetId],
  );

  const handleTargetTypeChange = useCallback((type: InventoryTargetType) => {
    setTargetType(type);
    setTargetId(0);
  }, []);

  const handleSubmitWasteLoss = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFeedback(null);

      if (!targetId) {
        setFeedback({
          type: 'error',
          message: 'Vui lòng chọn mặt hàng cần ghi nhận hủy / hao hụt.',
        });
        return;
      }

      const qtyNum = Number(qty);
      if (Number.isNaN(qtyNum) || qtyNum <= 0) {
        setFeedback({
          type: 'error',
          message: 'Số lượng hủy phải lớn hơn 0.',
        });
        return;
      }

      if (!reason.trim()) {
        setFeedback({
          type: 'error',
          message: 'Vui lòng nhập lý do hủy / hao hụt.',
        });
        return;
      }

      try {
        const res = await recordWasteMutation.mutateAsync({
          movementDate,
          targetType,
          targetId,
          qty: String(qty),
          reason: reason.trim(),
        });

        setQty('');
        setReason('');
        setFeedback({
          type: 'success',
          message: res.message,
        });
      } catch (err) {
        setFeedback({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Không thể ghi nhận phiếu hủy hàng.',
        });
      }
    },
    [movementDate, qty, reason, recordWasteMutation, targetId, targetType],
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Cột trái (5/12): Form Ghi nhận Hủy & Hao hụt */}
      <div className="lg:col-span-5">
        <form
          onSubmit={(e) => void handleSubmitWasteLoss(e)}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <h2 className="text-lg font-bold text-slate-900">
            Trang 13: Ghi Nhận Hủy &amp; Hao Hụt
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Trừ tồn kho tức thì thông qua bút toán{' '}
            <code className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">
              stock_movements (waste_loss)
            </code>
            .
          </p>

          {feedback && (
            <div
              className={`mt-4 rounded-xl border p-3 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-rose-300 bg-rose-50 text-rose-900'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="mt-5 space-y-4">
            {/* Loại mặt hàng hủy */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Phân loại mặt hàng hủy <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleTargetTypeChange('material')}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                    targetType === 'material'
                      ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Nguyên vật liệu (BOM)
                </button>
                <button
                  type="button"
                  onClick={() => handleTargetTypeChange('product')}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                    targetType === 'product'
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Thành phẩm
                </button>
              </div>
            </div>

            {/* Chọn mặt hàng */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Chọn mặt hàng cần hủy <span className="text-rose-600">*</span>
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
              >
                <option value={0}>
                  -- Chọn{' '}
                  {targetType === 'product' ? 'thành phẩm' : 'nguyên vật liệu'}{' '}
                  --
                </option>
                {selectableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code}) — Tồn:{' '}
                    {formatQuantity(item.currentStock)} {item.unit}
                  </option>
                ))}
              </select>

              {selectedItemInfo && (
                <p className="mt-1.5 text-xs text-slate-600">
                  Tồn vật lý hiện tại:{' '}
                  <strong className="text-emerald-700">
                    {formatQuantity(selectedItemInfo.currentStock)}{' '}
                    {selectedItemInfo.unit}
                  </strong>
                </p>
              )}
            </div>

            {/* Ngày hủy & Số lượng hủy */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Ngày hủy <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={movementDate}
                  onChange={(e) => setMovementDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Số lượng hủy{' '}
                  {selectedItemInfo ? `(${selectedItemInfo.unit})` : ''}{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="VD: 2.5"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-rose-700 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Lý do hủy */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Lý do hủy / hao hụt <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Hết hạn sử dụng ca tối, đổ vỡ trong lúc pha chế, hỏng bao bì..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              variant="danger"
              isLoading={recordWasteMutation.isPending}
              className="w-full"
            >
              Xác Nhận Hủy Hàng &amp; Trừ Tồn Kho Ngay
            </Button>
          </div>
        </form>
      </div>

      {/* Cột phải (7/12): Lịch sử Hủy & Hao hụt */}
      <div className="lg:col-span-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Nhật Ký Hủy &amp; Hao Hụt Kho
              </h3>
              <p className="text-xs text-slate-500">
                Danh sách các giao dịch hủy hàng đã trừ tồn kho
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <span className="text-xs text-slate-400">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refetch()}
              >
                Lọc
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-full animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Chưa có bản ghi hủy / hao hụt nào trong khoảng thời gian này.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5">Ngày hủy</th>
                    <th className="px-3 py-2.5">Loại</th>
                    <th className="px-3 py-2.5">Mặt hàng</th>
                    <th className="px-3 py-2.5 text-right">Số lượng hủy</th>
                    <th className="px-3 py-2.5">Lý do</th>
                    <th className="px-3 py-2.5">Người ghi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {log.movementDate}
                      </td>
                      <td className="px-3 py-2.5">
                        {log.targetType === 'product' ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                            TP
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                            NL
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">
                          {log.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {log.code}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-rose-700 whitespace-nowrap">
                        -{formatQuantity(log.qty)} {log.unit}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {log.reason}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {log.createdByName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

