import React, { useState } from 'react';
import { formatQuantity } from '../../../lib/formatters';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';

export interface BomIngredientLine {
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  qtyPerProductUnit: number;
  currentStock: number;
}

export interface ProductionProductItem {
  productId: number;
  sku: string;
  productName: string;
  unit: string;
  todayOrderQty: number;
  safetyStockQty: number;
  openingStockQty: number;
  bom: BomIngredientLine[];
}

const INITIAL_PRODUCTION_DATA: ProductionProductItem[] = [
  {
    productId: 10,
    sku: 'TP-TC-HOANGKIM-1KG',
    productName: 'Trân Châu Hoàng Kim (Túi 1kg)',
    unit: 'tui',
    todayOrderQty: 140,
    safetyStockQty: 30,
    openingStockQty: 45,
    bom: [
      {
        materialId: 1,
        materialCode: 'NL-BOT-NANG',
        materialName: 'Tinh Bột Năng Thái Lan Cao Cấp',
        unit: 'kg',
        qtyPerProductUnit: 0.65,
        currentStock: 180,
      },
      {
        materialId: 2,
        materialCode: 'NL-DUONG-DEN',
        materialName: 'Đường Đen Hàn Quốc Nguyên Chất',
        unit: 'kg',
        qtyPerProductUnit: 0.25,
        currentStock: 28,
      },
    ],
  },
  {
    productId: 11,
    sku: 'TP-SYRUP-DUONGDEN-2L',
    productName: 'Sốt Đường Đen Hàn Quốc (Can 2L)',
    unit: 'can',
    todayOrderQty: 85,
    safetyStockQty: 20,
    openingStockQty: 25,
    bom: [
      {
        materialId: 2,
        materialCode: 'NL-DUONG-DEN',
        materialName: 'Đường Đen Hàn Quốc Nguyên Chất',
        unit: 'kg',
        qtyPerProductUnit: 1.2,
        currentStock: 28,
      },
      {
        materialId: 4,
        materialCode: 'NL-HUONG-CARAMEL',
        materialName: 'Tinh Chất Caramel Tự Nhiên',
        unit: 'lit',
        qtyPerProductUnit: 0.08,
        currentStock: 18,
      },
    ],
  },
  {
    productId: 12,
    sku: 'TP-COT-TRASUA-OOLONG-5L',
    productName: 'Cốt Trà Sữa Oolong Rang Đậm (Can 5L)',
    unit: 'can',
    todayOrderQty: 60,
    safetyStockQty: 15,
    openingStockQty: 20,
    bom: [
      {
        materialId: 3,
        materialCode: 'NL-TRA-OOLONG',
        materialName: 'Lá Trà Oolong Bảo Lộc Thượng Hạng',
        unit: 'kg',
        qtyPerProductUnit: 0.35,
        currentStock: 42,
      },
    ],
  },
];

