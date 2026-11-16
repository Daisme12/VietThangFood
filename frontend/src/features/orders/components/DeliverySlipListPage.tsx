import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, MenuItem, FormControl, ListSubheader } from '@mui/material';
import {
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  FireOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  ExclamationCircleOutlined,
  PrinterOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CarOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  DeliverySlipModal,
  DeliverySlipData,
} from './DeliverySlipModal';
import { KitchenReportModal } from './KitchenReportModal';
import {
  getSystemToday,
  getTodayDateStr,
  getTomorrowDateStr,
  parseOrderDate,
  formatDisplayDate,
} from '../../../lib/formatters';
import {
  DateRangePicker,
  DateRangePickerValue,
} from '../../../components/ui/DateRangePicker';
import {
  DEFAULT_LOCATIONS,
  DEFAULT_CUSTOMERS,
  DEFAULT_SHIPPING_METHODS,
} from '../../../components/ui/OperationalFilterBar';

export interface ApprovedOrderItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  returnedQty?: number;
  price: number;
  vatRate: number;
  note?: string;
}

export interface ApprovedOrderRecord {
  id: string;
  code: string;
  parentCode?: string;
  kind?: 'pgh' | 'pxk'; // pgh: Phiếu giao hàng, pxk: Phiếu xuất kho
  dateStr: string;
  customerName: string;
  locationName: string;
  locationAddress: string;
  contactPerson?: string;
  salesPerson?: string;
  shipperName?: string;
  note?: string;
  hasTagE?: boolean;
  totalAmount: number;
  items: ApprovedOrderItem[];
}

