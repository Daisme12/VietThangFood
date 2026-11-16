import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  SafetyCertificateOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  SafetyBufferConfig,
  getSafetyBufferConfig,
  saveSafetyBufferConfig,
  KitchenProductionItem,
} from '../../lib/kitchenProductionStore';

interface SafetyBufferModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: KitchenProductionItem[];
  onSaved?: () => void;
}

export const SafetyBufferModal: React.FC<SafetyBufferModalProps> = ({
  isOpen,
  onClose,
  items,
  onSaved,
}) => {
  const [, setConfig] = useState<SafetyBufferConfig>(getSafetyBufferConfig());
  const [tempDefaultPercent, setTempDefaultPercent] = useState<number>(10);
  const [tempOverrides, setTempOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      const current = getSafetyBufferConfig();
      setConfig(current);
      setTempDefaultPercent(current.defaultPercent);
      setTempOverrides({ ...(current.productOverrides || {}) });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const PRESET_PERCENTS = [0, 5, 10, 15, 20, 25];

  const handleApplyPreset = (pct: number) => {
    setTempDefaultPercent(pct);
  };

  const handleOverrideChange = (sku: string, valStr: string) => {
    const val = parseFloat(valStr);
    setTempOverrides((prev) => {
      if (isNaN(val) || valStr === '') {
        const copy = { ...prev };
        delete copy[sku];
        return copy;
      }
      return { ...prev, [sku]: Math.max(0, val) };
    });
  };

  const handleResetDefaults = () => {
    setTempDefaultPercent(10);
    setTempOverrides({});
  };

  const handleSave = () => {
    const newConfig: SafetyBufferConfig = {
      defaultPercent: Math.max(0, tempDefaultPercent),
      productOverrides: tempOverrides,
    };
    saveSafetyBufferConfig(newConfig);
    if (onSaved) onSaved();
    onClose();
  };

  // Tính thử tổng SL sản xuất trước và sau khi đổi định mức an toàn
  const previewSummary = items.reduce(
    (acc, it) => {
      const pct = tempOverrides[it.sku] !== undefined ? tempOverrides[it.sku] : tempDefaultPercent;
      const buf = Math.ceil((it.neededQty * pct) / 100);
      acc.totalNeeded += it.neededQty;
      acc.totalBuffer += buf;
      acc.totalPlan += it.neededQty + buf;
      return acc;
    },
    { totalNeeded: 0, totalBuffer: 0, totalPlan: 0 }
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
              <SafetyCertificateOutlined />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                CẤU HÌNH ĐỊNH MỨC AN TOÀN SẢN XUẤT BẾP
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tự động cộng thêm tỷ lệ dự phòng hao hụt/đơn phát sinh vào số lượng nấu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition"
          >
            <CloseOutlined />
          </button>
        </header>

        {/* Body Modal */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Khối 1: Tỷ lệ an toàn chung mặc định */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>Định mức an toàn chung (%)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500">
                Áp dụng mặc định cho tất cả món
              </span>
            </div>

            {/* Các nút chọn nhanh */}
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_PERCENTS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyPreset(pct)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    tempDefaultPercent === pct
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  +{pct}% {pct === 10 && '(Khuyên dùng)'} {pct === 0 && '(Không bù)'}
                </button>
              ))}
            </div>

            {/* Input nhập số tùy biến */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-medium text-slate-600">Hoặc nhập % tùy chỉnh:</span>
              <div className="relative w-32">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={tempDefaultPercent}
                  onChange={(e) => setTempDefaultPercent(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 pr-8 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Khối 2: Xem trước kết quả tính toán */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-center justify-around text-center text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">SL Đơn cần SX</span>
              <span className="text-sm font-bold text-slate-800">
                {previewSummary.totalNeeded.toLocaleString('vi-VN')} SP
              </span>
            </div>
            <div className="text-slate-400 font-bold text-base">+</div>
            <div>
              <span className="text-amber-700 block mb-0.5">Bù an toàn</span>
              <span className="text-sm font-bold text-amber-600">
                +{previewSummary.totalBuffer.toLocaleString('vi-VN')} SP
              </span>
            </div>
            <div className="text-slate-400 font-bold text-base">=</div>
            <div>
              <span className="text-rose-700 block mb-0.5 font-bold">TỔNG BẾP NẤU THỰC TẾ</span>
              <span className="text-base font-black text-rose-600">
                {previewSummary.totalPlan.toLocaleString('vi-VN')} SP
              </span>
            </div>
          </div>

          {/* Khối 3: Tùy biến % riêng theo từng sản phẩm */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Tùy biến % theo từng mặt hàng (Không bắt buộc)
              </span>
              <span className="text-[11px] text-slate-400">
                Để trống sẽ tự động nhận theo mức chung (+{tempDefaultPercent}%)
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3.5 py-2">MÃ SP</th>
                    <th className="px-3.5 py-2">TÊN MÓN</th>
                    <th className="px-3.5 py-2 text-right">ĐƠN CẦN SX</th>
                    <th className="px-3.5 py-2 text-center w-28">ĐỊNH MỨC (%)</th>
                    <th className="px-3.5 py-2 text-right">TỔNG NẤU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => {
                    const customPct = tempOverrides[it.sku];
                    const activePct = customPct !== undefined ? customPct : tempDefaultPercent;
                    const buf = Math.ceil((it.neededQty * activePct) / 100);
                    return (
                      <tr key={it.id || it.sku} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2 font-medium text-slate-500 whitespace-nowrap">
                          {it.sku}
                        </td>
                        <td className="px-3.5 py-2 font-bold text-slate-800">
                          {it.name}
                        </td>
                        <td className="px-3.5 py-2 text-right font-medium text-slate-700">
                          {it.neededQty} {it.unit}
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder={String(tempDefaultPercent)}
                            value={customPct !== undefined ? customPct : ''}
                            onChange={(e) => handleOverrideChange(it.sku, e.target.value)}
                            className="w-16 h-7 text-center rounded border border-slate-300 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3.5 py-2 text-right font-bold text-rose-600">
                          {it.neededQty + buf} {it.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ghi chú hướng dẫn */}
          <div className="flex items-start gap-2 text-slate-500 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
            <InfoCircleOutlined className="text-amber-500 text-sm mt-0.5 shrink-0" />
            <span>
              Công thức: <strong>Tổng cần nấu = SL Đơn cần SX + Làm tròn lên(SL Đơn cần SX × % Định mức an toàn)</strong>. 
              Các đơn hàng Đủ hàng (Xanh) khi duyệt sẽ <strong>không cộng vào bếp</strong> để tránh nấu thừa tồn kho.
            </span>
          </div>
        </div>

        {/* Footer Modal */}
        <footer className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <ReloadOutlined />
            <span>Khôi phục mặc định (10%)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckOutlined />
              <span>Lưu & Áp dụng ngay</span>
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
};
