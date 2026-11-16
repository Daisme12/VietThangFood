import React, { useState } from 'react';
import { Select, MenuItem, FormControl, ListSubheader } from '@mui/material';
import { SearchOutlined } from '@ant-design/icons';
import { DateRangePicker, DateRangePickerValue } from './DateRangePicker';

export interface CustomerOption {
  id: string;
  name: string;
  location: string;
}

export interface LocationOption {
  id: string;
  name: string;
  note: string;
}

export interface ShippingOption {
  id: string;
  label: string;
}

export const DEFAULT_CUSTOMERS: CustomerOption[] = [
  { id: 'yen_thuc', name: 'YẾN THỨC', location: 'Cơ sở Yến Thức' },
  { id: '1', name: 'Chu Văn Thức', location: 'THPT Chu Văn An' },
  { id: '2', name: 'Nguyễn Thu Hà', location: 'ĐH Bách Khoa' },
  { id: '3', name: 'Trần Bảo Trâm', location: 'FPT Tower' },
  { id: '4', name: 'Hoàng Minh Tuấn', location: 'Viettel HQ' },
  { id: '5', name: 'Đặng Hoàng Long', location: 'ĐH Quốc Gia' },
  { id: '6', name: 'Phạm Thị Mai', location: 'Keangnam' },
];

export const DEFAULT_LOCATIONS: LocationOption[] = [
  { id: 'hn_cva', name: 'CHU VĂN THỨC', note: 'Cơ sở THPT Chu Văn An' },
  { id: 'yen_thuc', name: 'YẾN THỨC', note: 'Cơ sở Yến Thức' },
  { id: 'hn_bk', name: 'Hà Nội - Hai Bà Trưng', note: 'Bách Khoa' },
  { id: 'hn_cg', name: 'Hà Nội - Cầu Giấy', note: 'FPT Tower' },
  { id: 'hn_vt', name: 'Hà Nội - Cầu Giấy', note: 'Viettel' },
  { id: 'hn_qg', name: 'Hà Nội - Cầu Giấy', note: 'Đại Học Quốc Gia' },
  { id: 'hn_kn', name: 'Hà Nội - Nam Từ Liêm', note: 'Keangnam' },
];

export const DEFAULT_SHIPPING_METHODS: ShippingOption[] = [
  { id: 'a_luong', label: 'A Lương' },
  { id: 'express', label: 'Hỏa tốc / Ahamove' },
  { id: 'standard', label: 'Tiêu chuẩn / Xe xưởng' },
  { id: 'xe_xuong_01', label: 'Xe xưởng 01 (A Nam)' },
  { id: 'xe_xuong_02', label: 'Xe xưởng 02 (A Hùng)' },
  { id: 'pickup', label: 'Khách tự lấy tại kho' },
];

export interface OperationalFilterBarProps {
  // Bộ chọn ngày
  dateRange: DateRangePickerValue;
  onDateRangeChange: (val: DateRangePickerValue) => void;

  // Preset Tabs
  activeDateTab?: string;
  onDateTabChange?: (tabId: string) => void;
  showDateTabs?: boolean;

  // Khách hàng
  customer: string;
  onCustomerChange: (val: string) => void;
  customersList?: CustomerOption[];

  // Địa điểm
  location: string;
  onLocationChange: (val: string) => void;
  locationsList?: LocationOption[];

  // Ship / Giao vận
  shippingMethod: string;
  onShippingMethodChange: (val: string) => void;
  shippingList?: ShippingOption[];

  // Bố cục số cột (4 cột trên 1 hàng hoặc chia 2 hàng x 2 cột)
  columns?: 2 | 4;

  // Tùy chỉnh hiển thị
  className?: string;
  customerLabel?: string;
  locationLabel?: string;
  shippingLabel?: string;
}

