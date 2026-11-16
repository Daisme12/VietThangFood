import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ShopOutlined,
  EnvironmentOutlined,
  UserOutlined,
  PhoneOutlined,
  CalendarOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import {
  getCompanyDeliveryInfo,
  CompanyDeliveryInfo,
} from '../../../lib/companySettings';
import { getCopiesForLocation } from '../../../lib/locationSettings';
import { convertNumberToVietnameseWords, getTodayDateStr } from '../../../lib/formatters';

export interface DeliverySlipItem {
  id: string;
  sku: string;
  name: string;
  category?: string;
  unit: string;
  quantity: number | string;
  returnedQty?: number | string;
  price: number | string;
  vatRate: number | string;
  note?: string;
}

export interface DeliverySlipData {
  orderCode: string;
  createdDate: string;
  customerName: string;
  address: string;
  salesPerson?: string;
  contactPerson?: string;
  shipperName?: string;
  note?: string;
  items: DeliverySlipItem[];
  subtotal?: number | string;
  vatAmount?: number | string;
  grandTotal?: number | string;
  copyLabel?: string;
  copyIndex?: number;
  totalCopies?: number;
}

export interface DeliverySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: DeliverySlipData | null;
  batchOrders?: DeliverySlipData[];
  autoPrint?: boolean;
  onOpenSettingsPage?: () => void;
}

export const DEFAULT_PREVIEW_SLIP: DeliverySlipData = {
  orderCode: 'PGH-09618',
  createdDate: getTodayDateStr(),
  customerName: 'UBF_THCS NHA TRANG - THÁI NGUYÊN',
  address: 'Tổ 18, Phường Phan Đình Phùng, Thành phố Thái Nguyên, Tỉnh Thái Nguyên',
  salesPerson: 'Chị Ly - 086.709.9978',
  contactPerson: 'Dung - 097.484.6310',
  shipperName: 'Ship_UBF_TN',
  note: '',
  items: [
    {
      id: 'p1',
      sku: 'TS_NUONG_330',
      name: 'Trà Sữa Nướng Hàn Châu 330ml',
      category: 'TRÀ SỮA 330ML',
      unit: 'Chai',
      quantity: 40,
      price: 22000,
      vatRate: 8,
    },
    {
      id: 'p2',
      sku: 'TS_HONG_330',
      name: 'Hồng Trà Sữa Hàn Châu 330ml',
      category: 'TRÀ SỮA 330ML',
      unit: 'Chai',
      quantity: 40,
      price: 20000,
      vatRate: 8,
    },
  ],
};

