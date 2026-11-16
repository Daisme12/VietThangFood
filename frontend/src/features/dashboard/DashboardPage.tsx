import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, MenuItem, FormControl, ListSubheader } from '@mui/material';
import {
  AlertOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  EditOutlined,
  PrinterOutlined,
  ArrowRightOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  InboxOutlined,
  SearchOutlined,
  LineChartOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { DateRangePicker, DateRangePickerValue } from '../../components/ui/DateRangePicker';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // State bộ lọc ngày & quick presets (Mặc định chọn HÔM NAY 10/11/2026)
  const [dateRange, setDateRange] = useState<DateRangePickerValue>({
    from: new Date('2026-11-10T00:00:00'),
    to: new Date('2026-11-10T23:59:59'),
  });
  const [activeDateTab, setActiveDateTab] = useState<string>('today');
  const [activeOrderTab, setActiveOrderTab] = useState<'all' | 'cook' | 'missing'>('all');

  // State 3 dropdowns
  const [customer, setCustomer] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [shippingMethod, setShippingMethod] = useState<string>('');

  // Quick search states cho 2 dropdowns và đơn hàng
  const [customerSearch, setCustomerSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  const CUSTOMERS_LIST = [
    { id: '1', name: 'Chu Văn Thức', location: 'THPT Chu Văn An' },
    { id: '2', name: 'Nguyễn Thu Hà', location: 'ĐH Bách Khoa' },
    { id: '3', name: 'Trần Bảo Trâm', location: 'FPT Tower' },
    { id: '4', name: 'Hoàng Minh Tuấn', location: 'Viettel HQ' },
    { id: '5', name: 'Đặng Hoàng Long', location: 'ĐH Quốc Gia' },
    { id: '6', name: 'Phạm Thị Mai', location: 'Keangnam' },
  ];

  const LOCATIONS_LIST = [
    { id: 'hn_cva', name: 'Hà Nội - Tây Hồ', note: 'Chu Văn An' },
    { id: 'hn_bk', name: 'Hà Nội - Hai Bà Trưng', note: 'Bách Khoa' },
    { id: 'hn_cg', name: 'Hà Nội - Cầu Giấy', note: 'FPT Tower' },
    { id: 'hn_vt', name: 'Hà Nội - Cầu Giấy', note: 'Viettel' },
    { id: 'hn_qg', name: 'Hà Nội - Cầu Giấy', note: 'Đại Học Quốc Gia' },
    { id: 'hn_kn', name: 'Hà Nội - Nam Từ Liêm', note: 'Keangnam' },
  ];

  const filteredCustomers = CUSTOMERS_LIST.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.location.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredLocations = LOCATIONS_LIST.filter(
    (l) =>
      l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
      l.note.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Danh sách các tab xem nhanh thời gian theo ngày & tuần/tháng
  const dateTabs = [
    { id: 'yesterday', label: 'HÔM QUA', sub: '09/11' },
    { id: 'today', label: 'HÔM NAY', sub: '10/11' },
    { id: 'tomorrow', label: 'NGÀY MAI', sub: '11/11' },
    { id: 'this_week', label: 'TUẦN NÀY', sub: '09–15/11' },
    { id: 'next_week', label: 'TUẦN TỚI', sub: '16–22/11' },
    { id: 'this_month', label: 'THÁNG NÀY', sub: 'Thg 11' },
  ];

  // Xử lý khi click vào nút xem nhanh theo ngày: Cập nhật ngay DateRangePicker và lọc toàn bộ dữ liệu
  const handleSelectDateTab = (tabId: string) => {
    setActiveDateTab(tabId);
    let from: Date | undefined;
    let to: Date | undefined;

    switch (tabId) {
      case 'yesterday':
        from = new Date('2026-11-09T00:00:00');
        to = new Date('2026-11-09T23:59:59');
        break;
      case 'today':
        from = new Date('2026-11-10T00:00:00');
        to = new Date('2026-11-10T23:59:59');
        break;
      case 'tomorrow':
        from = new Date('2026-11-11T00:00:00');
        to = new Date('2026-11-11T23:59:59');
        break;
      case 'this_week':
        from = new Date('2026-11-09T00:00:00');
        to = new Date('2026-11-15T23:59:59');
        break;
      case 'next_week':
        from = new Date('2026-11-16T00:00:00');
        to = new Date('2026-11-22T23:59:59');
        break;
      case 'this_month':
        from = new Date('2026-11-01T00:00:00');
        to = new Date('2026-11-30T23:59:59');
        break;
    }

    setDateRange({ from, to });
  };

  // Xử lý khi user chọn custom ngày trên DateRangePicker
  const handleDateRangeChange = (val: DateRangePickerValue) => {
    setDateRange(val);
    setActiveDateTab(''); // Bỏ active preset
  };

  // Dữ liệu đơn hàng chuẩn hoá có đầy đủ các ngày để test xem nhanh
  const ORDERS_TABLE_DATA = [
    // Đơn ngày 09/11/2026 (Hôm qua)
    {
      code: 'PGH-09550',
      status: 'sufficient',
      statusLabel: 'Đủ hàng',
      statusBadgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      date: '09/11/2026',
      customer: 'Đặng Hoàng Long',
      location: 'ĐẠI HỌC QUỐC GIA',
      items: 'Trà Xanh Thái Sữa Đọt Non x60 Chai • Trà Sữa Ô Long Rang x90 Chai',
      alertType: null,
      alertText: null,
      total: '3 600 000 đ',
      actionType: 'confirm',
      actionLabel: 'Xác nhận đơn',
    },
    {
      code: 'PGH-09551',
      status: 'missing_stock',
      statusLabel: 'Thiếu hàng',
      statusBadgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
      date: '09/11/2026',
      customer: 'Phạm Thị Mai',
      location: 'KEANGNAM LANDMARK',
      items: 'Trà Nhài Sữa 3Q x120 Chai • Hồng Trà Sữa Nướng x80 Chai',
      alertType: 'warning',
      alertText: 'Cần nấu/pha chế: Trà Nhài Sữa 3Q thiếu 50 Chai',
      total: '5 150 000 đ',
      actionType: 'production',
      actionLabel: 'Sản xuất',
    },

    // Đơn ngày 10/11/2026 (Hôm nay)
    {
      code: 'PGH-09552',
      status: 'missing_material',
      statusLabel: 'Thiếu NVL',
      statusBadgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
      date: '10/11/2026',
      customer: 'Chu Văn Thức',
      location: 'THPT CHU VĂN AN',
      items: 'Hồng Trà Sữa Nướng x150 Chai • Ô Long Sữa Hoàng Kim x160 Chai • Trà Nhài Sữa 3Q x10 Chai',
      alertType: 'danger',
      alertText: 'Kem Cheese Rich thiếu 8 hộp • Trà Đen Phúc Long thiếu 7.9kg',
      total: '5 724 000 đ',
      actionType: 'missing_material',
      actionLabel: 'Báo thiếu NVL',
    },
    {
      code: 'PGH-09553',
      status: 'missing_stock',
      statusLabel: 'Thiếu hàng',
      statusBadgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
      date: '10/11/2026',
      customer: 'Nguyễn Thu Hà',
      location: 'ĐẠI HỌC BÁCH KHOA',
      items: 'Ô Long Sữa Hoàng Kim x180 Chai • Trà Chanh Giã Tay x100 Chai',
      alertType: 'warning',
      alertText: 'Cần nấu/pha chế: Trà Sữa Ô Long Rang thiếu 150 Chai • Hồng Trà Sữa Nướng thiếu 220 Chai',
      total: '8 450 000 đ',
      actionType: 'production',
      actionLabel: 'Sản xuất',
    },

    // Đơn ngày 11/11/2026 (Ngày mai)
    {
      code: 'PGH-09554',
      status: 'missing_stock',
      statusLabel: 'Thiếu hàng',
      statusBadgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
      date: '11/11/2026',
      customer: 'Trần Bảo Trâm',
      location: 'FPT TOWER CẦU GIẤY',
      items: 'Cà Phê Muối Kem Béo x70 Chai (Đủ) • Trà Nhài Sữa Đậu Đỏ x90 Chai',
      alertType: 'warning',
      alertText: 'Cần nấu/pha chế: Trà Sữa Macchiato (120 Chai) • Trà Nhài Sữa Đậu Đỏ thiếu 40 Chai',
      total: '4 120 000 đ',
      actionType: 'production',
      actionLabel: 'Sản xuất',
    },
    {
      code: 'PGH-09555',
      status: 'sufficient',
      statusLabel: 'Đủ hàng',
      statusBadgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      date: '11/11/2026',
      customer: 'Hoàng Minh Tuấn',
      location: 'VIETTEL HEADQUARTER',
      items: 'Trà Nhài Sữa 3Q x110 Chai • Trà Xanh Thái Sữa Đọt Non x80 Chai',
      alertType: null,
      alertText: null,
      total: '3 250 000 đ',
      actionType: 'confirm',
      actionLabel: 'Xác nhận đơn',
    },
  ];

  // Tính toán danh sách đơn hàng đã lọc theo bộ lọc thời gian và tìm kiếm
  const filteredOrders = ORDERS_TABLE_DATA.filter((order) => {
    // 1. Lọc theo khoảng thời gian được chọn
    if (dateRange.from || dateRange.to) {
      const parts = order.date.split('/');
      const orderDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();

      if (dateRange.from) {
        const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0);
        if (orderDate < fromTime) return false;
      }
      if (dateRange.to) {
        const toTime = new Date(dateRange.to).setHours(23, 59, 59, 999);
        if (orderDate > toTime) return false;
      }
    }

    // 2. Lọc theo khách hàng nếu được chọn
    if (customer) {
      const custObj = CUSTOMERS_LIST.find((c) => c.id === customer);
      if (custObj && !order.customer.toLowerCase().includes(custObj.name.toLowerCase())) {
        return false;
      }
    }

    // 3. Lọc theo địa điểm nếu được chọn
    if (locationFilter) {
      const locObj = LOCATIONS_LIST.find((l) => l.id === locationFilter);
      if (locObj && !order.location.toLowerCase().includes(locObj.note.toLowerCase())) {
        return false;
      }
    }

    // 4. Lọc theo tab phân loại đơn
    if (activeOrderTab === 'cook' && order.actionType !== 'production') return false;
    if (activeOrderTab === 'missing' && order.actionType !== 'missing_material') return false;

    // 5. Lọc theo từ khoá tìm kiếm nhanh
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const match =
        order.code.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.location.toLowerCase().includes(q) ||
        order.items.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Tính toán KPI tự động theo ngày đang lọc
  const totalOrdersCount = filteredOrders.length;
  const totalRevenueAmount = filteredOrders.reduce((sum, o) => {
    const num = parseInt(o.total.replace(/\D/g, ''), 10) || 0;
    return sum + num;
  }, 0);
  const totalRevenueFormatted = new Intl.NumberFormat('vi-VN').format(totalRevenueAmount) + ' đ';
  const needProductionCount = filteredOrders.filter((o) => o.actionType === 'production').length;
  const missingMaterialCount = filteredOrders.filter((o) => o.actionType === 'missing_material').length;

  // Common styling cho các Dropdown MUI Select: Bo tròn 14px đồng bộ 100% với DateRangePicker & Tabs
  const commonSelectSx = {
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    fontSize: '13.5px',
    fontWeight: 600,
    color: '#0f172a',
    '& .MuiOutlinedInput-notchedOutline': {
      borderRadius: '14px',
      borderColor: '#cbd5e1',
      borderWidth: '1.5px',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3553ab !important',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3553ab !important',
      borderWidth: '1.5px',
      boxShadow: '0 0 0 3px rgba(53, 83, 171, 0.12)',
    },
  };

  const commonMenuProps = {
    slotProps: {
      paper: {
        sx: {
          borderRadius: '14px',
          boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.15)',
          border: '1px solid #e2e8f0',
          mt: 1,
          maxHeight: 320,
          '& .MuiMenuItem-root': {
            fontSize: '13px',
            fontWeight: 500,
            py: 1.2,
            px: 2,
            '&:hover': {
              backgroundColor: '#f1f5f9',
            },
            '&.Mui-selected': {
              backgroundColor: '#dbe4f9 !important',
              fontWeight: 700,
              color: '#1e3a8a',
            },
          },
        },
      },
    },
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-10">
      {/* =========================================================================
          BREADCRUMB ĐIỀU HƯỚNG TRÊN ĐẦU TRANG
          ========================================================================= */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pb-0.5 px-0.5">
        <span
          onClick={() => navigate('/')}
          className="text-blue-600 hover:underline cursor-pointer font-medium"
        >
          Home
        </span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-bold uppercase tracking-wide">
          BÁO CÁO
        </span>
      </div>

      {/* =========================================================================
          THANH TIÊU ĐỀ DOANH THU & KHOẢNG THỜI GIAN (CHUẨN THEO DESIGN ẢNH 2 & 3)
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0f172a] px-4 py-2.5 text-white shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-slate-200">
            <LineChartOutlined className="text-sm" />
          </div>
          <span className="text-sm font-extrabold uppercase tracking-wider text-white">
            DOANH THU
          </span>
          <span className="rounded-full bg-slate-800/90 border border-slate-600/80 px-3 py-0.5 text-xs font-bold text-slate-200">
            KHOẢNG THỜI GIAN
          </span>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black tracking-wide text-blue-700">
            PHIẾU {filteredOrders.length > 0 ? filteredOrders.length : 23}
          </span>
        </div>

        {/* Nút lọc nhanh ngày HÔM NAY / NGÀY MAI bên phải banner đen như ảnh mẫu */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectDateTab('today')}
            className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
              activeDateTab === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            HÔM NAY
          </button>
          <button
            type="button"
            onClick={() => handleSelectDateTab('tomorrow')}
            className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
              activeDateTab === 'tomorrow'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            NGÀY MAI
          </button>
        </div>
      </div>

      {/* =========================================================================
          KHỐI 1: BỘ LỌC ĐIỀU HÀNH TRÊN CÙNG (TOP FILTERS)
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
        {/* Hàng 1: Bộ chọn ngày + 3 Dropdowns MUI Select */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-center">
          <div className="w-full">
            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} className="w-full" />
          </div>

          {/* Chọn khách hàng MUI Select với Search nhanh */}
          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                onClose={() => setCustomerSearch('')}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return <span className="text-slate-600 font-semibold">Chọn khách hàng</span>;
                  }
                  const found = CUSTOMERS_LIST.find((c) => c.id === selected);
                  return (
                    <span className="font-bold text-slate-900 truncate">
                      {found ? `${found.name} (${found.location})` : 'Chọn khách hàng'}
                    </span>
                  );
                }}
                startAdornment={
                  <svg className="w-4 h-4 mr-2 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                }
                sx={commonSelectSx}
                MenuProps={commonMenuProps}
              >
                {/* Search nhanh tích hợp ngay trên đầu dropdown */}
                <ListSubheader
                  disableSticky={false}
                  sx={{
                    p: 1.5,
                    pb: 1,
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    lineHeight: 'normal',
                  }}
                >
                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Tìm nhanh khách hàng (tên, trường)..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-2xs"
                      autoFocus
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </ListSubheader>

                <MenuItem value="">
                  <em className="text-slate-400">Tất cả khách hàng</em>
                </MenuItem>

                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-slate-500 font-normal ml-1">({c.location})</span>
                    </MenuItem>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Không tìm thấy khách hàng phù hợp
                  </div>
                )}
              </Select>
            </FormControl>
          </div>

          {/* Chọn địa điểm MUI Select với Search nhanh */}
          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                onClose={() => setLocationSearch('')}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return <span className="text-slate-600 font-semibold">Chọn địa điểm</span>;
                  }
                  const found = LOCATIONS_LIST.find((l) => l.id === selected);
                  return (
                    <span className="font-bold text-slate-900 truncate">
                      {found ? `${found.name} (${found.note})` : 'Chọn địa điểm'}
                    </span>
                  );
                }}
                startAdornment={
                  <svg className="w-4 h-4 mr-2 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                }
                sx={commonSelectSx}
                MenuProps={commonMenuProps}
              >
                {/* Search nhanh địa điểm */}
                <ListSubheader
                  disableSticky={false}
                  sx={{
                    p: 1.5,
                    pb: 1,
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    lineHeight: 'normal',
                  }}
                >
                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Tìm nhanh địa điểm (quận, toà nhà)..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-2xs"
                      autoFocus
                    />
                    {locationSearch && (
                      <button
                        type="button"
                        onClick={() => setLocationSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </ListSubheader>

                <MenuItem value="">
                  <em className="text-slate-400">Tất cả địa điểm</em>
                </MenuItem>

                {filteredLocations.length > 0 ? (
                  filteredLocations.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-slate-500 font-normal ml-1">({l.note})</span>
                    </MenuItem>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Không tìm thấy địa điểm phù hợp
                  </div>
                )}
              </Select>
            </FormControl>
          </div>

          {/* Chọn ship MUI Select */}
          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return <span className="text-slate-600 font-semibold">Chọn ship</span>;
                  }
                  const labels: Record<string, string> = {
                    express: 'Hỏa tốc / Ahamove',
                    standard: 'Tiêu chuẩn / Xe xưởng',
                    pickup: 'Khách tự lấy tại kho',
                  };
                  return <span className="font-bold text-slate-900">{labels[selected]}</span>;
                }}
                startAdornment={
                  <svg className="w-4 h-4 mr-2 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                }
                sx={commonSelectSx}
                MenuProps={commonMenuProps}
              >
                <MenuItem value="">
                  <em className="text-slate-400">Tất cả phương thức ship</em>
                </MenuItem>
                <MenuItem value="express">Hỏa tốc / Ahamove</MenuItem>
                <MenuItem value="standard">Tiêu chuẩn / Xe xưởng</MenuItem>
                <MenuItem value="pickup">Khách tự lấy tại kho</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Hàng 2: Dải nút chọn nhanh thời gian căn đều tăm tắp (bo tròn 14px đồng bộ) */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 pt-1">
          {dateTabs.map((tab) => {
            const isActive = activeDateTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectDateTab(tab.id)}
                className={`h-11 rounded-[14px] text-xs font-bold tracking-wide transition-all shadow-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  isActive
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-700 font-extrabold shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="leading-tight">{tab.label}</span>
                <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          KHỐI 2: THỐNG KÊ DOANH THU & CHỈ SỐ ĐIỀU HÀNH (CHUẨN THEO ẢNH MẪU 3)
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          XUẤT DOANH THU THEO KHÁCH HÀNG HOẶC ĐỊA ĐIỂM
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Tổng doanh thu (nền xanh biển nhạt viền xanh) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <CreditCardOutlined className="text-xl" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700/80">
                TỔNG DOANH THU
              </p>
              <p className="text-xl font-extrabold text-blue-900 tracking-tight">
                {totalRevenueFormatted}
              </p>
            </div>
          </div>

          {/* Card 2: Tổng đơn hàng */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                TỔNG ĐƠN HÀNG
              </p>
              <p className="text-lg font-extrabold text-slate-900">
                {totalOrdersCount} <span className="text-xs font-normal text-slate-500">đơn</span>{' '}
                <span className="text-xs font-normal text-slate-400">• Tổng 142</span>
              </p>
            </div>
          </div>

          {/* Card 3: Tồn kho & Cần SX */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700/80">
                TỒN KHO &amp; CẦN SX
              </p>
              <p className="text-lg font-extrabold text-indigo-900">
                {needProductionCount > 0 ? `${needProductionCount} mã cần SX` : '0 mã cần SX'}{' '}
                <span className="text-xs font-normal text-slate-400">• An toàn 42/60</span>
              </p>
            </div>
          </div>

          {/* Card 4: Thiếu NVL */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700/80">
                  THIẾU NVL
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/inventory/purchases')}
                  className="text-[10px] font-bold text-rose-600 underline hover:text-rose-700"
                >
                  Chi tiết
                </button>
              </div>
              <p className="text-lg font-extrabold text-rose-600">
                {missingMaterialCount > 0 ? `0${missingMaterialCount}` : '00'}{' '}
                <span className="text-xs font-normal text-slate-500">mã</span>{' '}
                <span className="text-xs font-semibold text-rose-600">• Cần nhập gấp</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KHỐI 3: DANH SÁCH ĐƠN HÀNG CẦN XỬ LÝ (DẠNG TABLE CĂN CỘT THẲNG HÀNG)
          Cột: Mã đơn | Trạng thái | Ngày | Khách hàng | Địa điểm | Tổng tiền | Thao tác
          Chi tiết món: 1 dòng bắt đầu từ cột ID
          Nút bấm: Dùng icon vector thư viện chuẩn chuyên nghiệp
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        {/* Header khối đơn hàng */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">
              Danh sách đơn hàng cần xử lý
            </h2>

            {/* Ô tìm kiếm nhanh đơn hàng (To rõ, dễ nhìn, dễ bấm) */}
            <div className="relative hidden md:block">
              <SearchOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã đơn, khách hàng..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="h-10 w-72 lg:w-80 pl-10 pr-8 text-sm font-semibold rounded-full border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-2xs"
              />
              {orderSearch && (
                <button
                  type="button"
                  onClick={() => setOrderSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveOrderTab('all')}
              className={`h-10 rounded-full px-4.5 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeOrderTab === 'all'
                  ? 'bg-[#0d5c46] text-white shadow-sm ring-2 ring-[#0d5c46]/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>Tất cả</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-black min-w-[22px] text-center ${
                  activeOrderTab === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                6
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveOrderTab('cook')}
              className={`h-10 rounded-full px-4.5 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeOrderTab === 'cook'
                  ? 'bg-[#854d0e] text-amber-50 shadow-sm ring-2 ring-[#854d0e]/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>Cần nấu mẻ</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-black min-w-[22px] text-center ${
                  activeOrderTab === 'cook' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                2
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveOrderTab('missing')}
              className={`h-10 rounded-full px-4.5 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeOrderTab === 'missing'
                  ? 'bg-rose-700 text-white shadow-sm ring-2 ring-rose-700/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>Thiếu NVL</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-black min-w-[22px] text-center ${
                  activeOrderTab === 'missing' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                }`}
              >
                1
              </span>
            </button>
          </div>
        </div>

        {/* BẢNG TABLE ĐƠN HÀNG CĂN CỘT THẲNG TẮP */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse bg-white">
            <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="px-2.5 py-3.5 w-22 text-center text-slate-300">#</th>
                <th className="px-3 py-3.5 w-28 text-white">Mã đơn</th>
                <th className="px-3 py-3.5 w-28 text-white">Trạng thái</th>
                <th className="px-3 py-3.5 w-24 text-white">Ngày đặt</th>
                <th className="px-4 py-3.5 min-w-[160px] text-white">Khách hàng</th>
                <th className="px-4 py-3.5 min-w-[200px] text-white">Địa điểm</th>
                <th className="px-4 py-3.5 text-right w-32 text-white">Tổng tiền</th>
                <th className="px-4 py-3.5 text-right w-40 text-white">Thao tác</th>
              </tr>
            </thead>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tbody
                  key={order.code}
                  className="group font-medium text-slate-800 border-b border-slate-200 transition"
                >
                  {/* HÀNG 1: THÔNG TIN CHÍNH (Hover đồng bộ cả 2 hàng, không bị tách rời) */}
                  <tr className="transition-colors duration-150 group-hover:bg-slate-50/90">
                    {/* Cột icon thao tác xem/sửa to rõ ràng */}
                    <td className="px-2.5 py-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition shadow-2xs cursor-pointer"
                          title="Xem chi tiết đơn hàng"
                        >
                          <EyeOutlined className="text-base" />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600 transition shadow-2xs cursor-pointer"
                          title="Chỉnh sửa đơn hàng"
                        >
                          <EditOutlined className="text-base" />
                        </button>
                      </div>
                    </td>

                    {/* Cột Mã đơn (ID) */}
                    <td className="px-3 py-3 font-bold font-mono text-slate-900 text-sm align-middle whitespace-nowrap">
                      {order.code}
                    </td>

                    {/* Cột Trạng thái */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${order.statusBadgeClass}`}>
                        {order.status === 'missing_material' && (
                          <AlertOutlined className="text-rose-600 text-[11px]" />
                        )}
                        {order.status === 'missing_stock' && (
                          <InboxOutlined className="text-amber-700 text-[11px]" />
                        )}
                        {order.status === 'sufficient' && (
                          <CheckCircleOutlined className="text-emerald-700 text-[11px]" />
                        )}
                        <span>{order.statusLabel}</span>
                      </span>
                    </td>

                    {/* Cột Ngày đặt */}
                    <td className="px-3 py-3 text-slate-500 font-medium align-middle whitespace-nowrap">
                      {order.date}
                    </td>

                    {/* Cột Khách hàng (căn thẳng cột) */}
                    <td className="px-4 py-3 font-bold text-slate-900 align-middle whitespace-nowrap">
                      {order.customer}
                    </td>

                    {/* Cột Địa điểm (căn thẳng cột) */}
                    <td className="px-4 py-3 text-slate-600 font-semibold align-middle whitespace-nowrap">
                      {order.location}
                    </td>

                    {/* Cột Tổng tiền */}
                    <td className="px-4 py-3 text-right font-black text-slate-900 text-sm align-middle whitespace-nowrap">
                      {order.total}
                    </td>

                    {/* Cột Thao tác: Dùng Button chuẩn thư viện với icon Ant Design */}
                    <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                      {order.actionType === 'missing_material' && (
                        <button
                          type="button"
                          onClick={() => navigate('/orders/approval')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-800 transition"
                        >
                          <AlertOutlined className="text-white text-xs" />
                          <span>{order.actionLabel}</span>
                        </button>
                      )}

                      {order.actionType === 'production' && (
                        <button
                          type="button"
                          onClick={() => navigate('/orders/approval')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#854d0e] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#713f12] transition"
                        >
                          <ToolOutlined className="text-white text-xs" />
                          <span>{order.actionLabel}</span>
                        </button>
                      )}

                      {order.actionType === 'confirm' && (
                        <button
                          type="button"
                          onClick={() => navigate('/orders/approval')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#047857] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#065f46] transition"
                        >
                          <CheckCircleOutlined className="text-white text-xs" />
                          <span>{order.actionLabel}</span>
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* HÀNG 2: CHI TIẾT MÓN (Hover đồng bộ cùng hàng 1) */}
                  <tr className="transition-colors duration-150 group-hover:bg-slate-50/90">
                    <td></td> {/* Chừa cột icon # để dòng chi tiết bắt đầu từ ID */}
                    <td colSpan={7} className="px-3 pb-3 pt-0">
                      <div className="space-y-1.5">
                        {/* Dòng các món trà sữa (1 dòng bắt đầu từ ID) */}
                        <p className="text-xs text-slate-600 truncate font-normal leading-relaxed">
                          {order.items}
                        </p>

                        {/* Box cảnh báo nếu có, cũng bắt đầu từ ID */}
                        {order.alertText && (
                          <div
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold border ${
                              order.alertType === 'danger'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                          >
                            {order.alertType === 'danger' ? (
                              <AlertOutlined className="text-rose-600 text-xs shrink-0" />
                            ) : (
                              <ToolOutlined className="text-amber-700 text-xs shrink-0" />
                            )}
                            <span>{order.alertText}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              ))
            ) : (
              <tbody>
                <tr className="border-b border-slate-200">
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">Không tìm thấy đơn hàng nào trong ngày/bộ lọc này</p>
                    <p className="text-xs text-slate-400 mt-1">Hãy bấm các nút "Hôm nay", "Tuần này" hoặc chọn khoảng ngày khác</p>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>

        {/* Footer khối đơn hàng */}
        <div className="flex flex-col justify-between gap-3 pt-2 sm:flex-row sm:items-center border-t border-slate-100">
          <span className="text-xs text-slate-500">Hiển thị {filteredOrders.length} / {ORDERS_TABLE_DATA.length} đơn hàng</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <PrinterOutlined className="text-slate-600 text-xs" />
              <span>In danh sách</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/orders/approval')}
              className="flex items-center gap-1.5 rounded-lg bg-[#0d5c46] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#094333] transition"
            >
              <span>Xem tất cả (142)</span>
              <ArrowRightOutlined className="text-white text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KHỐI 4: CẢNH BÁO NVL NẤU MẺ (MERGE NHÀ CUNG CẤP & THAO TÁC)
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        {/* Header khối NVL */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Cảnh báo NVL nấu mẻ
            </h2>
            <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <AlertOutlined className="text-rose-600 text-xs shrink-0" />
              <span>4 mã thiếu / cần bổ sung</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <PrinterOutlined className="text-slate-600 text-xs" />
              <span>In danh sách thiếu</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/inventory/purchases')}
              className="flex items-center gap-1.5 rounded-lg bg-[#0d5c46] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#094333] transition"
            >
              <PlusOutlined className="text-white text-xs" />
              <span>Tạo phiếu nhập kho</span>
            </button>
          </div>
        </div>

        {/* Bảng chi tiết NVL thiếu - Đã merge Nhà cung cấp và Thao tác khi chung NCC */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse bg-white">
            <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-white border-r border-slate-700/80">Nhà cung cấp</th>
                <th className="px-4 py-3.5 text-white">Nguyên vật liệu</th>
                <th className="px-4 py-3.5 text-center text-white">Tồn hiện tại</th>
                <th className="px-4 py-3.5 text-center text-white">Cần cho mẻ</th>
                <th className="px-4 py-3.5 text-center text-white">Thiếu hụt / Cần nhập</th>
                <th className="px-4 py-3.5 text-right text-white border-l border-slate-700/80">Thao tác</th>
              </tr>
            </thead>
            <tbody className="font-medium text-slate-800">
              {[
                {
                  supplier: 'Phúc Long Tea',
                  items: [
                    {
                      material: 'Trà Đen Phúc Long',
                      current: '2.1 kg',
                      required: '10.0 kg',
                      missing: '-7.9 kg',
                    },
                    {
                      material: 'Trà Xanh Thái Sữa',
                      current: '1.5 kg',
                      required: '8.0 kg',
                      missing: '-6.5 kg',
                    },
                  ],
                },
                {
                  supplier: 'Gia Thịnh Phát',
                  items: [
                    {
                      material: 'Trân Châu Đen ĐL',
                      current: '4.5 kg',
                      required: '25.0 kg',
                      missing: '-20.5 kg',
                    },
                  ],
                },
                {
                  supplier: 'KTC Food',
                  items: [
                    {
                      material: 'Bột Sữa Béo Kievit',
                      current: '18.0 kg',
                      required: '50.0 kg',
                      missing: '-32.0 kg',
                    },
                  ],
                },
              ].map((group) => {
                const rowSpan = group.items.length;
                return group.items.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isLastOfGroup = idx === group.items.length - 1;
                  return (
                    <tr
                      key={`${group.supplier}-${item.material}`}
                      className={`hover:bg-slate-50/80 transition ${
                        isLastOfGroup
                          ? 'border-b border-slate-200'
                          : 'border-b border-slate-100'
                      }`}
                    >
                      {/* CỘT NHÀ CUNG CẤP ĐƯỢC MERGE (rowSpan) */}
                      {isFirst && (
                        <td
                          rowSpan={rowSpan}
                          className="px-4 py-3.5 font-bold text-slate-900 align-middle border-r border-slate-100 bg-white"
                        >
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {group.supplier}
                            </span>
                            {rowSpan > 1 && (
                              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                                {rowSpan} nguyên vật liệu
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* CÁC CỘT CHI TIẾT NGUYÊN VẬT LIỆU */}
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {item.material}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">
                        {item.current}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">
                        {item.required}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="rounded-md bg-rose-50 px-2.5 py-0.5 font-bold text-rose-700 border border-rose-100">
                          {item.missing}
                        </span>
                      </td>

                      {/* CỘT THAO TÁC ĐƯỢC MERGE (rowSpan) VỚI ICON THƯ VIỆN */}
                      {isFirst && (
                        <td
                          rowSpan={rowSpan}
                          className="px-4 py-3.5 text-right align-middle border-l border-slate-100 bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => navigate('/inventory/purchases')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-800 transition"
                          >
                            <ShoppingCartOutlined className="text-white text-xs" />
                            <span>Nhập ngay</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        {/* Footer khối NVL */}
        <div className="flex flex-col justify-between gap-3 pt-2 sm:flex-row sm:items-center border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <AlertOutlined className="text-amber-500 text-xs shrink-0" />
            <span>
              Tổng cộng <strong>4 nguyên vật liệu</strong> cần tạo phiếu nhập khẩn • Ước tính nhu cầu: <strong>66.9 kg</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/inventory/purchases')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0d5c46] hover:underline"
          >
            <span>Lập phiếu nhập tổng hợp</span>
            <ArrowRightOutlined className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
};
