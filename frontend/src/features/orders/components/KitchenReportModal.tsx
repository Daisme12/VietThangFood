import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FireOutlined,
  PrinterOutlined,
  CloseOutlined,
} from '@ant-design/icons';

export interface KitchenItemSummary {
  sku: string;
  name: string;
  category?: string;
  unit: string;
  totalQty: number;
  orderCount: number;
}

export interface KitchenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: KitchenItemSummary[];
  title?: string;
  subtitle?: string;
  reportDate?: string;
  deliveryDate?: string;
  totalOrdersCount?: number;
}

export const KitchenReportModal: React.FC<KitchenReportModalProps> = ({
  isOpen,
  onClose,
  items,
  title = 'TỔNG HỢP SỐ LƯỢNG THỰC TẾ ĐI GIAO (TỔNG ĐƠN HÀNG)',
  subtitle = 'Tổng số lượng hàng hóa thực tế cần chuẩn bị đi giao từ các phiếu giao hàng đã duyệt (đã trừ hàng trả)',
  totalOrdersCount,
}) => {
  // Đóng khi nhấn phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Chia danh sách thành 2 nửa cho bảng 2 cột
  const { leftItems, rightItems } = useMemo(() => {
    const mid = Math.ceil(items.length / 2);
    return {
      leftItems: items.slice(0, mid),
      rightItems: items.slice(mid),
    };
  }, [items]);

  // Tổng số lượng
  const grandTotalQty = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.totalQty || 0), 0);
  }, [items]);

  const effectiveOrdersCount = useMemo(() => {
    if (totalOrdersCount !== undefined) return totalOrdersCount;
    return Math.max(...items.map((i) => i.orderCount), 0);
  }, [totalOrdersCount, items]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="kitchen-modal-root fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 lg:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* CSS CHO BẢN IN A4 NGANG (CHỈ IN DUY NHẤT 1 TRANG, CHỮ TO RÕ) */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 10mm;
          }
          /* Ẩn triệt để toàn bộ các element bên ngoài modal */
          body > *:not(.kitchen-modal-root) {
            display: none !important;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
          .kitchen-modal-root {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            inset: auto !important;
            z-index: auto !important;
          }
          .print-hidden {
            display: none !important;
          }
          #kitchen-printable-area {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-table {
            border-collapse: collapse !important;
            width: 100% !important;
            border: 2px solid #0f172a !important;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #94a3b8 !important;
            padding: 6px 10px !important;
            color: #000 !important;
          }
          .print-table thead th {
            background-color: #0f172a !important;
            color: #fff !important;
            font-size: 11pt !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* KHUNG POPUP CÓ KHOẢNG HỞ XUNG QUANH (BO GÓC & ĐỔ BÓNG NỔI BẬT) */}
      <div
        className="relative w-full max-w-[95vw] xl:max-w-[1400px] h-[92vh] max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col print-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL CHIẾM FULL CHIỀU NGANG */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
          {/* Bên trái: Icon & Tiêu đề */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg shrink-0">
              <FireOutlined />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                  {title}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold">
                  Tổng đơn hàng
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium line-clamp-1">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Bên phải: TỔNG ĐƠN HÀNG CẠNH ĐẤY LÀ NÚT IN Ở ĐẦU */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Thông tin Tổng đơn hàng */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Tổng đơn hàng:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                {effectiveOrdersCount} đơn
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-bold text-slate-700">
                {items.length} món
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-black text-rose-600 text-sm">
                {grandTotalQty.toLocaleString('vi-VN')} SP
              </span>
            </div>

            {/* Nút In đơn bếp ở đầu */}
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <PrinterOutlined className="text-sm" />
              <span>In tổng đơn hàng</span>
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-400 text-sm font-bold transition flex items-center justify-center cursor-pointer shadow-2xs"
              title="Đóng (ESC)"
            >
              <CloseOutlined />
            </button>
          </div>
        </header>

        {/* NỘI DUNG BẢNG 2 CỘT CHIẾM FULL BÊN TRONG POPUP */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/50">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-medium">
              Không có mặt hàng nào cần chế biến / xuất đơn
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-start">
              {/* BẢNG CỘT TRÁI */}
              <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="px-4 py-3 w-32 text-left">MÃ SP</th>
                      <th className="px-4 py-3 text-left">TÊN</th>
                      <th className="px-4 py-3 w-28 text-right">SỐ LƯỢNG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leftItems.map((item, idx) => (
                      <tr
                        key={item.sku || idx}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-500 text-xs whitespace-nowrap">
                          {item.sku}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 uppercase text-xs">
                          {item.name}
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900 text-sm">
                          {item.totalQty.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* BẢNG CỘT PHẢI */}
              <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="px-4 py-3 w-32 text-left">MÃ SP</th>
                      <th className="px-4 py-3 text-left">TÊN</th>
                      <th className="px-4 py-3 w-28 text-right">SỐ LƯỢNG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rightItems.length > 0 ? (
                      rightItems.map((item, idx) => (
                        <tr
                          key={item.sku || idx}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium text-slate-500 text-xs whitespace-nowrap">
                            {item.sku}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900 uppercase text-xs">
                            {item.name}
                          </td>
                          <td className="px-4 py-2.5 text-right font-black text-slate-900 text-sm">
                            {item.totalQty.toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-slate-400 italic"
                        >
                          Hết danh sách
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KHUNG IN A4 RIÊNG BIỆT (CHỈ HIỂN THỊ KHI BẤM IN - KHỔ NGANG LANDSCAPE CHỮ TO RÕ) */}
      <div id="kitchen-printable-area" className="hidden">
        {/* TIÊU ĐỀ BÁO CÁO TO RÕ RÀNG */}
        <div className="text-center mb-3">
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">
            {title}
          </h1>
        </div>

        {/* BẢNG IN 2 CỘT ĐÔI NGANG RỘNG RÃI */}
        <div className="grid grid-cols-2 gap-6 items-start">
          {/* CỘT TRÁI */}
          <table className="print-table text-xs">
            <thead>
              <tr>
                <th style={{ width: '110px', textAlign: 'left' }}>MÃ SP</th>
                <th style={{ textAlign: 'left' }}>TÊN</th>
                <th style={{ width: '90px', textAlign: 'right' }}>SỐ LƯỢNG</th>
              </tr>
            </thead>
            <tbody>
              {leftItems.map((item, idx) => (
                <tr key={item.sku || idx} className="page-break-avoid">
                  <td style={{ fontWeight: '600', fontSize: '11pt' }}>{item.sku}</td>
                  <td style={{ fontWeight: '800', fontSize: '12pt', textTransform: 'uppercase' }}>{item.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: '900', fontSize: '14pt' }}>
                    {item.totalQty.toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* CỘT PHẢI */}
          <table className="print-table text-xs">
            <thead>
              <tr>
                <th style={{ width: '110px', textAlign: 'left' }}>MÃ SP</th>
                <th style={{ textAlign: 'left' }}>TÊN</th>
                <th style={{ width: '90px', textAlign: 'right' }}>SỐ LƯỢNG</th>
              </tr>
            </thead>
            <tbody>
              {rightItems.map((item, idx) => (
                <tr key={item.sku || idx} className="page-break-avoid">
                  <td style={{ fontWeight: '600', fontSize: '11pt' }}>{item.sku}</td>
                  <td style={{ fontWeight: '800', fontSize: '12pt', textTransform: 'uppercase' }}>{item.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: '900', fontSize: '14pt' }}>
                    {item.totalQty.toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
};