export const DeliverySlipSingleView: React.FC<{
  order: DeliverySlipData;
  companyInfo: CompanyDeliveryInfo;
}> = ({ order: activeOrder, companyInfo }) => {
  // Tính toán số liệu Giá, VAT, Thành tiền (tự động theo SL Giao - SL Trả thực tế)
  const subtotalPrice = useMemo(() => {
    return activeOrder.items.reduce((sum, item) => {
      const priceNum = Number(item.price) || 0;
      const qtyNum = Number(item.quantity) || 0;
      const returnedNum = Number(item.returnedQty) || 0;
      const effectiveQty = returnedNum > 0 ? Math.max(0, qtyNum - returnedNum) : qtyNum;
      return sum + priceNum * effectiveQty;
    }, 0);
  }, [activeOrder]);

  const totalVat = useMemo(() => {
    return activeOrder.items.reduce((sum, item) => {
      const priceNum = Number(item.price) || 0;
      const qtyNum = Number(item.quantity) || 0;
      const returnedNum = Number(item.returnedQty) || 0;
      const effectiveQty = returnedNum > 0 ? Math.max(0, qtyNum - returnedNum) : qtyNum;
      return (
        sum +
        Math.round(priceNum * effectiveQty * ((Number(item.vatRate) || 0) / 100))
      );
    }, 0);
  }, [activeOrder]);

  const grandTotal = useMemo(() => {
    return subtotalPrice + totalVat;
  }, [subtotalPrice, totalVat]);

  const amountInWords = useMemo(() => {
    return convertNumberToVietnameseWords(grandTotal);
  }, [grandTotal]);

  // Gom ghi chú nếu có ở từng item hoặc ở order level
  const slipNote = useMemo(() => {
    if (activeOrder.note && activeOrder.note.trim()) {
      return activeOrder.note.trim();
    }
    const itemNotes = activeOrder.items
      .map((it) => it.note?.trim())
      .filter((n): n is string => Boolean(n));
    if (itemNotes.length > 0) {
      return itemNotes.join('; ');
    }
    return '';
  }, [activeOrder]);

  return (
    <div className="space-y-4 print:space-y-3 text-slate-800 text-xs">
      {/* PHẦN 1: THÔNG TIN ĐƠN VỊ GIAO HÀNG (GÓC TRÊN TRÁI) */}
      <div className="space-y-1 text-slate-700 leading-relaxed max-w-xl">
        <div className="text-xs font-normal">
          <span className="text-slate-600">Đơn vị giao hàng: </span>
          <strong className="text-slate-900 font-bold uppercase tracking-wide">
            {companyInfo.companyName}
          </strong>
        </div>
        <div className="text-xs font-normal text-slate-600">
          <span>Địa chỉ: </span>
          <span className="text-slate-800">{companyInfo.address}</span>
        </div>
        <div className="text-xs font-normal text-slate-600">
          <span>MST: </span>
          <span className="text-slate-800 font-medium">{companyInfo.taxId}</span>
        </div>
        <div className="text-xs font-normal text-slate-600">
          <span>Đại diện: </span>
          <span className="text-slate-800 font-medium">{companyInfo.representative}</span>
        </div>
        <div className="text-xs font-normal text-slate-600">
          <span>Liên hệ: </span>
          <span className="text-slate-800 font-semibold">{companyInfo.phone}</span>
        </div>
      </div>

      {/* PHẦN 2: TIÊU ĐỀ PHIẾU GIAO HÀNG (KHI IN BỎ KHUNG VIỀN NỀN XÁM) */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center space-y-1 shadow-2xs print-no-box">
        <div className="flex items-center justify-center gap-2 text-slate-800">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
            {activeOrder.orderCode.startsWith('PXK') ? 'PHIẾU XUẤT KHO' : 'PHIẾU GIAO HÀNG'}
          </h2>
        </div>
        <div className={`text-base font-black tracking-wider flex items-center justify-center gap-2 flex-wrap ${activeOrder.orderCode.startsWith('PXK') ? 'text-emerald-700' : 'text-rose-600'}`}>
          <span>{activeOrder.orderCode}</span>
        </div>
        <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1.5">
          <CalendarOutlined className="text-xs" />
          <span>Ngày tạo phiếu: {activeOrder.createdDate}</span>
        </div>
      </div>

      {/* PHẦN 3: THÔNG TIN KHÁCH HÀNG & ĐỊA ĐIỂM GIAO HÀNG (KHI IN BỎ KHUNG VIỀN NỀN XÁM) */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2 shadow-2xs print-no-box">
        <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs uppercase tracking-wide">
          <ShopOutlined className="text-slate-900 text-sm" />
          <span>{activeOrder.customerName}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1 text-slate-700">
          <div className="flex items-start gap-1.5">
            <EnvironmentOutlined className="text-slate-600 mt-0.5 shrink-0" />
            <span>
              <strong>Địa chỉ : </strong> {activeOrder.address}
            </span>
          </div>

          {activeOrder.contactPerson ? (
            <div className="flex items-center gap-1.5">
              <PhoneOutlined className="text-slate-600 shrink-0" />
              <span>
                <strong>Liên hệ : </strong> {activeOrder.contactPerson}
              </span>
            </div>
          ) : activeOrder.salesPerson ? (
            <div className="flex items-center gap-1.5">
              <UserOutlined className="text-slate-600 shrink-0" />
              <span>
                <strong>Phụ trách bán hàng : </strong> {activeOrder.salesPerson}
              </span>
            </div>
          ) : null}

          {activeOrder.salesPerson && activeOrder.contactPerson && (
            <div className="flex items-center gap-1.5">
              <UserOutlined className="text-slate-600 shrink-0" />
              <span>
                <strong>Phụ trách bán hàng : </strong> {activeOrder.salesPerson}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PHẦN 4: BẢNG SẢN PHẨM CÓ ĐẦY ĐỦ GIÁ & THÀNH TIỀN (BỎ CỘT NHÓM, CĂN VỪA TRỌN KHỔ) */}
      <div className="rounded-xl border border-slate-200 overflow-hidden print-no-box">
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="w-[5%] px-1 py-2.5 text-center">STT</th>
              <th className="w-[13%] px-2 py-2.5">MÃ</th>
              <th className="w-[32%] px-2.5 py-2.5">TÊN</th>
              <th className="w-[6%] px-1 py-2.5 text-center">ĐVT</th>
              <th className="w-[7%] px-1 py-2.5 text-center">SL GIAO</th>
              <th className="w-[7%] px-1 py-2.5 text-center">SL TRẢ</th>
              <th className="w-[11%] px-2 py-2.5 text-right">GIÁ</th>
              <th className="w-[6%] px-1 py-2.5 text-center">VAT</th>
              <th className="w-[13%] px-2 py-2.5 text-right">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
            {activeOrder.items.length > 0 ? (
              activeOrder.items.map((item, idx) => {
                const priceNum = Number(item.price) || 0;
                const qtyNum = Number(item.quantity) || 0;
                const returnedNum = Number(item.returnedQty) || 0;
                const effectiveQty = returnedNum > 0 ? Math.max(0, qtyNum - returnedNum) : qtyNum;
                const lineTotal = priceNum * effectiveQty;
                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 transition">
                    <td className="px-1 py-2 text-center text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-2 font-bold text-slate-900 truncate" title={item.sku}>
                      {item.sku}
                    </td>
                    <td className="px-2.5 py-2 font-bold text-slate-900 break-words">
                      {item.name}
                    </td>
                    <td className="px-1 py-2 text-center text-slate-600">
                      {item.unit}
                    </td>
                    <td className="px-1 py-2 text-center font-bold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="px-1 py-2 text-center text-slate-700 font-bold">
                      {item.returnedQty || ''}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {priceNum.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1 py-2 text-center font-semibold text-slate-800">
                      {item.vatRate}%
                    </td>
                    <td className="px-2 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                      {lineTotal.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  Chưa có mặt hàng nào trong phiếu
                </td>
              </tr>
            )}

            {/* DÒNG 1: TỔNG GIÁ TRỊ TRƯỚC THUẾ */}
            <tr className="border-t border-slate-200 bg-slate-50/40">
              <td colSpan={6} className="px-3 py-2 text-right font-bold text-slate-800">
                Tổng giá trị trước thuế:
              </td>
              <td colSpan={3} className="px-3 py-2 text-right font-bold text-slate-900">
                {subtotalPrice.toLocaleString('vi-VN')} đ
              </td>
            </tr>

            {/* DÒNG 2: TỔNG VAT */}
            <tr className="bg-slate-50/40">
              <td colSpan={6} className="px-3 py-2 text-right font-bold text-slate-800">
                Tổng VAT:
              </td>
              <td colSpan={3} className="px-3 py-2 text-right font-bold text-slate-900">
                {totalVat.toLocaleString('vi-VN')} đ
              </td>
            </tr>

            {/* DÒNG 3: TỔNG GIÁ TRỊ ĐƠN HÀNG */}
            <tr className="bg-slate-100/60 border-t border-slate-200">
              <td colSpan={6} className="px-3 py-2.5 text-right font-black text-slate-900 text-xs sm:text-sm">
                Tổng giá trị đơn hàng:
              </td>
              <td colSpan={3} className="px-3 py-2.5 text-right font-black text-slate-900 text-xs sm:text-sm">
                {grandTotal.toLocaleString('vi-VN')} đ
              </td>
            </tr>

            {/* DÒNG 4: SỐ TIỀN BẰNG CHỮ */}
            <tr className="bg-slate-50/20">
              <td colSpan={9} className="px-4 py-2.5 text-right text-slate-700">
                <span className="font-semibold text-slate-800">Số tiền bằng chữ: </span>
                <span className="font-bold text-slate-900 italic">{amountInWords}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PHẦN 5: CHÂN PHIẾU - GHI CHÚ & NGÀY THÁNG SÁT LÊN TRÊN & CHỮ KÝ */}
      <div className="!mt-2 space-y-1.5">
        {/* HÀNG TRÊN: BÊN TRÁI LÀ GHI CHÚ, BÊN PHẢI LÀ NGÀY THÁNG SÁT LÊN TRÊN */}
        <div className="grid grid-cols-2 gap-8 items-baseline">
          <div className="text-xs text-slate-700">
            <span className="font-bold">Ghi chú: </span>
            <span>{slipNote || 'Giao trước 6h30 sáng'}</span>
          </div>

          <div className="text-center text-slate-600 text-[11px] italic">
            Hà Nội, ngày {activeOrder.createdDate ? activeOrder.createdDate.split('/')[0] : '12'} tháng {activeOrder.createdDate ? activeOrder.createdDate.split('/')[1] : '11'} năm {activeOrder.createdDate ? activeOrder.createdDate.split('/')[2] : '2026'}
          </div>
        </div>

        {/* HÀNG DƯỚI: KHỐI CHỮ KÝ 2 BÊN (THẲNG HÀNG NGANG TUYỆT ĐỐI) */}
        <div className="grid grid-cols-2 gap-8 pt-1">
          <div className="text-center space-y-1">
            <div className="font-bold text-slate-900 text-xs uppercase tracking-wide">
              BÊN MUA HÀNG
            </div>
            <div className="text-[11px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
            <div className="h-16" />
          </div>

          <div className="text-center space-y-1">
            <div className="font-bold uppercase tracking-wide text-slate-900 text-xs">
              NHÂN VIÊN GIAO HÀNG
            </div>
            <div className="text-[11px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
            <div className="h-12" />
            <div className="font-bold text-slate-900 text-xs">
              {activeOrder.shipperName || 'A Lương'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DeliverySlipModal: React.FC<DeliverySlipModalProps> = ({
  isOpen,
  onClose,
  order,
  batchOrders,
  autoPrint = false,
}) => {
  // Thông tin đơn vị giao hàng lấy từ Cài đặt hệ thống (mặc định cấu hình ở trang Cài đặt)
  const [companyInfo, setCompanyInfo] = useState<CompanyDeliveryInfo>(getCompanyDeliveryInfo);

  // Xác định số bản in mặc định theo địa điểm của phiếu (hoặc mặc định 2 bản)
  const defaultCopies = useMemo(() => {
    const sampleLoc = order?.customerName || order?.address || batchOrders?.[0]?.customerName;
    return getCopiesForLocation(sampleLoc);
  }, [order, batchOrders]);

  const [customCopies, setCustomCopies] = useState<number | null>(null);
  const activeCopies = customCopies !== null ? customCopies : defaultCopies;

  // Reset custom copies khi mở phiếu mới
  useEffect(() => {
    setCustomCopies(null);
  }, [isOpen, order, batchOrders]);

  const ordersToRender = useMemo(() => {
    const baseList = batchOrders && batchOrders.length > 0 ? batchOrders : [order || DEFAULT_PREVIEW_SLIP];
    const expanded: DeliverySlipData[] = [];

    baseList.forEach((ord) => {
      // Số bản in theo địa điểm của từng đơn (hoặc activeCopies nếu người dùng chọn thủ công)
      const copiesForThisOrder = customCopies !== null ? customCopies : getCopiesForLocation(ord.customerName || ord.address);
      const safeCopies = Math.max(1, copiesForThisOrder);

      for (let i = 1; i <= safeCopies; i++) {
        expanded.push({
          ...ord,
          copyIndex: i,
          totalCopies: safeCopies,
        });
      }
    });

    return expanded;
  }, [batchOrders, order, customCopies]);

  // Tự động mở hộp thoại in ngay khi mở phiếu với autoPrint = true
  useEffect(() => {
    if (isOpen && autoPrint && ordersToRender.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, ordersToRender]);

  // Lắng nghe sự kiện cập nhật cấu hình công ty từ Setting
  useEffect(() => {
    const handleUpdate = () => {
      setCompanyInfo(getCompanyDeliveryInfo());
    };
    window.addEventListener('company_info_updated', handleUpdate);
    return () => window.removeEventListener('company_info_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCompanyInfo(getCompanyDeliveryInfo());
    }
  }, [isOpen]);

  // Hỗ trợ phím ESC để đóng modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="delivery-slip-modal-root fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          /* Ẩn hoàn toàn cây DOM bên ngoài modal in */
          body > *:not(.delivery-slip-modal-root) {
            display: none !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .delivery-slip-modal-root {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            inset: auto !important;
            z-index: auto !important;
          }
          #delivery-slip-printable-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            max-height: none !important;
            overflow: visible !important;
          }
          /* MỖI PHIẾU GIAO HÀNG ĐƯỢC IN TRÊN 1 TRANG A4 RIÊNG BIỆT */
          .single-slip-page {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          .single-slip-page:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }
          /* BẢNG IN: ĐƯỜNG KẺ MÀU ĐEN SẮC NÉT CHUẨN KẾ TOÁN/HOÁ ĐƠN */
          #delivery-slip-printable-area table {
            border-collapse: collapse !important;
            border: 1px solid #000 !important;
            width: 100% !important;
          }
          #delivery-slip-printable-area th,
          #delivery-slip-printable-area td {
            border: 1px solid #000 !important;
          }
          #delivery-slip-printable-area thead th {
            background-color: #f1f5f9 !important;
            color: #000 !important;
            font-weight: 700 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* BỎ MẤY CÁI KHUNG VIỀN KHI IN */
          .print-no-box {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
        }
      `}</style>
      <div
        id="delivery-slip-printable-area"
        className="relative w-full max-w-[96vw] max-h-[96vh] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-y-auto p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full space-y-8 print:space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* NÚT THAO TÁC Ở GÓC TRÊN BÊN PHẢI (IN PHIẾU + ĐÓNG) */}
        <div className="absolute top-4 right-4 sm:top-5 sm:right-6 flex items-center gap-2.5 print:hidden z-20">
          {/* Tùy chỉnh số bản in */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200">
            <span>Bản in/phiếu:</span>
            <select
              value={activeCopies}
              onChange={(e) => setCustomCopies(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none"
            >
              <option value={1}>1 bản</option>
              <option value={2}>2 bản (Mặc định)</option>
              <option value={3}>3 bản</option>
              <option value={4}>4 bản</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="In phiếu ngay (Ctrl + P)"
          >
            <PrinterOutlined className="text-sm" />
            <span>In {ordersToRender.length > 1 ? `(${ordersToRender.length} bản)` : 'phiếu'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 text-2xl font-light hover:scale-110 transition cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
            title="Đóng (ESC)"
          >
            ✕
          </button>
        </div>

        {/* NỘI DUNG TỪNG PHIẾU GIAO HÀNG (HỖ TRỢ IN GỘP NHIỀU ĐƠN CÙNG LÚC) */}
        {ordersToRender.map((ord, idx) => (
          <div
            key={ord.orderCode || idx}
            className="single-slip-page pb-8 mb-8 border-b-2 border-dashed border-slate-300 print:border-none print:pb-0 print:mb-0 print:m-0"
          >
            <DeliverySlipSingleView order={ord} companyInfo={companyInfo} />
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
};
