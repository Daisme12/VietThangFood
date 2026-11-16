import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FireOutlined,
  PrinterOutlined,
  SlidersOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  getSystemToday,
  getTodayDateStr,
  getTomorrowDateStr,
  formatDisplayDate,
} from '../../lib/formatters';
import {
  DateRangePicker,
  DateRangePickerValue,
} from '../../components/ui/DateRangePicker';
import {
  KitchenProductionItem,
  getKitchenProductionList,
  getSafetyBufferConfig,
  KITCHEN_PRODUCTION_EVENT,
} from '../../lib/kitchenProductionStore';
import { SafetyBufferModal } from './SafetyBufferModal';

export const KitchenProductionPage: React.FC = () => {
  const navigate = useNavigate();

  // Ngày lọc
  const [selectedDayTab, setSelectedDayTab] = useState<'today' | 'tomorrow' | null>('today');
  const [dateRange, setDateRange] = useState<DateRangePickerValue>(() => {
    const today = getSystemToday();
    return {
      from: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
      to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
    };
  });

  // Tìm kiếm và bộ lọc
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'split'>('table');

  // Modal Sửa định mức an toàn
  const [isBufferModalOpen, setIsBufferModalOpen] = useState<boolean>(false);

  // State danh sách sản xuất bếp
  const [items, setItems] = useState<KitchenProductionItem[]>(() => getKitchenProductionList());
  const [bufferConfig, setBufferConfig] = useState(() => getSafetyBufferConfig());

  // Lắng nghe sự kiện cập nhật dữ liệu bếp từ localStorage hoặc khi duyệt đơn
  useEffect(() => {
    const reload = () => {
      setItems(getKitchenProductionList());
      setBufferConfig(getSafetyBufferConfig());
    };
    window.addEventListener(KITCHEN_PRODUCTION_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(KITCHEN_PRODUCTION_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  // Xử lý chuyển tab Hôm nay / Ngày mai
  const handleToggleDay = (tab: 'today' | 'tomorrow') => {
    setSelectedDayTab(tab);
    const target = getSystemToday();
    if (tab === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    }
    setDateRange({
      from: new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0),
      to: new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59),
    });
  };

  // Ngày hiển thị định dạng DD/MM/YYYY
  const activeDateStr = useMemo(() => {
    if (selectedDayTab === 'today') return getTodayDateStr();
    if (selectedDayTab === 'tomorrow') return getTomorrowDateStr();
    if (dateRange.from) return formatDisplayDate(dateRange.from);
    return getTodayDateStr();
  }, [selectedDayTab, dateRange.from]);

  // Lọc danh sách theo ngày, từ khóa, danh mục, trạng thái
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // 1. Lọc theo ngày
      if (it.dateStr && it.dateStr !== activeDateStr) {
        return false;
      }

      // 2. Lọc theo danh mục
      if (filterCategory !== 'all' && it.category !== filterCategory) {
        return false;
      }

      // 3. Lọc từ khóa
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchSku = it.sku.toLowerCase().includes(kw);
        const matchName = it.name.toLowerCase().includes(kw);
        const matchCategory = (it.category || '').toLowerCase().includes(kw);
        const matchOrder = it.sourceOrders.some((so) => so.orderCode.toLowerCase().includes(kw));
        if (!matchSku && !matchName && !matchCategory && !matchOrder) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeDateStr, filterCategory, searchKeyword]);

  // Danh sách các nhóm danh mục có sẵn
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [items]);

  // Tổng hợp số lượng
  const summary = useMemo(() => {
    return filteredItems.reduce(
      (acc, it) => {
        acc.totalItems += 1;
        acc.totalNeeded += it.neededQty || 0;
        acc.totalBuffer += it.safetyBufferQty || 0;
        acc.totalPlan += it.totalPlanQty || 0;
        return acc;
      },
      { totalItems: 0, totalNeeded: 0, totalBuffer: 0, totalPlan: 0 }
    );
  }, [filteredItems]);

  // Chia danh sách làm 2 cột nếu chọn view dạng split (như popup xem đơn bếp)
  const { leftItems, rightItems } = useMemo(() => {
    const mid = Math.ceil(filteredItems.length / 2);
    return {
      leftItems: filteredItems.slice(0, mid),
      rightItems: filteredItems.slice(mid),
    };
  }, [filteredItems]);

  // Đếm đơn đã duyệt và đơn cần duyệt để hiển thị trên sub-nav
  const totalApprovedCount = useMemo(() => {
    try {
      const raw = localStorage.getItem('vietthang_approved_orders');
      if (raw) return JSON.parse(raw).length;
    } catch (e) {}
    return 28;
  }, []);

  const totalPendingCount = useMemo(() => {
    try {
      const raw = localStorage.getItem('vietthang_pending_orders');
      if (raw) return JSON.parse(raw).length;
    } catch (e) {}
    return 3;
  }, []);

  return (
    <div className="space-y-4 pb-16">
      {/* CSS CHO BẢN IN A4 NGANG (CHỈ IN KẾ HOẠCH BẾP) */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          body > *:not(.app-root),
          nav, header, aside, .print-hidden {
            display: none !important;
          }
          body, html {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #kitchen-production-printable {
            display: block !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-border-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 2px solid #0f172a !important;
          }
          .print-border-table th,
          .print-border-table td {
            border: 1px solid #94a3b8 !important;
            padding: 6px 8px !important;
          }
          .print-border-table thead th {
            background-color: #0f172a !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* SUB-HEADER ĐIỀU HƯỚNG NHANH GIỮA 3 TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 print-hidden">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span
            onClick={() => navigate('/')}
            className="hover:text-blue-600 cursor-pointer font-medium"
          >
            Home
          </span>
          <span>/</span>
          <span className="font-bold text-slate-800 uppercase tracking-wide">
            KẾ HOẠCH BẾP SẢN XUẤT
          </span>
        </div>

        {/* Cụm tab điều hướng 3 trang: Danh sách đã duyệt - Đơn cần duyệt - Tổng bếp SX */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold border border-slate-300/60 overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => navigate('/orders/list')}
            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircleOutlined className="text-emerald-500" />
            <span>Danh sách đơn hàng (Đã duyệt)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              {totalApprovedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/orders/approval')}
            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <ClockCircleOutlined className="text-amber-600" />
            <span>Đơn hàng cần duyệt</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              {totalPendingCount}
            </span>
          </button>

          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FireOutlined className="text-rose-600" />
            <span>Tổng bếp sản xuất</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px]">
              {filteredItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* THANH BANNER MÀU ĐEN (ĐỒNG BỘ 100% STYLE VỚI TRANG DUYỆT ĐƠN) */}
      <div className="bg-[#0f172a] text-white rounded-2xl px-5 py-3.5 shadow-md flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap print-hidden">
        {/* Nhóm bên trái: Icon + Tiêu đề + Các huy hiệu thống kê */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <FireOutlined className="text-rose-400 text-base" />
            <span className="text-sm font-extrabold uppercase tracking-wide">
              TỔNG BẾP SẢN XUẤT
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold flex-nowrap shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
              TỔNG {summary.totalItems}
            </span>
            <span className="px-3 py-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-600/60 font-black text-xs">
              TỔNG CẦN NẤU {summary.totalPlan.toLocaleString('vi-VN')} SP
            </span>
          </div>
        </div>

        {/* Nhóm bên phải: Nút Sửa định mức an toàn, In kế hoạch & Toggle Ngày */}
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {/* NÚT SỬA ĐỊNH MỨC AN TOÀN */}
          <button
            type="button"
            onClick={() => setIsBufferModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-400/40 whitespace-nowrap"
            title="Tùy chỉnh tỷ lệ % định mức an toàn cộng thêm cho bếp"
          >
            <SlidersOutlined className="text-yellow-200" />
            <span>SỬA ĐỊNH MỨC AN TOÀN (+{bufferConfig.defaultPercent}%)</span>
          </button>

          {/* NÚT IN KẾ HOẠCH SẢN XUẤT */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-500/40 whitespace-nowrap"
            title="In bảng kế hoạch nấu cho bếp A4 ngang"
          >
            <PrinterOutlined className="text-white" />
            <span>IN KẾ HOẠCH BẾP</span>
          </button>

          {/* Nút toggle HÔM NAY / NGÀY MAI */}
          <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => handleToggleDay('today')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedDayTab === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              HÔM NAY
            </button>
            <button
              type="button"
              onClick={() => handleToggleDay('tomorrow')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedDayTab === 'tomorrow'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              NGÀY MAI
            </button>
          </div>
        </div>
      </div>

      {/* KHỐI BỘ LỌC ĐA NĂNG */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs print-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          {/* Ô Chọn ngày DateRangePicker */}
          <div className="w-full">
            <DateRangePicker
              value={dateRange}
              onChange={(val) => {
                setDateRange(val);
                const todayStr = getTodayDateStr();
                const tomorrowStr = getTomorrowDateStr();
                const fromStr = val.from ? formatDisplayDate(val.from) : '';
                const toStr = val.to ? formatDisplayDate(val.to) : '';
                if (fromStr === todayStr && toStr === todayStr) {
                  setSelectedDayTab('today');
                } else if (fromStr === tomorrowStr && toStr === tomorrowStr) {
                  setSelectedDayTab('tomorrow');
                } else {
                  setSelectedDayTab(null);
                }
              }}
              className="w-full"
            />
          </div>

          {/* Lọc theo phân loại hàng */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="all">Tất cả phân loại món ({items.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Chuyển đổi giao diện: Bảng chi tiết vs Bảng 2 cột (popup bếp) */}
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Bố cục:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Bảng đầy đủ
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                2 Cột (Popup Bếp)
              </button>
            </div>
          </div>
        </div>

        {/* Thanh tìm kiếm nhanh */}
        <div className="relative pt-1">
          <SearchOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm nhanh theo mã SP, tên món, nhóm sản phẩm, mã đơn hàng..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full h-11 pl-11 pr-10 text-[13.5px] font-normal rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none transition shadow-2xs"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* BẢN IN & NỘI DUNG CHÍNH */}
      <div id="kitchen-production-printable" className="space-y-4">
        {/* Header ẩn chỉ hiện khi in */}
        <div className="hidden print:block mb-4 text-center">
          <h1 className="text-xl font-black uppercase text-black tracking-wide">
            KẾ HOẠCH NẤU BẾP SẢN XUẤT - VIETTHANGFOOD
          </h1>
          <p className="text-xs text-gray-700">
            Ngày thực hiện: <strong>{activeDateStr}</strong> | Định mức an toàn cộng thêm: <strong>+{bufferConfig.defaultPercent}%</strong>
          </p>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-medium shadow-2xs">
            <FireOutlined className="text-4xl text-slate-300 mb-2 block mx-auto" />
            <span>Không có món nào cần sản xuất vào ngày {activeDateStr}</span>
            <p className="text-xs text-slate-400 mt-1">
              (Các đơn hàng Đủ hàng khi duyệt sẽ không cộng vào bếp; chỉ các đơn Cần SX hoặc Thiếu hàng mới được đưa vào đây)
            </p>
          </div>
        ) : viewMode === 'split' ? (
          /* GIAO DIỆN 2 CỘT GIỐNG POPUP XEM TỔNG ĐƠN HÀNG */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* CỘT TRÁI */}
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="px-3.5 py-3 w-28 text-left">MÃ SP</th>
                    <th className="px-3.5 py-3 text-left">TÊN MÓN NẤU</th>
                    <th className="px-3 py-3 w-20 text-right">ĐƠN ĐẶT</th>
                    <th className="px-3 py-3 w-20 text-center">AN TOÀN</th>
                    <th className="px-3.5 py-3 w-24 text-right text-rose-300">TỔNG NẤU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leftItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-medium text-slate-500 text-xs whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-900 uppercase text-xs">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {item.category} • {item.unit}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                        {item.neededQty}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          +{item.safetyBufferQty} (+{item.safetyBufferPercent}%)
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-black text-rose-600 text-sm">
                        {item.totalPlanQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CỘT PHẢI */}
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="px-3.5 py-3 w-28 text-left">MÃ SP</th>
                    <th className="px-3.5 py-3 text-left">TÊN MÓN NẤU</th>
                    <th className="px-3 py-3 w-20 text-right">ĐƠN ĐẶT</th>
                    <th className="px-3 py-3 w-20 text-center">AN TOÀN</th>
                    <th className="px-3.5 py-3 w-24 text-right text-rose-300">TỔNG NẤU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rightItems.length > 0 ? (
                    rightItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 font-medium text-slate-500 text-xs whitespace-nowrap">
                          {item.sku}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-slate-900 uppercase text-xs">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.category} • {item.unit}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                          {item.neededQty}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            +{item.safetyBufferQty} (+{item.safetyBufferPercent}%)
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-black text-rose-600 text-sm">
                          {item.totalPlanQty}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                        Hết danh sách
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* GIAO DIỆN BẢNG ĐẦY ĐỦ TIỆN THEO DÕI & ĐIỀU CHỈNH TRẠNG THÁI MẺ */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse print-border-table">
                <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="px-3.5 py-3 w-12 text-center">STT</th>
                    <th className="px-3.5 py-3 w-28 text-left">MÃ SP</th>
                    <th className="px-4 py-3 text-left">TÊN SẢN PHẨM / MÓN BẾP NẤU</th>
                    <th className="px-3 py-3 w-16 text-center">ĐVT</th>
                    <th className="px-4 py-3 w-28 text-right font-bold">SL ĐƠN CẦN SX</th>
                    <th className="px-4 py-3 w-28 text-center font-bold">ĐỊNH MỨC AT</th>
                    <th className="px-4 py-3 w-28 text-right font-bold text-amber-300">BÙ AN TOÀN</th>
                    <th className="px-4 py-3 w-36 text-right font-black text-rose-300">TỔNG CẦN NẤU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* STT */}
                      <td className="px-3.5 py-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* Mã SP */}
                      <td className="px-3.5 py-3 font-semibold text-slate-600 whitespace-nowrap">
                        {item.sku}
                      </td>

                      {/* Tên sản phẩm */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs uppercase">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.category} {item.note && `• ${item.note}`}
                        </div>
                      </td>

                      {/* ĐVT */}
                      <td className="px-3 py-3 text-center font-medium text-slate-600">
                        {item.unit}
                      </td>

                      {/* SL Đơn cần SX */}
                      <td className="px-4 py-3 text-right font-bold text-slate-800 text-sm">
                        {item.neededQty.toLocaleString('vi-VN')}
                      </td>

                      {/* % Định mức an toàn */}
                      <td className="px-4 py-3 text-center">
                        <span
                          onClick={() => setIsBufferModalOpen(true)}
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100 transition"
                          title="Click để sửa định mức an toàn"
                        >
                          +{item.safetyBufferPercent}%
                        </span>
                      </td>

                      {/* Bù an toàn */}
                      <td className="px-4 py-3 text-right font-bold text-amber-600 text-sm">
                        +{item.safetyBufferQty.toLocaleString('vi-VN')}
                      </td>

                      {/* TỔNG CẦN NẤU (NỔI BẬT NHẤT) */}
                      <td className="px-4 py-3 text-right font-black text-rose-600 text-base">
                        {item.totalPlanQty.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* HÀNG TỔNG CỘNG FOOTER */}
                <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-wider font-extrabold">
                      TỔNG CỘNG ({filteredItems.length} MÓN):
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-black text-amber-300">
                      {summary.totalNeeded.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      +{bufferConfig.defaultPercent}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-black text-emerald-400">
                      +{summary.totalBuffer.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-right text-base font-black text-rose-400">
                      {summary.totalPlan.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* POPUP SỬA ĐỊNH MỨC AN TOÀN */}
      <SafetyBufferModal
        isOpen={isBufferModalOpen}
        onClose={() => setIsBufferModalOpen(false)}
        items={filteredItems}
        onSaved={() => {
          setItems(getKitchenProductionList());
          setBufferConfig(getSafetyBufferConfig());
        }}
      />
    </div>
  );
};