// 23 Đơn hàng mẫu đã duyệt khớp chuẩn danh mục Trà sữa & Đồ uống Hàn Châu
const INITIAL_APPROVED_ORDERS: ApprovedOrderRecord[] = [
  {
    id: 'ord_1',
    code: 'PGH-09619',
    kind: 'pgh',
    hasTagE: true,
    dateStr: getTodayDateStr(),
    customerName: 'CHU VĂN THỨC',
    locationName: 'Chu Văn Thức',
    locationAddress: 'Số 10 Thụy Khuê, P. Thụy Khuê, Q. Tây Hồ, Hà Nội',
    contactPerson: 'Thầy Thức - 098.345.6789',
    salesPerson: 'Chị Ly - 086.709.9978',
    shipperName: 'A Lương',
    note: 'Giao trước 6h30 sáng',
    totalAmount: 9390000,
    items: [
      { id: '1', sku: 'TS_NUONG_330', name: 'Trà Sữa Nướng Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 120, price: 22000, vatRate: 8 },
      { id: '2', sku: 'TS_HONG_330', name: 'Hồng Trà Sữa Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 100, price: 20000, vatRate: 8 },
      { id: '3', sku: 'TS_THAIX_330', name: 'Trà Sữa Thái Xanh Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 80, price: 20000, vatRate: 8 },
      { id: '4', sku: 'TS_OLONG_330', name: 'Trà Sữa Ô Long Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 60, price: 22000, vatRate: 8 },
      { id: '5', sku: 'TTC_DAO', name: 'Trà Đào Hàn Châu 350ml', category: 'TRÀ TRÁI CÂY HÀN CHÂU', unit: 'Chai', quantity: 50, price: 22000, vatRate: 8 },
      { id: '6', sku: 'PC_DAU', name: 'Panna Cotta Dâu Tây', category: 'PANNA COTTA', unit: 'Hũ', quantity: 40, price: 15000, vatRate: 8 },
      { id: '7', sku: 'CF_MUOI', name: 'Cà Phê Muối Hàn Châu 250ml', category: 'COFFEE', unit: 'Chai', quantity: 35, price: 20000, vatRate: 10 },
      { id: '8', sku: 'TM_CFM', name: 'Cafe Machiato - Hàn Châu', category: 'COFFEE', unit: 'Chai', quantity: 25, price: 22000, vatRate: 10 },
    ],
  },
  {
    id: 'ord_2',
    code: 'PGH-09618',
    kind: 'pgh',
    hasTagE: false,
    dateStr: getTodayDateStr(),
    customerName: 'CÔNG TY CỔ PHẦN UBOFOOD VIỆT NAM',
    locationName: 'UBF_THCS Nha Trang - Thái Nguyên',
    locationAddress: 'Tổ 18, Phường Phan Đình Phùng, Thành phố Thái Nguyên, Tỉnh Thái Nguyên',
    contactPerson: 'Dung - 097.484.6310',
    salesPerson: 'Chị Ly - 086.709.9978',
    shipperName: 'Ship_UBF_TN',
    totalAmount: 1680000,
    items: [
      { id: '21', sku: 'TS_NUONG_330', name: 'Trà Sữa Nướng Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 40, price: 22000, vatRate: 8 },
      { id: '22', sku: 'TS_HONG_330', name: 'Hồng Trà Sữa Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 40, price: 20000, vatRate: 8 },
    ],
  },
  {
    id: 'ord_3',
    code: 'PGH-09617',
    kind: 'pgh',
    hasTagE: false,
    dateStr: getTodayDateStr(),
    customerName: 'NGUYỄN THU HÀ',
    locationName: 'Hà Nội - Hai Bà Trưng (Bách Khoa)',
    locationAddress: 'Số 1 Đại Cồ Việt, P. Bách Khoa, Q. Hai Bà Trưng, Hà Nội',
    contactPerson: 'Chị Hà - 091.234.5678',
    salesPerson: 'Chị Ly - 086.709.9978',
    shipperName: 'A Lương',
    totalAmount: 2380000,
    items: [
      { id: '31', sku: 'TS_TT_250', name: 'Trà Sữa Truyền Thống 250ml', category: 'DÒNG GIÁ TỐT 250ML', unit: 'Chai', quantity: 60, price: 15000, vatRate: 8 },
      { id: '32', sku: 'TS_NUONG_250', name: 'Trà Sữa Nướng 250ml', category: 'DÒNG GIÁ TỐT 250ML', unit: 'Chai', quantity: 50, price: 16000, vatRate: 8 },
      { id: '33', sku: 'TS_MATCHA_250', name: 'Trà Sữa Matcha 250ml', category: 'DÒNG GIÁ TỐT 250ML', unit: 'Chai', quantity: 40, price: 17000, vatRate: 8 },
    ],
  },
  {
    id: 'ord_4',
    code: 'PGH-09616',
    kind: 'pgh',
    hasTagE: false,
    dateStr: getTodayDateStr(),
    customerName: 'TRẦN BẢO TRÂM',
    locationName: 'Hà Nội - Cầu Giấy (FPT Tower)',
    locationAddress: 'Số 10 Phạm Văn Bạch, P. Dịch Vọng Hậu, Q. Cầu Giấy, Hà Nội',
    contactPerson: 'Trâm - 093.456.7890',
    salesPerson: 'Chị Ly - 086.709.9978',
    shipperName: 'A Lương',
    totalAmount: 3240000,
    items: [
      { id: '41', sku: 'TTC_DAO', name: 'Trà Đào Hàn Châu 350ml', category: 'TRÀ TRÁI CÂY HÀN CHÂU', unit: 'Chai', quantity: 70, price: 22000, vatRate: 8 },
      { id: '42', sku: 'TTC_VAI', name: 'Trà Vải Hàn Châu 350ml', category: 'TRÀ TRÁI CÂY HÀN CHÂU', unit: 'Chai', quantity: 50, price: 22000, vatRate: 8 },
      { id: '43', sku: 'PC_XOAI', name: 'Panna Cotta Xoài Nhiệt Đới', category: 'PANNA COTTA', unit: 'Hũ', quantity: 40, price: 15000, vatRate: 8 },
    ],
  },
  {
    id: 'ord_5',
    code: 'PGH-09615',
    kind: 'pgh',
    hasTagE: false,
    dateStr: getTodayDateStr(),
    customerName: 'HOÀNG MINH TUẤN',
    locationName: 'Hà Nội - Cầu Giấy (Viettel HQ)',
    locationAddress: 'Lô D26 Khu đô thị mới Cầu Giấy, Hà Nội',
    contactPerson: 'Tuấn - 096.789.0123',
    salesPerson: 'Chị Ly - 086.709.9978',
    shipperName: 'A Lương',
    totalAmount: 3250000,
    items: [
      { id: '51', sku: 'TS_LAI_330', name: 'Trà Sữa Lài Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 60, price: 20000, vatRate: 8 },
      { id: '52', sku: 'TS_MATCHA_330', name: 'Trà Sữa Matcha Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 55, price: 25000, vatRate: 8 },
      { id: '53', sku: 'PC_DAU', name: 'Panna Cotta Dâu Tây', category: 'PANNA COTTA', unit: 'Hũ', quantity: 45, price: 15000, vatRate: 8 },
    ],
  },
  {
    id: 'ord_6',
    code: 'PGH-09614',
    kind: 'pgh',
    hasTagE: false,
    dateStr: getTodayDateStr(),
    customerName: 'YẾN THỨC',
    locationName: 'YẾN THỨC (Cơ sở Yến Thức)',
    locationAddress: 'Tổ 18, Phường Phan Đình Phùng, TP Thái Nguyên',
    contactPerson: 'Chị Yến - 098.123.4567',
    salesPerson: 'Chị Ly - 086.709.9978',
    shipperName: 'A Lương',
    totalAmount: 2560000,
    items: [
      { id: '61', sku: 'CF_MUOI', name: 'Cà Phê Muối Hàn Châu 250ml', category: 'COFFEE', unit: 'Chai', quantity: 50, price: 20000, vatRate: 10 },
      { id: '62', sku: 'CF_BACXIU', name: 'Bạc Xỉu Sữa Tươi Hàn Châu 250ml', category: 'COFFEE', unit: 'Chai', quantity: 45, price: 20000, vatRate: 10 },
      { id: '63', sku: 'TM_CFM', name: 'Cafe Machiato - Hàn Châu', category: 'COFFEE', unit: 'Chai', quantity: 30, price: 22000, vatRate: 10 },
    ],
  },
  {
    id: 'ord_7',
    code: 'PGH-09613',
    kind: 'pgh',
    hasTagE: false,
    dateStr: getTomorrowDateStr(),
    customerName: 'ĐẶNG HOÀNG LONG',
    locationName: 'Hà Nội - Cầu Giấy (Đại Học Quốc Gia)',
    locationAddress: '144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    contactPerson: 'Long - 094.567.8901',
    salesPerson: 'Chị Ly - 086.709.9978',
    shipperName: 'A Lương',
    totalAmount: 2800000,
    items: [
      { id: '71', sku: 'ST_LUC_NHAI', name: 'Lục Trà Nhài Thượng Hạng 350ml', category: 'SPECIAL TEA', unit: 'Chai', quantity: 60, price: 18000, vatRate: 8 },
      { id: '72', sku: 'ST_OLONG_4MUA', name: 'Trà Ô Long Bốn Mùa 350ml', category: 'SPECIAL TEA', unit: 'Chai', quantity: 50, price: 20000, vatRate: 8 },
      { id: '73', sku: 'TG_MATONG', name: 'Trà Gừng Mật Ong Hàn Châu 250ml', category: 'TRÀ GỪNG', unit: 'Chai', quantity: 40, price: 18000, vatRate: 8 },
    ],
  },
  {
    id: 'ord_8',
    code: 'PGH-09612',
    kind: 'pgh',
    hasTagE: false,
    dateStr: getTomorrowDateStr(),
    customerName: 'PHẠM THỊ MAI',
    locationName: 'Hà Nội - Nam Từ Liêm (Keangnam)',
    locationAddress: 'Phạm Hùng, Mễ Trì, Nam Từ Liêm, Hà Nội',
    contactPerson: 'Mai - 092.345.6789',
    salesPerson: 'Chị Ly - 086.709.9978',
    shipperName: 'A Lương',
    totalAmount: 2660000,
    items: [
      { id: '81', sku: 'TS_NUONG_330', name: 'Trà Sữa Nướng Hàn Châu 330ml', category: 'TRÀ SỮA 330ML', unit: 'Chai', quantity: 50, price: 22000, vatRate: 8 },
      { id: '82', sku: 'TTC_DAU', name: 'Trà Dâu Tây Hàn Châu 350ml', category: 'TRÀ TRÁI CÂY HÀN CHÂU', unit: 'Chai', quantity: 40, price: 25000, vatRate: 8 },
      { id: '83', sku: 'PC_VIETQUAT', name: 'Panna Cotta Việt Quất', category: 'PANNA COTTA', unit: 'Hũ', quantity: 35, price: 16000, vatRate: 8 },
    ],
  },
  {
    id: 'ord_pxk_1',
    code: 'PXK-01928',
    kind: 'pxk',
    hasTagE: false,
    dateStr: getTodayDateStr(),
    customerName: 'KHO TỔNG VIỆT THẮNG FOOD',
    locationName: 'Kho trung tâm Ngọc Thụy - Long Biên',
    locationAddress: 'Số 215 ngõ 264 Ngọc Thụy, P. Ngọc Thụy, Long Biên, Hà Nội',
    contactPerson: 'Kho Vận - 086.709.9978',
    salesPerson: 'Chị Ly',
    shipperName: 'Xe xưởng 01 (A Nam)',
    totalAmount: 13700000,
    items: [
      { id: 'px1', sku: 'GP_HONGTRA_5L', name: 'Cốt Hồng Trà Đậm Vị (Can 5L)', category: 'GIẢI PHÁP PHA CHẾ 5T', unit: 'Can', quantity: 30, price: 185000, vatRate: 8 },
      { id: 'px2', sku: 'GP_TSNUONG_5L', name: 'Cốt Trà Sữa Nướng Đậm Đà (Can 5L)', category: 'GIẢI PHÁP PHA CHẾ 5T', unit: 'Can', quantity: 25, price: 210000, vatRate: 8 },
      { id: 'px3', sku: 'GP_DUONGDEN_2L', name: 'Sốt Đường Đen Hàn Quốc (Can 2L)', category: 'GIẢI PHÁP PHA CHẾ 5T', unit: 'Can', quantity: 20, price: 145000, vatRate: 8 },
    ],
  },
];

export const DeliverySlipListPage: React.FC = () => {
  const navigate = useNavigate();

  // Dữ liệu đơn hàng đã duyệt (nạp từ INITIAL_APPROVED_ORDERS, các đơn vừa duyệt từ Approval và các đơn đã chỉnh sửa)
  const [orders, setOrders] = useState<ApprovedOrderRecord[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('vietthang_edited_orders') || '{}');
      const newlyApproved: ApprovedOrderRecord[] = JSON.parse(
        localStorage.getItem('vietthang_approved_orders') || '[]'
      );
      const baseOrders = INITIAL_APPROVED_ORDERS.map((o) => stored[o.id] || stored[o.code] || o);
      const combined = [
        ...newlyApproved.map((o) => {
          const item = stored[o.id] || stored[o.code] || o;
          return { ...item, code: (item.code || '').replace('20261110-', '') };
        }),
        ...baseOrders,
      ];
      const seen = new Set<string>();
      return combined.filter((o) => {
        const key = o.id || o.code;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch {
      return INITIAL_APPROVED_ORDERS;
    }
  });

  // Tự động đồng bộ các đơn đã duyệt và các đơn đã chỉnh sửa
  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('vietthang_edited_orders') || '{}');
      const newlyApproved: ApprovedOrderRecord[] = JSON.parse(
        localStorage.getItem('vietthang_approved_orders') || '[]'
      );
      setOrders((prev) => {
        const combined = [
          ...newlyApproved.map((o) => {
            const item = stored[o.id] || stored[o.code] || o;
            return { ...item, code: (item.code || '').replace('20261110-', '') };
          }),
          ...prev,
        ];
        const seen = new Set<string>();
        return combined.filter((o) => {
          const key = o.id || o.code;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Bộ lọc
  const [selectedDayTab, setSelectedDayTab] = useState<'today' | 'tomorrow' | null>('today');
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterShipper, setFilterShipper] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Bộ chọn ngày chuẩn giống các trang khác (mặc định hôm nay theo hệ thống)
  const [dateRange, setDateRange] = useState<DateRangePickerValue>(() => {
    const today = getSystemToday();
    return {
      from: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
      to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
    };
  });

  // Checkbox chọn đơn
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Modal xem phiếu giao hàng
  const [viewingSlipData, setViewingSlipData] = useState<DeliverySlipData | null>(null);
  const [viewingBatchSlipData, setViewingBatchSlipData] = useState<DeliverySlipData[] | null>(null);
  const [autoPrintSlip, setAutoPrintSlip] = useState(false);

  // Modal xem đơn bếp (Tổng lượng hàng cần sản xuất)
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [kitchenModalOrders, setKitchenModalOrders] = useState<ApprovedOrderRecord[] | null>(null);

  // Modal xác nhận xóa đơn
  const [deletingOrder, setDeletingOrder] = useState<ApprovedOrderRecord | null>(null);

  // Modal xác nhận tạo thêm PXK nếu đơn đã có PXK
  const [confirmingPXK, setConfirmingPXK] = useState<{
    order: ApprovedOrderRecord;
    existingCodes: string;
  } | null>(null);

  // Thông báo phản hồi toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hover đồng bộ cả 2 dòng của 1 đơn hàng (tránh bị hover 2 lần)
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);

  // Search nhanh trong popup dropdown khách hàng & địa điểm (giống các trang khác)
  const [customerSearch, setCustomerSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  const filteredCustomersList = useMemo(() => {
    return DEFAULT_CUSTOMERS.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.location.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customerSearch]);

  const filteredLocationsList = useMemo(() => {
    return DEFAULT_LOCATIONS.filter(
      (l) =>
        l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        l.note.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [locationSearch]);

  // Style đồng bộ Select MUI chuẩn giống các trang: không bôi đậm, font to lên 1 nấc
  const commonSelectSx = {
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    fontSize: '13.5px', // Chữ to lên 1 nấc
    fontWeight: 400, // Không bôi đậm
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
    '& .MuiSelect-select': {
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
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
            fontSize: '13.5px',
            fontWeight: 400,
            py: 1,
            px: 2,
            '&:hover': {
              backgroundColor: '#f1f5f9',
            },
            '&.Mui-selected': {
              backgroundColor: '#dbe4f9 !important',
              fontWeight: 600,
              color: '#1e3a8a',
            },
          },
        },
      },
    },
  };

  // Xử lý chọn tuần (theo ngày hệ thống thực tế)
  const handleSelectWeekPreset = (weekId: string) => {
    setSelectedWeek(weekId);
    setSelectedDayTab(null);
    const base = getSystemToday();
    let offsetWeeks = 0;
    if (weekId === 'week_4_ago') offsetWeeks = -4;
    else if (weekId === 'week_3_ago') offsetWeeks = -3;
    else if (weekId === 'week_2_ago') offsetWeeks = -2;
    else if (weekId === 'last_week') offsetWeeks = -1;
    else if (weekId === 'this_week') offsetWeeks = 0;
    else if (weekId === 'next_week') offsetWeeks = 1;

    const dayOfWeek = base.getDay() || 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek + 1 + offsetWeeks * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    setDateRange({ from: monday, to: sunday });
  };

  // Xử lý nút toggle Hôm nay / Ngày mai (theo ngày hệ thống thực tế)
  const handleToggleDay = (tab: 'today' | 'tomorrow') => {
    setSelectedDayTab(tab);
    setSelectedWeek(null);
    const target = getSystemToday();
    if (tab === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    }
    setDateRange({
      from: new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0),
      to: new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59),
    });
  };

  // 1. Thao tác XÓA đơn (có popup xác nhận)
  const handleConfirmDelete = () => {
    if (!deletingOrder) return;
    setOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id));
    setToastMessage(`Đã xóa đơn ${deletingOrder.code} (${deletingOrder.customerName}) thành công!`);
    setDeletingOrder(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 3. Thao tác COPY đơn: sang trang /orders/add để tạo phiếu có sản phẩm giống hệt
  const handleCopyOrderTomorrow = (order: ApprovedOrderRecord) => {
    navigate('/orders/add', {
      state: {
        copyOrder: order,
        from: 'list',
      },
    });
  };

  // 4. Thao tác TẠO PXK từ phiếu
  // PXK sẽ giống nó nhưng khác background xanh lá nhạt, mã PXK, ghi nhận công nợ (PGH thì không), không có chữ E
  // Yêu cầu: PXK tạo ngay dưới phiếu giao hàng; nếu đã có PXK thì hỏi người dùng có muốn tạo thêm.
  const executeCreatePXK = (order: ApprovedOrderRecord) => {
    // Tìm các PXK đã có của phiếu giao hàng này
    const existingPXKs = orders.filter(
      (o) =>
        (o.kind === 'pxk' || o.code.startsWith('PXK')) &&
        (o.parentCode === order.code || o.code.startsWith(order.code.replace('PGH', 'PXK')))
    );

    let pxkCode = order.code.replace('PGH', 'PXK');
    if (existingPXKs.length > 0) {
      pxkCode = `${order.code.replace('PGH', 'PXK')}-${existingPXKs.length + 1}`;
    }

    const newOrder: ApprovedOrderRecord = {
      ...order,
      id: `ord_pxk_${Date.now()}`,
      code: pxkCode,
      parentCode: order.code,
      kind: 'pxk',
      hasTagE: false, // PXK không cần chữ E
      items: order.items.map((it) => ({ ...it })),
    };

    setOrders((prev) => {
      const targetIdx = prev.findIndex((o) => o.id === order.id);
      if (targetIdx !== -1) {
        // Chèn ngay dưới phiếu giao hàng (hoặc sau các PXK đã có của phiếu đó)
        let insertIdx = targetIdx + 1;
        while (
          insertIdx < prev.length &&
          (prev[insertIdx].kind === 'pxk' || prev[insertIdx].code.startsWith('PXK')) &&
          (prev[insertIdx].parentCode === order.code || prev[insertIdx].code.startsWith(order.code.replace('PGH', 'PXK')))
        ) {
          insertIdx++;
        }
        const nextOrders = [...prev];
        nextOrders.splice(insertIdx, 0, newOrder);
        return nextOrders;
      }
      return [newOrder, ...prev];
    });

    setToastMessage(`Đã tạo Phiếu xuất kho ${pxkCode} (Ghi nhận công nợ) ngay dưới ${order.code}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRequestCreatePXK = (order: ApprovedOrderRecord) => {
    const existingPXKs = orders.filter(
      (o) =>
        (o.kind === 'pxk' || o.code.startsWith('PXK')) &&
        (o.parentCode === order.code || o.code.startsWith(order.code.replace('PGH', 'PXK')))
    );

    if (existingPXKs.length > 0) {
      setConfirmingPXK({
        order,
        existingCodes: existingPXKs.map((p) => p.code).join(', '),
      });
    } else {
      executeCreatePXK(order);
    }
  };

  // Lọc danh sách theo các tiêu chí
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Lọc theo Loại phiếu (PGH hoặc PXK)
      if (filterType === 'pgh') {
        const isPGH = o.kind === 'pgh' || o.code.startsWith('PGH');
        if (!isPGH) return false;
      } else if (filterType === 'pxk') {
        const isPXK = o.kind === 'pxk' || o.code.startsWith('PXK');
        if (!isPXK) return false;
      }

      // 2. Lọc theo Khoảng ngày (Hỗ trợ chuẩn DD/MM/YYYY, YYYY-MM-DD, ISO)
      if (dateRange.from && dateRange.to) {
        const ordDate = parseOrderDate(o.dateStr);
        if (ordDate) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (ordDate < fromDate || ordDate > toDate) {
            return false;
          }
        }
      }

      // 3. Lọc theo Khu vực
      if (filterRegion === 'hn') {
        if (!o.locationAddress.toLowerCase().includes('hà nội')) return false;
      } else if (filterRegion === 'tn') {
        if (!o.locationAddress.toLowerCase().includes('thái nguyên')) return false;
      }

      // 4. Lọc theo Khách hàng
      if (filterCustomer && !o.customerName.toLowerCase().includes(filterCustomer.toLowerCase())) {
        return false;
      }

      // 5. Lọc theo Địa điểm
      if (filterLocation && !o.locationName.toLowerCase().includes(filterLocation.toLowerCase())) {
        return false;
      }

      // 6. Lọc theo Shipper
      if (filterShipper && o.shipperName) {
        const foundShip = DEFAULT_SHIPPING_METHODS.find((s) => s.id === filterShipper);
        if (foundShip && !o.shipperName.toLowerCase().includes(foundShip.label.toLowerCase())) {
          return false;
        }
      }

      // 7. Lọc theo từ khóa tìm kiếm chạy dài (Mã đơn, khách hàng, địa điểm, sản phẩm...)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const matchCode = o.code.toLowerCase().includes(kw);
        const matchCust = o.customerName.toLowerCase().includes(kw);
        const matchLoc =
          o.locationName.toLowerCase().includes(kw) ||
          o.locationAddress.toLowerCase().includes(kw);
        const matchProd = o.items.some(
          (it) =>
            it.name.toLowerCase().includes(kw) ||
            it.sku.toLowerCase().includes(kw)
        );
        if (!matchCode && !matchCust && !matchLoc && !matchProd) return false;
      }
      return true;
    });
  }, [orders, filterType, dateRange, filterRegion, filterCustomer, filterLocation, filterShipper, searchKeyword]);

  // Thống kê tổng hợp số liệu tự động cập nhật theo các phiếu đang lọc/hiển thị
  const totalOrdersCount = filteredOrders.length;
  const pghCount = filteredOrders.filter((o) => o.kind !== 'pxk' && !o.code.startsWith('PXK')).length;
  const pxkCount = filteredOrders.filter((o) => o.kind === 'pxk' || o.code.startsWith('PXK')).length;
  const pghTotalAmountVnd = filteredOrders
    .filter((o) => o.kind !== 'pxk' && !o.code.startsWith('PXK'))
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const pxkTotalAmountVnd = filteredOrders
    .filter((o) => o.kind === 'pxk' || o.code.startsWith('PXK'))
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalAmountVnd = filterType === 'pxk' ? pxkTotalAmountVnd : pghTotalAmountVnd;

  // Đơn được tích chọn & tổng tiền của các đơn được chọn
  const selectedOrders = useMemo(() => {
    return filteredOrders.filter((o) => selectedOrderIds.includes(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const selectedOrdersTotalAmount = useMemo(() => {
    return selectedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }, [selectedOrders]);

  // Tính tổng hợp đơn bếp (Toàn bộ sản phẩm cần sản xuất từ các đơn hàng hoặc từ các đơn đã chọn)
  const kitchenSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        sku: string;
        name: string;
        category: string;
        unit: string;
        totalQty: number;
        orderCount: number;
      }
    >();

    const targetList = kitchenModalOrders && kitchenModalOrders.length > 0 ? kitchenModalOrders : filteredOrders;

    targetList.forEach((o) => {
      o.items.forEach((it) => {
        const key = it.sku || it.name;
        // Yêu cầu: "Xem đơn bếp ở đây là tổng số lượng thực tế đi giao (đã trừ hàng trả)"
        const effectiveQty = Math.max(0, it.quantity - (it.returnedQty || 0));
        if (effectiveQty <= 0) return;

        if (!map.has(key)) {
          map.set(key, {
            sku: it.sku,
            name: it.name,
            category: it.category,
            unit: it.unit,
            totalQty: effectiveQty,
            orderCount: 1,
          });
        } else {
          const item = map.get(key)!;
          item.totalQty += effectiveQty;
          item.orderCount += 1;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [orders, kitchenModalOrders]);

  // Chuyển đổi dữ liệu đơn sang định dạng phiếu in
  const mapOrderRecordToSlipData = (order: ApprovedOrderRecord): DeliverySlipData => ({
    orderCode: order.code,
    createdDate: order.dateStr,
    customerName: `${order.customerName} (${order.locationName})`,
    address: order.locationAddress,
    contactPerson: order.contactPerson,
    salesPerson: order.salesPerson || 'Chị Ly - 086.709.9978',
    shipperName: order.shipperName || 'A Lương',
    note: order.note || (order.code === 'PGH-09619' ? 'Giao trước 6h30 sáng' : ''),
    items: order.items.map((it) => ({
      id: it.id,
      sku: it.sku,
      name: it.name,
      category: it.category,
      unit: it.unit,
      quantity: it.quantity,
      returnedQty: it.returnedQty,
      price: it.price,
      vatRate: it.vatRate,
      note: it.note,
    })),
    subtotal: (order as any).totalBeforeVat !== undefined ? Number((order as any).totalBeforeVat) : undefined,
    vatAmount: (order as any).totalVat !== undefined ? Number((order as any).totalVat) : undefined,
    grandTotal: order.totalAmount,
  });

  // Nút 1: Xem tổng đơn đã chọn (đơn bếp của các đơn được chọn)
  const handleOpenSelectedKitchenSummary = () => {
    if (selectedOrders.length === 0) return;
    setKitchenModalOrders(selectedOrders);
    setIsKitchenModalOpen(true);
  };

  // Nút 2: Tạo phiếu xuất kho PXK hàng loạt cho các đơn đã chọn
  const handleBulkCreatePXK = () => {
    const eligiblePGHs = selectedOrders.filter(
      (o) => o.kind !== 'pxk' && !o.code.startsWith('PXK')
    );
    if (eligiblePGHs.length === 0) {
      setToastMessage('Các đơn bạn chọn đều đã có Phiếu xuất kho (PXK)!');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    eligiblePGHs.forEach((pgh) => {
      executeCreatePXK(pgh);
    });

    setToastMessage(`Đã tạo thành công ${eligiblePGHs.length} Phiếu xuất kho PXK cho các đơn đã chọn!`);
    setTimeout(() => setToastMessage(null), 4000);
    setSelectedOrderIds([]);
  };

  // Nút 3: In các đơn đã chọn (CHỈ IN PHIẾU GIAO HÀNG PGH, BỎ QUA PXK)
  const handlePrintSelectedOrders = () => {
    const pghOrders = selectedOrders.filter(
      (o) => o.kind !== 'pxk' && !o.code.startsWith('PXK')
    );
    if (pghOrders.length === 0) {
      setToastMessage('Chỉ hỗ trợ in Phiếu giao hàng (PGH), các phiếu bạn chọn đều là PXK!');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (pghOrders.length === 1) {
      handleOpenSlip(pghOrders[0], true);
    } else {
      setViewingBatchSlipData(pghOrders.map(mapOrderRecordToSlipData));
      setAutoPrintSlip(true);
    }
  };

  // Nút In all đơn (CHỈ IN PHIẾU GIAO HÀNG PGH, KHÔNG IN PXK)
  const handlePrintAllOrders = () => {
    const pghOrders = filteredOrders.filter(
      (o) => o.kind !== 'pxk' && !o.code.startsWith('PXK')
    );
    if (pghOrders.length === 0) {
      setToastMessage('Không tìm thấy Phiếu giao hàng (PGH) nào để in!');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (pghOrders.length === 1) {
      handleOpenSlip(pghOrders[0], true);
    } else {
      setViewingBatchSlipData(pghOrders.map(mapOrderRecordToSlipData));
      setAutoPrintSlip(true);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((x) => x !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  // Xem & in đơn bằng popup DeliverySlipModal
  const handleOpenSlip = (order: ApprovedOrderRecord, autoPrint = false) => {
    setAutoPrintSlip(autoPrint);
    setViewingSlipData(mapOrderRecordToSlipData(order));
  };

  return (
    <div className="space-y-4 max-w-[1450px] mx-auto pb-16">
      {/* BREADCRUMB VÀ TAB CHUYỂN ĐỔI GIỮA 2 LOẠI DANH SÁCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <span
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Home
          </span>
          <span>/</span>
          <span className="font-bold text-slate-800">QL PHIẾU HÀNG</span>
        </div>

        {/* 2 LOẠI DANH SÁCH RÕ RÀNG */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircleOutlined className="text-emerald-600" />
            <span>Danh sách đơn hàng (Đã duyệt)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/orders/approval')}
            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-semibold hover:bg-white/60 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ClockCircleOutlined className="text-amber-600" />
            <span>Đơn hàng cần duyệt</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              5
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/kitchen/production')}
            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-semibold hover:bg-white/60 transition flex items-center gap-1.5 cursor-pointer"
          >
            <FireOutlined className="text-rose-500" />
            <span>Tổng bếp sản xuất</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO TOAST FEEDBACK */}
      {toastMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span>✓ {toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* THANH BANNER MÀU ĐEN (CHUẨN 100% ẢNH MẪU) */}
      <div className="bg-[#0f172a] text-white rounded-2xl px-5 py-3.5 shadow-md flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap">
        {/* Nhóm bên trái: Icon + Title + Các huy hiệu số liệu */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <AppstoreOutlined className="text-base text-slate-300" />
            <span className="text-sm font-extrabold uppercase tracking-wide">
              PHIẾU HÀNG
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold flex-nowrap">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
              TỔNG {totalOrdersCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-900/60 text-blue-200 border border-blue-700/60">
              PGH {pghCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
              PXK {pxkCount}
            </span>
            <span className="px-3 py-1 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-600/60 font-black">
              {filterType === 'pxk' ? 'DỰ KIẾN (PXK)' : 'DỰ KIẾN (PGH)'} {totalAmountVnd.toLocaleString('vi-VN')} VNĐ
            </span>
          </div>
        </div>

        {/* Nhóm bên phải: Nút Xem đơn bếp, In all đơn & Nút toggle HÔM NAY / NGÀY MAI */}
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {/* NÚT XEM TỔNG ĐƠN HÀNG */}
          <button
            type="button"
            onClick={() => {
              setKitchenModalOrders(null);
              setIsKitchenModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-rose-500/40"
            title="Xem báo cáo tổng hợp lượng hàng cần chuẩn bị (Tổng đơn hàng)"
          >
            <FireOutlined className="text-amber-200" />
            <span>XEM TỔNG ĐƠN HÀNG</span>
          </button>

          {/* NÚT TỔNG BẾP SẢN XUẤT */}
          <button
            type="button"
            onClick={() => navigate('/kitchen/production')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-400/40"
            title="Đến trang Tổng Bếp Sản Xuất (đơn cần SX + bù định mức an toàn)"
          >
            <FireOutlined className="text-yellow-200" />
            <span>TỔNG BẾP</span>
          </button>

          {/* NÚT IN ALL ĐƠN */}
          <button
            type="button"
            onClick={handlePrintAllOrders}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-500/40"
            title="In tất cả các đơn hàng đang hiển thị"
          >
            <PrinterOutlined className="text-white" />
            <span>IN ALL ĐƠN</span>
          </button>

          {/* Nút toggle HÔM NAY / NGÀY MAI */}
          <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs font-bold">
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

      {/* KHỐI BỘ LỌC ĐA NĂNG (GIAO DIỆN CHUẨN CÁC TRANG, KHÔNG BÔI ĐẬM, FONT TO LÊN 1 NẤC) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
        {/* HÀNG 1: Loại phiếu (PGH / PXK), Date range chuẩn, Chọn khu vực */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                displayEmpty
                renderValue={(val) => {
                  if (val === 'pgh') return <span className="font-normal text-slate-800">Phiếu giao hàng (PGH)</span>;
                  if (val === 'pxk') return <span className="font-normal text-slate-800">Phiếu xuất kho (PXK)</span>;
                  return <span className="text-slate-600 font-normal">Chọn loại phiếu (Tất cả)</span>;
                }}
                sx={commonSelectSx}
                MenuProps={commonMenuProps}
              >
                <MenuItem value="all">
                  <span className="font-normal">Chọn loại phiếu (Tất cả)</span>
                </MenuItem>
                <MenuItem value="pgh">
                  <span className="font-normal">Phiếu giao hàng (PGH)</span>
                </MenuItem>
                <MenuItem value="pxk">
                  <span className="font-normal">Phiếu xuất kho (PXK)</span>
                </MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Ô Chọn ngày chuẩn DateRangePicker giống các trang */}
          <div className="w-full">
            <DateRangePicker
              value={dateRange}
              onChange={(val) => {
                setDateRange(val);
                setSelectedWeek(null);
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

          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                displayEmpty
                renderValue={(val) => {
                  if (val === 'hn') return <span className="font-normal text-slate-800">Hà Nội</span>;
                  if (val === 'tn') return <span className="font-normal text-slate-800">Thái Nguyên</span>;
                  return <span className="text-slate-600 font-normal">Chọn khu vực (Tất cả)</span>;
                }}
                sx={commonSelectSx}
                MenuProps={commonMenuProps}
              >
                <MenuItem value="">
                  <span className="font-normal">Chọn khu vực (Tất cả)</span>
                </MenuItem>
                <MenuItem value="hn">
                  <span className="font-normal">Hà Nội</span>
                </MenuItem>
                <MenuItem value="tn">
                  <span className="font-normal">Thái Nguyên</span>
                </MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        {/* HÀNG 2: Chọn khách hàng (có search), Chọn địa điểm (có search), Chọn ship */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ô Khách hàng có search nhanh chuẩn ảnh 2 */}
          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                onClose={() => setCustomerSearch('')}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <span className="text-slate-600 font-normal flex items-center gap-1.5">
                        <UserOutlined className="text-slate-400" />
                        <span>Chọn khách hàng (Tất cả)</span>
                      </span>
                    );
                  }
                  const found = DEFAULT_CUSTOMERS.find((c) => c.name === selected || c.id === selected);
                  return (
                    <span className="font-normal text-slate-800 truncate flex items-center gap-1.5">
                      <UserOutlined className="text-slate-400" />
                      <span>{found ? `${found.name} (${found.location})` : selected}</span>
                    </span>
                  );
                }}
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
                      className="w-full pl-8 pr-7 py-1.5 text-xs font-normal rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-2xs"
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
                  <em className="text-slate-400 font-normal">Tất cả khách hàng</em>
                </MenuItem>

                {filteredCustomersList.length > 0 ? (
                  filteredCustomersList.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      <span className="font-normal text-slate-800">{c.name}</span>
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

          {/* Ô Địa điểm có search nhanh */}
          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                onClose={() => setLocationSearch('')}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <span className="text-slate-600 font-normal flex items-center gap-1.5">
                        <EnvironmentOutlined className="text-slate-400" />
                        <span>Chọn địa điểm (Tất cả)</span>
                      </span>
                    );
                  }
                  const found = DEFAULT_LOCATIONS.find((l) => l.name === selected || l.id === selected);
                  return (
                    <span className="font-normal text-slate-800 truncate flex items-center gap-1.5">
                      <EnvironmentOutlined className="text-slate-400" />
                      <span>{found ? `${found.name} (${found.note})` : selected}</span>
                    </span>
                  );
                }}
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
                      placeholder="Tìm nhanh địa điểm..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs font-normal rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-2xs"
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
                  <em className="text-slate-400 font-normal">Tất cả địa điểm</em>
                </MenuItem>

                {filteredLocationsList.length > 0 ? (
                  filteredLocationsList.map((l) => (
                    <MenuItem key={l.id} value={l.name}>
                      <span className="font-normal text-slate-800">{l.name}</span>
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

          {/* Ô Chọn Ship */}
          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={filterShipper}
                onChange={(e) => setFilterShipper(e.target.value)}
                displayEmpty
                renderValue={(val) => {
                  const found = DEFAULT_SHIPPING_METHODS.find((s) => s.id === val);
                  if (found) {
                    return (
                      <span className="font-normal text-slate-800 truncate flex items-center gap-1.5">
                        <CarOutlined className="text-slate-400" />
                        <span>{found.label}</span>
                      </span>
                    );
                  }
                  return (
                    <span className="text-slate-600 font-normal flex items-center gap-1.5">
                      <CarOutlined className="text-slate-400" />
                      <span>Chọn ship (Tất cả)</span>
                    </span>
                  );
                }}
                sx={commonSelectSx}
                MenuProps={commonMenuProps}
              >
                <MenuItem value="">
                  <em className="text-slate-400 font-normal">Chọn ship (Tất cả)</em>
                </MenuItem>
                {DEFAULT_SHIPPING_METHODS.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    <span className="font-normal text-slate-800">{s.label}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* HÀNG 3: DẢI NÚT TUẦN (CHỮ ĐẬM FONT-BOLD THEO YÊU CẦU) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-[13px] sm:text-[13.5px] font-bold text-center">
          {[
            { id: 'week_4_ago', label: '4 TUẦN TRƯỚC' },
            { id: 'week_3_ago', label: '3 TUẦN TRƯỚC' },
            { id: 'week_2_ago', label: '2 TUẦN TRƯỚC' },
            { id: 'last_week', label: 'TUẦN TRƯỚC' },
            { id: 'this_week', label: 'TUẦN NÀY' },
            { id: 'next_week', label: 'TUẦN TỚI' },
          ].map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => handleSelectWeekPreset(w.id)}
              className={`py-2 rounded-xl transition cursor-pointer border font-bold ${
                selectedWeek === w.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* HÀNG 4: THANH TÌM KIẾM CHẠY DÀI TOÀN BỘ (FULL WIDTH) CHO NHANH */}
        <div className="pt-1">
          <div className="relative">
            <SearchOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm nhanh theo mã đơn, khách hàng, địa điểm, tên sản phẩm..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full h-11 pl-11 pr-10 text-[13.5px] font-normal rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none transition shadow-2xs"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BẢNG DANH SÁCH ĐƠN HÀNG ĐÃ DUYỆT (TABLE) */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3.5 w-44 text-center">THAO TÁC</th>
                <th className="px-4 py-3.5 w-36">MÃ</th>
                <th className="px-3 py-3.5 w-24">NGÀY</th>
                <th className="px-4 py-3.5 min-w-[200px]">KHÁCH HÀNG</th>
                <th className="px-4 py-3.5 min-w-[220px]">ĐỊA ĐIỂM</th>
                <th className="px-4 py-3.5 w-32 text-right">TỔNG</th>
                <th className="px-3 py-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredOrders.length > 0 &&
                      selectedOrderIds.length === filteredOrders.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  const isPXK = ord.kind === 'pxk' || ord.code.startsWith('PXK');
                  const isHovered = hoveredOrderId === ord.id;

                  return (
                    <React.Fragment key={ord.id}>
                      {/* DÒNG 1: THÔNG TIN CHÍNH (Bấm vào ngoài các nút để in phiếu ngay cho nhanh) */}
                      <tr
                        onClick={() => handleOpenSlip(ord, true)}
                        onMouseEnter={() => setHoveredOrderId(ord.id)}
                        onMouseLeave={() => setHoveredOrderId(null)}
                        className={`transition-colors duration-150 cursor-pointer ${
                          isChecked
                            ? (isPXK ? 'bg-[#d1fae5] border-l-4 border-l-emerald-600' : 'bg-blue-50/80 border-l-4 border-l-blue-600')
                            : (isPXK
                                ? `${isHovered ? 'bg-[#d1fae5]' : 'bg-[#ecfdf5]'} border-l-4 border-l-emerald-500`
                                : `${isHovered ? 'bg-slate-50' : 'bg-white'}`)
                        }`}
                        title="Bấm vào để in phiếu ngay"
                      >
                        {/* Cột 1: Thao tác (chặn click lan truyền ra tr) */}
                        <td
                          rowSpan={2}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-3 align-middle text-center w-44 border-b border-slate-100 cursor-default"
                        >
                          <div className="flex items-center gap-2 justify-center">
                            {/* 1. NÚT XÓA */}
                            <button
                              type="button"
                              onClick={() => setDeletingOrder(ord)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Xóa phiếu (có popup xác nhận)"
                            >
                              <DeleteOutlined className="text-sm" />
                            </button>

                            {/* 2. NÚT SỬA (chuyển vào giao diện trang Tạo/Sửa đơn hàng) */}
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/orders/edit/${ord.id}`, {
                                  state: { order: ord, from: 'list' },
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="Sửa phiếu (Vào giao diện tạo đơn hàng)"
                            >
                              <EditOutlined className="text-sm" />
                            </button>

                            {/* 3. NÚT COPY */}
                            <button
                              type="button"
                              onClick={() => handleCopyOrderTomorrow(ord)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                              title="Sao chép đơn sang trang tạo phiếu"
                            >
                              <CopyOutlined className="text-sm" />
                            </button>

                            {/* 4. NÚT XEM ĐƠN (CHỈ XEM KHÔNG TỰ ĐỘNG IN) */}
                            <button
                              type="button"
                              onClick={() => handleOpenSlip(ord, false)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              title="Xem trước phiếu giao hàng"
                            >
                              <EyeOutlined className="text-sm" />
                            </button>

                            {/* 5. NÚT TẠO PXK (CHỈ HIỂN THỊ ICON ĐỒNG BỘ CÙNG HÀNG, KHÔNG VIỀN) */}
                            {!isPXK ? (
                              <button
                                type="button"
                                onClick={() => handleRequestCreatePXK(ord)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                title="Tạo Phiếu xuất kho PXK"
                              >
                                <FileDoneOutlined className="text-sm" />
                              </button>
                            ) : null}
                          </div>
                        </td>

                        {/* Cột 2: Mã PGH / PXK */}
                        <td className="px-4 pt-3 pb-1 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-black tracking-wide text-sm ${
                                isPXK ? 'text-emerald-700 font-mono' : 'text-slate-900'
                              }`}
                            >
                              {ord.code}
                            </span>

                            {ord.hasTagE && !isPXK && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-200">
                                E
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cột 3: Ngày */}
                        <td className="px-3 pt-3 pb-1 align-top font-semibold text-slate-700 whitespace-nowrap text-xs">
                          {formatDisplayDate(ord.dateStr)}
                        </td>

                        {/* Cột 4: Khách hàng (CHỮ TO LÊN) */}
                        <td className="px-4 pt-3 pb-1 align-top">
                          <div className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                            {ord.customerName}
                          </div>
                        </td>

                        {/* Cột 5: Địa điểm (CHỮ TO LÊN) */}
                        <td className="px-4 pt-3 pb-1 align-top">
                          <div className="text-sm font-bold text-slate-900">
                            {ord.locationName}
                          </div>
                          {ord.locationAddress && (
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                              {ord.locationAddress}
                            </div>
                          )}
                        </td>

                        {/* Cột 6: Tổng tiền */}
                        <td className="px-4 pt-3 pb-1 align-top text-right font-black text-sm text-slate-900 whitespace-nowrap">
                          {ord.totalAmount.toLocaleString('vi-VN')}
                        </td>

                        {/* Cột 7: Checkbox (chặn click lan truyền ra tr) */}
                        <td
                          rowSpan={2}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-3 align-middle text-center border-b border-slate-100 cursor-default"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(ord.id)}
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                      </tr>

                      {/* DÒNG 2: SẢN PHẨM (Bấm vào cũng in phiếu ngay cho nhanh) */}
                      <tr
                        onClick={() => handleOpenSlip(ord, true)}
                        onMouseEnter={() => setHoveredOrderId(ord.id)}
                        onMouseLeave={() => setHoveredOrderId(null)}
                        className={`transition-colors duration-150 border-b border-slate-100 cursor-pointer ${
                          isChecked
                            ? (isPXK ? 'bg-[#d1fae5] border-l-4 border-l-emerald-600' : 'bg-blue-50/80 border-l-4 border-l-blue-600')
                            : (isPXK
                                ? `${isHovered ? 'bg-[#d1fae5]' : 'bg-[#ecfdf5]'} border-l-4 border-l-emerald-500`
                                : `${isHovered ? 'bg-slate-50' : 'bg-white'}`)
                        }`}
                        title="Bấm vào để in phiếu ngay"
                      >
                        <td
                          colSpan={5}
                          className="px-4 pb-3 pt-0 text-[11px] text-slate-500 font-normal leading-relaxed border-b border-slate-100"
                        >
                          {ord.items
                            .map((it) => `${it.name} x${it.quantity}${it.returnedQty ? ` (Trả ${it.returnedQty})` : ''} ${it.unit}`)
                            .join(' · ')}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Không tìm thấy phiếu nào phù hợp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP 1: XÁC NHẬN XÓA ĐƠN HÀNG */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xl font-bold">
              <ExclamationCircleOutlined />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận xóa phiếu {deletingOrder.code}?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa phiếu của khách hàng{' '}
                <strong>{deletingOrder.customerName}</strong> ({deletingOrder.locationName})? Thao tác này sẽ loại bỏ phiếu khỏi danh sách.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP XÁC NHẬN TẠO THÊM PXK NẾU ĐÃ CÓ PXK */}
      {confirmingPXK && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xl font-bold">
              <ExclamationCircleOutlined />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Phiếu đã có Phiếu xuất kho
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Phiếu giao hàng <strong>{confirmingPXK.order.code}</strong> đã có{' '}
                <strong className="text-emerald-700">{confirmingPXK.existingCodes}</strong> được tạo trước đó.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn tạo thêm một Phiếu xuất kho nữa cho phiếu này không?
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmingPXK(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = confirmingPXK.order;
                  setConfirmingPXK(null);
                  executeCreatePXK(target);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <FileDoneOutlined />
                <span>Tạo thêm PXK</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 3: XEM ĐƠN BẾP (LƯỢNG HÀNG TỔNG BẾP CẦN SẢN XUẤT - GIAO DIỆN BẢNG FULL + IN A4) */}
      <KitchenReportModal
        isOpen={isKitchenModalOpen}
        onClose={() => setIsKitchenModalOpen(false)}
        items={kitchenSummary}
        title="TỔNG HỢP SỐ LƯỢNG THỰC TẾ ĐI GIAO (TỔNG ĐƠN HÀNG)"
        subtitle="Tổng số lượng hàng hóa thực tế cần chuẩn bị đi giao từ các phiếu giao hàng đã duyệt (đã trừ hàng trả)"
        reportDate={getTodayDateStr()}
        deliveryDate={`Hôm nay (${getTodayDateStr()})`}
        totalOrdersCount={filteredOrders.filter(o => o.kind !== 'pxk' && !o.code.startsWith('PXK')).length}
      />

      {/* THANH THAO TÁC HÀNG LOẠT KHI TÍCH CHỌN ĐƠN HÀNG (FLOATING ACTION BAR - GÓC PHẢI 1 DÒNG NHỎ) */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-5 right-6 z-40 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700/80 animate-in fade-in slide-in-from-bottom-3 duration-200 whitespace-nowrap flex-nowrap">
          <div className="flex items-center gap-1.5 border-r border-slate-700/80 pr-2.5 text-xs">
            <span className="text-slate-300">Đã chọn:</span>
            <span className="font-bold text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded text-xs">
              {selectedOrderIds.length} đơn
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">Tổng:</span>
            <span className="font-bold text-emerald-400 text-xs">
              {selectedOrdersTotalAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-nowrap">
            {/* 1. XEM TỔNG ĐƠN ĐÃ CHỌN (ĐƠN BẾP) */}
            <button
              type="button"
              onClick={handleOpenSelectedKitchenSummary}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-600 shadow-2xs"
              title="Xem tổng hợp sản phẩm của các đơn đã chọn"
            >
              <ShoppingOutlined className="text-amber-400 text-xs" />
              <span>Xem tổng đơn</span>
            </button>

            {/* 2. TẠO PHIẾU XUẤT KHO */}
            <button
              type="button"
              onClick={handleBulkCreatePXK}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Tạo phiếu xuất kho cho các đơn giao hàng đã chọn"
            >
              <FileDoneOutlined className="text-xs" />
              <span>Tạo PXK</span>
            </button>

            {/* 3. IN CÁC ĐƠN ĐÃ CHỌN */}
            <button
              type="button"
              onClick={handlePrintSelectedOrders}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="In tất cả các phiếu giao hàng đã chọn"
            >
              <PrinterOutlined className="text-xs" />
              <span>In đã chọn</span>
            </button>

            {/* 4. NÚT ĐÓNG / BỎ CHỌN */}
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs font-bold"
              title="Bỏ chọn tất cả"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* POPUP 4: XEM & IN CHI TIẾT PHIẾU GIAO HÀNG (FULL MÀN HÌNH CHUẨN) */}
      <DeliverySlipModal
        isOpen={!!viewingSlipData || !!viewingBatchSlipData}
        onClose={() => {
          setViewingSlipData(null);
          setViewingBatchSlipData(null);
          setAutoPrintSlip(false);
        }}
        order={viewingSlipData}
        batchOrders={viewingBatchSlipData || undefined}
        autoPrint={autoPrintSlip}
      />
    </div>
  );
};