// ============================================================================
// TRANG 7: TỔNG SẢN XUẤT (Công thức Quy tắc 3.3 + In phiếu bếp + Xuất Excel)
// ============================================================================
export const ProductionPlanPage: React.FC = () => {
  const [items] = useState<ProductionProductItem[]>(INITIAL_PRODUCTION_DATA);

  const exportCsv = () => {
    const rows = [
      ['SKU', 'Thanh pham', 'Don hom nay', 'Dinh muc an toan', 'Ton dau ngay', 'Can san xuat'],
      ...items.map((p) => {
        const needed = Math.max(
          0,
          p.todayOrderQty + p.safetyStockQty - p.openingStockQty,
        );
        return [
          p.sku,
          p.productName,
          String(p.todayOrderQty),
          String(p.safetyStockQty),
          String(p.openingStockQty),
          String(needed),
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ke-hoach-tong-san-xuat-bep.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            TRANG 7 • KẾ HOẠCH TỔNG SẢN XUẤT CỦA BẾP (QUY TẮC 3.3)
          </span>
          <h2 className="mt-1 text-lg font-extrabold text-slate-900">
            Bảng Tính Khối Lượng Cần Làm Cho Bếp &amp; Nguyên Liệu Cần Chuẩn Bị
          </h2>
          <p className="text-xs text-slate-500">
            Công thức chuẩn:{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-emerald-800">
              Cần sản xuất = max(0, Tổng đơn hôm nay + Định mức an toàn - Tồn thành phẩm đầu ngày)
            </code>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => window.print()}>
            🖨️ In Phiếu Bếp
          </Button>
          <Button variant="primary" onClick={exportCsv}>
            📥 Xuất File Excel (CSV)
          </Button>
        </div>
      </div>

      {/* Bảng 1: Khối lượng thành phẩm cần sản xuất */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-extrabold text-slate-900">
            1. Khối Lượng Thành Phẩm Bếp Cần Nấu Hôm Nay
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3.5">Mã SKU</th>
                <th className="px-4 py-3.5">Thành phẩm</th>
                <th className="px-4 py-3.5 text-right">Tổng đơn hôm nay</th>
                <th className="px-4 py-3.5 text-right">+ Định mức an toàn</th>
                <th className="px-4 py-3.5 text-right">- Tồn đầu ngày</th>
                <th className="px-4 py-3.5 text-right text-emerald-700">
                  = CẦN SẢN XUẤT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const needToProduce = Math.max(
                  0,
                  item.todayOrderQty + item.safetyStockQty - item.openingStockQty,
                );
                return (
                  <tr key={item.productId} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {item.productName}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold">
                      {formatQuantity(item.todayOrderQty)} {item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right text-teal-700 font-semibold">
                      +{formatQuantity(item.safetyStockQty)} {item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-600">
                      -{formatQuantity(item.openingStockQty)} {item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-900">
                        {formatQuantity(needToProduce)} {item.unit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TRANG 8: GHI NHẬN SẢN XUẤT (Cộng thành phẩm, trừ nguyên liệu BOM, cảnh báo nếu âm kho)
// ============================================================================
export const ProductionRecordPage: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = useState<number>(10);
  const [actualProducedQty, setActualProducedQty] = useState<number>(125);
  const [recordedLogs, setRecordedLogs] = useState<
    Array<{
      id: number;
      productName: string;
      qty: number;
      unit: string;
      negativeWarnings: string[];
      timestamp: string;
    }>
  >([]);

  const currentProduct =
    INITIAL_PRODUCTION_DATA.find((p) => p.productId === selectedProductId) ??
    INITIAL_PRODUCTION_DATA[0];

  const bomPreview = currentProduct.bom.map((b) => {
    const consumed = Number((b.qtyPerProductUnit * actualProducedQty).toFixed(3));
    const remaining = Number((b.currentStock - consumed).toFixed(3));
    return {
      ...b,
      consumed,
      remaining,
      isNegative: remaining < 0,
    };
  });

  const handleConfirmRecord = () => {
    const warnings = bomPreview
      .filter((b) => b.isNegative)
      .map(
        (b) =>
          `${b.materialName} bị âm ${formatQuantity(Math.abs(b.remaining))} ${b.unit}`,
      );
    setRecordedLogs((prev) => [
      {
        id: Date.now(),
        productName: currentProduct.productName,
        qty: actualProducedQty,
        unit: currentProduct.unit,
        negativeWarnings: warnings,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          TRANG 8 • GHI NHẬN SẢN XUẤT THỰC TẾ (QUY TẮC 3.3)
        </span>
        <h2 className="mt-1 text-lg font-extrabold text-slate-900">
          Xác Nhận Số Lượng Thực Làm • Tự Động Cộng Thành Phẩm &amp; Trừ Nguyên Liệu BOM
        </h2>
        <p className="text-xs text-slate-500">
          Khi Bếp bấm xác nhận: hệ thống cộng tồn thành phẩm (<code className="font-mono">production_in</code>), trừ nguyên liệu theo BOM (<code className="font-mono">production_out</code>) và <strong>cảnh báo ngay lập tức nếu kho nguyên liệu bị âm</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-5">
          <h3 className="text-sm font-extrabold text-slate-900">
            Nhập Kết Quả Mẻ Nấu Của Bếp
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-bold text-slate-700">
                Chọn thành phẩm vừa nấu xong
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {INITIAL_PRODUCTION_DATA.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">
                Số lượng thực tế đã làm ({currentProduct.unit})
              </label>
              <input
                type="number"
                min={1}
                value={actualProducedQty}
                onChange={(e) => setActualProducedQty(Number(e.target.value))}
                className="w-full rounded-xl border border-emerald-400 bg-emerald-50/40 px-3 py-2 font-bold text-slate-900"
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleConfirmRecord}
            >
              ✓ Xác Nhận Ghi Nhận Sản Xuất (ACID Transaction)
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7">
          <h3 className="text-sm font-extrabold text-slate-900">
            Dự Tính Khấu Trừ Nguyên Vật Liệu Theo Định Mức BOM
          </h3>
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-3 py-2.5">Nguyên liệu</th>
                <th className="px-3 py-2.5 text-right">Định mức / 1 ĐV</th>
                <th className="px-3 py-2.5 text-right">Sẽ trừ</th>
                <th className="px-3 py-2.5 text-right">Tồn sau trừ</th>
                <th className="px-3 py-2.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bomPreview.map((b) => (
                <tr key={b.materialId}>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">
                    {b.materialName}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {b.qtyPerProductUnit} {b.unit}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-rose-600">
                    -{formatQuantity(b.consumed)} {b.unit}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-bold ${
                      b.isNegative ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatQuantity(b.remaining)} {b.unit}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {b.isNegative ? (
                      <StatusBadge color="red" label="CẢNH BÁO ÂM KHO!" pulse />
                    ) : (
                      <StatusBadge color="green" label="Đủ nguyên liệu" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {recordedLogs.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-slate-600">
                Nhật ký ghi nhận sản xuất vừa thực hiện:
              </p>
              {recordedLogs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-xl border p-3 text-xs ${
                    log.negativeWarnings.length > 0
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  <div>
                    <strong>[{log.timestamp}]</strong> Đã cộng{' '}
                    <strong>
                      +{log.qty} {log.unit}
                    </strong>{' '}
                    {log.productName} vào kho thành phẩm.
                  </div>
                  {log.negativeWarnings.length > 0 && (
                    <div className="mt-1 font-bold text-rose-700">
                      ⚠️ Cảnh báo kho nguyên liệu bị âm: {log.negativeWarnings.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TRANG 9: ĐỊNH MỨC NGUYÊN LIỆU (BOM) & TÍNH SỐ SẢN PHẨM TỐI ĐA LÀM ĐƯỢC
// ============================================================================
export const BomRecipePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          TRANG 9 • ĐỊNH MỨC NGUYÊN LIỆU (BOM - BILL OF MATERIALS)
        </span>
        <h2 className="mt-1 text-lg font-extrabold text-slate-900">
          Khai Báo Công Thức Thành Phẩm &amp; Tính Toán Năng Lực Sản Xuất Tối Đa Theo Tồn Hiện Tại
        </h2>
        <p className="text-xs text-slate-500">
          Hỗ trợ định lượng số thập phân chính xác (<code className="font-mono">DECIMAL(15,4)</code>) cho từng nguyên vật liệu cấu thành 1 đơn vị thành phẩm.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {INITIAL_PRODUCTION_DATA.map((prod) => {
          const maxPossibleByIngredients = prod.bom.map((b) =>
            Math.floor(b.currentStock / b.qtyPerProductUnit),
          );
          const maxProducable = Math.min(...maxPossibleByIngredients);

          return (
            <div
              key={prod.productId}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {prod.sku}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {prod.productName} (Đơn vị: {prod.unit})
                  </h3>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs">
                  Số SP tối đa làm được theo tồn NL hiện tại:{' '}
                  <strong className="text-sm font-black text-emerald-700">
                    {formatQuantity(maxProducable)} {prod.unit}
                  </strong>
                </div>
              </div>

              <table className="mt-3 min-w-full text-left text-xs">
                <thead className="text-slate-500 uppercase">
                  <tr>
                    <th className="py-2">Mã NL</th>
                    <th className="py-2">Tên nguyên liệu</th>
                    <th className="py-2 text-right">Định mức / 1 {prod.unit}</th>
                    <th className="py-2 text-right">Tồn kho hiện tại</th>
                    <th className="py-2 text-right">Giới hạn tối đa làm được</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prod.bom.map((b) => (
                    <tr key={b.materialId}>
                      <td className="py-2 font-mono text-slate-600">
                        {b.materialCode}
                      </td>
                      <td className="py-2 font-semibold text-slate-900">
                        {b.materialName}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-emerald-700">
                        {b.qtyPerProductUnit} {b.unit}
                      </td>
                      <td className="py-2 text-right">
                        {formatQuantity(b.currentStock)} {b.unit}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-800">
                        {formatQuantity(
                          Math.floor(b.currentStock / b.qtyPerProductUnit),
                        )}{' '}
                        {prod.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// TRANG 10: ĐỊNH MỨC AN TOÀN (Cài đặt lượng tồn đệm an toàn cho từng thành phẩm)
// ============================================================================
export const SafetyStockPage: React.FC = () => {
  const [products, setProducts] = useState<ProductionProductItem[]>(
    INITIAL_PRODUCTION_DATA,
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSafetyChange = (productId: number, val: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, safetyStockQty: Math.max(0, val) } : p,
      ),
    );
    setSavedNotice(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            TRANG 10 • ĐỊNH MỨC AN TOÀN THÀNH PHẨM (SAFETY STOCK)
          </span>
          <h2 className="mt-1 text-lg font-extrabold text-slate-900">
            Cấu Hình Lượng Tồn Đệm An Toàn Cho Từng Thành Phẩm
          </h2>
          <p className="text-xs text-slate-500">
            Tham số <code className="font-mono">safety_stock</code> được cộng trực tiếp vào công thức Tổng sản xuất của Bếp (Trang 7).
          </p>
        </div>
        <Button variant="primary" onClick={() => setSavedNotice(true)}>
          💾 Lưu Định Mức An Toàn
        </Button>
      </div>

      {savedNotice && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900">
          ✅ Đã cập nhật Định mức an toàn (safety_stock) cho toàn bộ thành phẩm!
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3.5">Mã SKU</th>
              <th className="px-4 py-3.5">Tên thành phẩm</th>
              <th className="px-4 py-3.5 text-right">Tồn đầu ngày</th>
              <th className="px-4 py-3.5 text-right">Định mức an toàn (Cài đặt)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.productId}>
                <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                  {p.sku}
                </td>
                <td className="px-4 py-3.5 font-bold text-slate-900">
                  {p.productName}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {formatQuantity(p.openingStockQty)} {p.unit}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <input
                    type="number"
                    min={0}
                    value={p.safetyStockQty}
                    onChange={(e) =>
                      handleSafetyChange(p.productId, Number(e.target.value))
                    }
                    className="w-28 rounded-xl border border-emerald-400 bg-emerald-50/40 px-3 py-1.5 text-right font-bold text-slate-900"
                  />{' '}
                  <span className="text-slate-500">{p.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