export const OperationalFilterBar: React.FC<OperationalFilterBarProps> = ({
  dateRange,
  onDateRangeChange,
  activeDateTab = 'today',
  onDateTabChange,
  showDateTabs = true,
  columns = 4,
  customer,
  onCustomerChange,
  customersList = DEFAULT_CUSTOMERS,
  location,
  onLocationChange,
  locationsList = DEFAULT_LOCATIONS,
  shippingMethod,
  onShippingMethodChange,
  shippingList = DEFAULT_SHIPPING_METHODS,
  className = '',
  customerLabel = 'Chọn khách hàng',
  locationLabel = 'Chọn địa điểm',
  shippingLabel = 'Chọn ship / Giao vận',
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  // Lọc real-time khách hàng & địa điểm
  const filteredCustomers = customersList.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.location.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredLocations = locationsList.filter(
    (l) =>
      l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
      l.note.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Danh sách preset 6 tabs thời gian
  const dateTabs = [
    { id: 'yesterday', label: 'HÔM QUA', sub: '09/11' },
    { id: 'today', label: 'HÔM NAY', sub: '10/11' },
    { id: 'tomorrow', label: 'NGÀY MAI', sub: '11/11' },
    { id: 'this_week', label: 'TUẦN NÀY', sub: '09–15/11' },
    { id: 'next_week', label: 'TUẦN TỚI', sub: '16–22/11' },
    { id: 'this_month', label: 'THÁNG NÀY', sub: 'Thg 11' },
  ];

  const handleSelectTab = (tabId: string) => {
    if (onDateTabChange) {
      onDateTabChange(tabId);
    }
    // Cập nhật dateRange tương ứng
    if (tabId === 'yesterday') {
      onDateRangeChange({
        from: new Date('2026-11-09T00:00:00'),
        to: new Date('2026-11-09T23:59:59'),
      });
    } else if (tabId === 'today') {
      onDateRangeChange({
        from: new Date('2026-11-10T00:00:00'),
        to: new Date('2026-11-10T23:59:59'),
      });
    } else if (tabId === 'tomorrow') {
      onDateRangeChange({
        from: new Date('2026-11-11T00:00:00'),
        to: new Date('2026-11-11T23:59:59'),
      });
    } else if (tabId === 'this_week') {
      onDateRangeChange({
        from: new Date('2026-11-09T00:00:00'),
        to: new Date('2026-11-15T23:59:59'),
      });
    } else if (tabId === 'next_week') {
      onDateRangeChange({
        from: new Date('2026-11-16T00:00:00'),
        to: new Date('2026-11-22T23:59:59'),
      });
    } else if (tabId === 'this_month') {
      onDateRangeChange({
        from: new Date('2026-11-01T00:00:00'),
        to: new Date('2026-11-30T23:59:59'),
      });
    }
  };

  const commonSelectSx = {
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    fontWeight: 400,
    color: '#0f172a',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#e2e8f0',
      borderWidth: '1px',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#94a3b8',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3553ab',
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
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3 ${className}`}
    >
      {/* Bộ chọn ngày + 3 Dropdowns MUI Select (Hỗ trợ 4 cột 1 hàng hoặc chia 2 hàng x 2 cột) */}
      <div
        className={`grid grid-cols-1 ${
          columns === 2 ? 'md:grid-cols-2 gap-4' : 'sm:grid-cols-2 lg:grid-cols-4 gap-3'
        } items-center`}
      >
        {/* Ô 1: Chọn ngày */}
        <div className="w-full">
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            className="w-full"
          />
        </div>

        {/* Ô 2: Chọn khách hàng MUI Select có Search nhanh */}
        <div className="w-full">
          <FormControl fullWidth size="small">
            <Select
              value={customer}
              onChange={(e) => onCustomerChange(e.target.value)}
              onClose={() => setCustomerSearch('')}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return (
                    <span className="text-slate-500 font-normal">
                      {customerLabel}
                    </span>
                  );
                }
                const found = customersList.find((c) => c.id === selected || c.name === selected);
                return (
                  <span className="font-normal text-slate-800 truncate">
                    {found ? `${found.name} (${found.location})` : selected}
                  </span>
                );
              }}
              startAdornment={
                <svg
                  className="w-4 h-4 mr-2 text-slate-500 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              sx={commonSelectSx}
              MenuProps={commonMenuProps}
            >
              {/* Search nhanh khách hàng */}
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
                    <span className="text-slate-500 font-normal ml-1">
                      ({c.location})
                    </span>
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

        {/* Ô 3: Chọn địa điểm MUI Select có Search nhanh */}
        <div className="w-full">
          <FormControl fullWidth size="small">
            <Select
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              onClose={() => setLocationSearch('')}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return (
                    <span className="text-slate-500 font-normal">
                      {locationLabel}
                    </span>
                  );
                }
                const found = locationsList.find((l) => l.id === selected || l.name === selected);
                return (
                  <span className="font-normal text-slate-800 truncate">
                    {found ? `${found.name} (${found.note})` : selected}
                  </span>
                );
              }}
              startAdornment={
                <svg
                  className="w-4 h-4 mr-2 text-rose-500 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="7" r="3" />
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
                    <span className="text-slate-500 font-normal ml-1">
                      ({l.note})
                    </span>
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

        {/* Ô 4: Chọn ship / Giao vận */}
        <div className="w-full">
          <FormControl fullWidth size="small">
            <Select
              value={shippingMethod}
              onChange={(e) => onShippingMethodChange(e.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return (
                    <span className="text-slate-500 font-normal">
                      {shippingLabel}
                    </span>
                  );
                }
                const found = shippingList.find((s) => s.id === selected || s.label === selected);
                return (
                  <span className="font-normal text-slate-800">
                    {found ? found.label : selected}
                  </span>
                );
              }}
              startAdornment={
                <svg
                  className="w-4 h-4 mr-2 text-emerald-600 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
                <em className="text-slate-400">Tất cả giao vận</em>
              </MenuItem>
              {shippingList.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>

      {/* Hàng 2: Dải 6 nút preset thời gian căn đều tăm tắp (bo tròn 14px) */}
      {showDateTabs && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 pt-1">
          {dateTabs.map((tab) => {
            const isActive = activeDateTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`h-11 rounded-[14px] text-xs font-bold tracking-wide transition-all shadow-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  isActive
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-700 font-extrabold shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="leading-tight">{tab.label}</span>
                <span
                  className={`text-[10px] font-medium leading-none ${
                    isActive ? 'text-blue-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

