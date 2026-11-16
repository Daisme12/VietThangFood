import React, { useCallback, useMemo, useState } from 'react';
import {
  useCreatePurchaseReceiptMutation,
  useInventoryCatalogs,
  usePurchaseReceipts,
} from '../hooks/useInventory';
import {
  formatCurrencyVnd,
  formatQuantity,
} from '../../../lib/formatters';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

interface DraftReceiptLine {
  rowKey: string;
  materialId: number;
  qty: string;
  unitPrice: string;
  note: string;
}

export const PurchaseReceiptPage: React.FC = () => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Bộ lọc danh sách phiếu nhập
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('');
  const [filterMaterialId, setFilterMaterialId] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [expandedReceiptCode, setExpandedReceiptCode] = useState<string | null>(
    null,
  );

  // State cho Popup Tạo phiếu nhập
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [receiptCode, setReceiptCode] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>(todayStr);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
  const [generalNote, setGeneralNote] = useState<string>('');
  const [draftLines, setDraftLines] = useState<DraftReceiptLine[]>([
    {
      rowKey: 'line-1',
      materialId: 0,
      qty: '1',
      unitPrice: '0',
      note: '',
    },
  ]);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data: catalogs } = useInventoryCatalogs();
  const suppliers = catalogs?.suppliers ?? [];
  const materials = catalogs?.materials ?? [];

  const filterParams = useMemo(
    () => ({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      supplierId: filterSupplierId ? Number(filterSupplierId) : undefined,
      materialId: filterMaterialId ? Number(filterMaterialId) : undefined,
      keyword: keyword.trim() || undefined,
    }),
    [fromDate, toDate, filterSupplierId, filterMaterialId, keyword],
  );

  const {
    data: receipts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = usePurchaseReceipts(filterParams);

  const createReceiptMutation = useCreatePurchaseReceiptMutation();

  // Memoize map tra cứu nguyên liệu theo ID
  const materialMap = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials],
  );

  // Memoize tính thành tiền từng dòng và tổng tiền trên Popup Tạo phiếu nhập
  const draftCalculations = useMemo(() => {
    let grandTotal = 0;
    const lineTotals = draftLines.map((line) => {
      const qtyNum = Number(line.qty);
      const priceNum = Number(line.unitPrice);
      if (Number.isNaN(qtyNum) || Number.isNaN(priceNum) || qtyNum <= 0 || priceNum < 0) {
        return 0;
      }
      const lineTotal = Math.round(qtyNum * priceNum * 100) / 100;
      grandTotal += lineTotal;
      return lineTotal;
    });

    return {
      lineTotals,
      grandTotal,
    };
  }, [draftLines]);

  // Tổng giá trị toàn bộ phiếu nhập hiển thị trên bảng
  const totalFilteredReceiptsAmount = useMemo(() => {
    return receipts.reduce(
      (sum, r) => sum + (Number(r.totalAmount) || 0),
      0,
    );
  }, [receipts]);

  const handleOpenCreateModal = useCallback(() => {
    setFeedback(null);
    setReceiptCode('');
    setReceiptDate(todayStr);
    setSelectedSupplierId(suppliers[0]?.id ?? 0);
    setGeneralNote('');
    setDraftLines([
      {
        rowKey: `line-${Date.now()}`,
        materialId: materials[0]?.id ?? 0,
        qty: '10',
        unitPrice: '50000',
        note: '',
      },
    ]);
    setIsCreateModalOpen(true);
  }, [materials, suppliers, todayStr]);

  const handleAddDraftLine = useCallback(() => {
    setDraftLines((prev) => [
      ...prev,
      {
        rowKey: `line-${Date.now()}-${prev.length + 1}`,
        materialId: materials[0]?.id ?? 0,
        qty: '1',
        unitPrice: '0',
        note: '',
      },
    ]);
  }, [materials]);

  const handleRemoveDraftLine = useCallback((rowKey: string) => {
    setDraftLines((prev) =>
      prev.length > 1 ? prev.filter((l) => l.rowKey !== rowKey) : prev,
    );
  }, []);

  const handleUpdateDraftLine = useCallback(
    (
      rowKey: string,
      field: keyof Omit<DraftReceiptLine, 'rowKey'>,
      value: string | number,
    ) => {
      setDraftLines((prev) =>
        prev.map((line) =>
          line.rowKey === rowKey ? { ...line, [field]: value } : line,
        ),
      );
    },
    [],
  );

  const handleSubmitCreateReceipt = useCallback(async () => {
    if (!selectedSupplierId) {
      setFeedback({
        type: 'error',
        message: 'Vui lòng chọn nhà cung cấp cho phiếu nhập.',
      });
      return;
    }

    for (const line of draftLines) {
      if (!line.materialId) {
        setFeedback({
          type: 'error',
          message: 'Vui lòng chọn nguyên liệu cho tất cả các dòng.',
        });
        return;
      }
      if (Number(line.qty) <= 0 || Number.isNaN(Number(line.qty))) {
        setFeedback({
          type: 'error',
          message: 'Số lượng nhập của từng dòng phải lớn hơn 0.',
        });
        return;
      }
      if (Number(line.unitPrice) < 0 || Number.isNaN(Number(line.unitPrice))) {
        setFeedback({
          type: 'error',
          message: 'Đơn giá nhập không hợp lệ.',
        });
        return;
      }
    }

    try {
      const created = await createReceiptMutation.mutateAsync({
        receiptCode: receiptCode.trim() || undefined,
        receiptDate,
        supplierId: selectedSupplierId,
        note: generalNote.trim() || undefined,
        items: draftLines.map((l) => ({
          materialId: Number(l.materialId),
          qty: String(l.qty),
          unitPrice: String(l.unitPrice),
          note: l.note.trim() || undefined,
        })),
      });

      setIsCreateModalOpen(false);
      setExpandedReceiptCode(created.receiptCode);
      setFeedback({
        type: 'success',
        message: `Đã lưu phiếu nhập ${created.receiptCode} (${created.lineCount} dòng nguyên liệu) và tự động cộng tồn kho (stock_movements: import) thành công!`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Không thể lưu phiếu nhập kho.',
      });
    }
  }, [
    createReceiptMutation,
    draftLines,
    generalNote,
    receiptCode,
    receiptDate,
    selectedSupplierId,
  ]);

  return (
    <div className="space-y-5">
      {/* Header & Nút mở Popup Tạo phiếu nhập */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Trang 11: Danh Sách Hàng Nhập &amp; Tạo Phiếu Nhập Kho
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Lưu chi tiết vào{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                purchase_items
              </code>{' '}
              và tự động ghi thẻ kho{' '}
              <code className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                stock_movements (import)
              </code>{' '}
              trong cùng 1 Database Transaction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => void refetch()}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              onClick={handleOpenCreateModal}
            >
              + Tạo phiếu nhập kho
            </Button>
          </div>
        </div>

        {/* Bộ lọc theo Ngày, Nhà cung cấp, Nguyên vật liệu, Từ khóa */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Nhà cung cấp
            </label>
            <select
              value={filterSupplierId}
              onChange={(e) => setFilterSupplierId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- Tất cả NCC --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Nguyên vật liệu
            </label>
            <select
              value={filterMaterialId}
              onChange={(e) => setFilterMaterialId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- Tất cả nguyên liệu --</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Tìm mã phiếu / ghi chú
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="VD: PN-2026..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span>
            Tổng số phiếu nhập: <strong>{receipts.length} phiếu</strong>
          </span>
          <span>
            Tổng giá trị nhập kho:{' '}
            <strong className="text-sm text-emerald-700">
              {formatCurrencyVnd(totalFilteredReceiptsAmount)}
            </strong>
          </span>
        </div>
      </div>

      {/* Banner thông báo */}
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

      {/* Bảng Danh sách phiếu nhập */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-12 w-full animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-rose-800">
              {error instanceof Error
                ? error.message
                : 'Không thể tải danh sách phiếu nhập kho.'}
            </p>
            <div className="mt-3">
              <Button variant="danger" size="sm" onClick={() => void refetch()}>
                Thử lại
              </Button>
            </div>
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-700">
              Chưa có phiếu nhập kho nào khớp với bộ lọc
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Nhấn nút &quot;+ Tạo phiếu nhập kho&quot; ở góc trên bên phải để nhập nguyên vật liệu mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Mã phiếu nhập</th>
                  <th className="px-4 py-3.5">Ngày nhập</th>
                  <th className="px-4 py-3.5">Nhà cung cấp</th>
                  <th className="px-4 py-3.5 text-center">Số mặt hàng</th>
                  <th className="px-4 py-3.5 text-right">Tổng tiền</th>
                  <th className="px-4 py-3.5">Người tạo</th>
                  <th className="px-4 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((receipt) => {
                  const isExpanded =
                    expandedReceiptCode === receipt.receiptCode;
                  return (
                    <React.Fragment key={receipt.receiptCode}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                          {receipt.receiptCode}
                        </td>
                        <td className="px-4 py-3.5">{receipt.receiptDate}</td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900">
                            {receipt.supplierName}
                          </span>{' '}
                          <span className="font-mono text-xs text-slate-500">
                            ({receipt.supplierCode})
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            {receipt.lineCount} dòng NL
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          {formatCurrencyVnd(receipt.totalAmount)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {receipt.createdByName}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setExpandedReceiptCode(
                                isExpanded ? null : receipt.receiptCode,
                              )
                            }
                          >
                            {isExpanded ? 'Thu gọn' : 'Xem dòng nhập'}
                          </Button>
                        </td>
                      </tr>

                      {/* Bảng con: Các dòng nguyên liệu của phiếu nhập */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-100 font-semibold text-slate-600">
                                  <tr>
                                    <th className="px-3 py-2">Mã NL</th>
                                    <th className="px-3 py-2">Tên nguyên liệu</th>
                                    <th className="px-3 py-2 text-right">
                                      Số lượng nhập
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                      Đơn giá
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                      Thành tiền
                                    </th>
                                    <th className="px-3 py-2">Ghi chú</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {receipt.lines.map((line) => (
                                    <tr key={line.id}>
                                      <td className="px-3 py-2 font-mono text-slate-600">
                                        {line.materialCode}
                                      </td>
                                      <td className="px-3 py-2 font-semibold text-slate-900">
                                        {line.materialName}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                                        +{formatQuantity(line.qty)} {line.unit}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        {formatCurrencyVnd(line.unitPrice)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-slate-900">
                                        {formatCurrencyVnd(line.lineTotal)}
                                      </td>
                                      <td className="px-3 py-2 text-slate-500">
                                        {line.note ?? '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POPUP TẠO PHIẾU NHẬP KHO */}
      <Modal
        isOpen={isCreateModalOpen}
        title="Tạo Phiếu Nhập Kho Nguyên Vật Liệu"
        subtitle="Tự động tính thành tiền từng dòng và cập nhật thẻ kho (stock_movements: import)"
        onClose={() => setIsCreateModalOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              isLoading={createReceiptMutation.isPending}
              onClick={() => void handleSubmitCreateReceipt()}
            >
              Lưu Phiếu Nhập &amp; Cộng Tồn Kho
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Nhà cung cấp <span className="text-rose-600">*</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              >
                <option value={0}>-- Chọn nhà cung cấp --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ngày nhập kho <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Mã phiếu nhập (Bỏ trống để tự sinh)
              </label>
              <input
                type="text"
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                placeholder="VD: PN-20261109-01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Ghi chú phiếu nhập
            </label>
            <input
              type="text"
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              placeholder="Ghi chú giao nhận, số hóa đơn NCC..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Danh sách các dòng nguyên liệu nhập */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Chi tiết các dòng nguyên liệu ({draftLines.length} dòng)
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddDraftLine}
              >
                + Thêm dòng nguyên liệu
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5">Nguyên vật liệu</th>
                    <th className="px-3 py-2.5 text-center">ĐVT</th>
                    <th className="px-3 py-2.5 text-right">Số lượng</th>
                    <th className="px-3 py-2.5 text-right">Đơn giá (VNĐ)</th>
                    <th className="px-3 py-2.5 text-right">Thành tiền (Tự tính)</th>
                    <th className="px-3 py-2.5">Ghi chú dòng</th>
                    <th className="px-3 py-2.5 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftLines.map((line, index) => {
                    const mat = materialMap.get(Number(line.materialId));
                    const lineTotal = draftCalculations.lineTotals[index] ?? 0;

                    return (
                      <tr key={line.rowKey}>
                        <td className="px-3 py-2">
                          <select
                            value={line.materialId}
                            onChange={(e) =>
                              handleUpdateDraftLine(
                                line.rowKey,
                                'materialId',
                                Number(e.target.value),
                              )
                            }
                            className="w-52 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-emerald-600 focus:outline-none"
                          >
                            <option value={0}>-- Chọn nguyên liệu --</option>
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.code})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-3 py-2 text-center font-medium text-slate-600">
                          {mat?.unit ?? '—'}
                        </td>

                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={line.qty}
                            onChange={(e) =>
                              handleUpdateDraftLine(
                                line.rowKey,
                                'qty',
                                e.target.value,
                              )
                            }
                            className="w-28 rounded border border-slate-300 px-2 py-1.5 text-right text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                          />
                        </td>

                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleUpdateDraftLine(
                                line.rowKey,
                                'unitPrice',
                                e.target.value,
                              )
                            }
                            className="w-32 rounded border border-slate-300 px-2 py-1.5 text-right text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                          />
                        </td>

                        <td className="px-3 py-2 text-right font-bold text-emerald-700">
                          {formatCurrencyVnd(lineTotal)}
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.note}
                            onChange={(e) =>
                              handleUpdateDraftLine(
                                line.rowKey,
                                'note',
                                e.target.value,
                              )
                            }
                            placeholder="Ghi chú..."
                            className="w-36 rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-emerald-600 focus:outline-none"
                          />
                        </td>

                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            disabled={draftLines.length <= 1}
                            onClick={() => handleRemoveDraftLine(line.rowKey)}
                            className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                            title="Xóa dòng"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end rounded-xl bg-emerald-50 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-700">
                Tổng cộng tiền phiếu nhập:
              </span>
              <span className="ml-3 text-lg font-extrabold text-emerald-800">
                {formatCurrencyVnd(draftCalculations.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

