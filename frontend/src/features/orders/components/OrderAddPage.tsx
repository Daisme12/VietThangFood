import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  PlusCircleOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EyeOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
import {
  OperationalFilterBar,
  DEFAULT_LOCATIONS,
  DEFAULT_CUSTOMERS,
  DEFAULT_SHIPPING_METHODS,
} from '../../../components/ui/OperationalFilterBar';
import { DateRangePickerValue } from '../../../components/ui/DateRangePicker';
import { convertNumberToVietnameseWords, getSystemToday, getTodayDateStr } from '../../../lib/formatters';
import {
  DeliverySlipModal,
  DeliverySlipData,
} from './DeliverySlipModal';

export interface ProductMaster {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  stock: number;
  price: number;
  vatRate: number; // Mặc định % VAT của sản phẩm (ví dụ 8%, 10%)
}

export interface SelectedProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number;
  returnedQty?: number;
  price: number;
  vatRate: number;
}

const formatMoneyNoUnit = (amount: number): string => {
  return Math.round(amount).toLocaleString('vi-VN').replace(/\./g, ' ');
};

export const MILK_TEA_CATEGORIES = [
  'Tất cả',
  'TRÀ SỮA 330ML',
  'DÒNG GIÁ TỐT 250ML',
  'TRÀ TRÁI CÂY HÀN CHÂU',
  'PANNA COTTA',
  'COFFEE',
  'GIẢI PHÁP PHA CHẾ 5T',
  'SPECIAL TEA',
  'TRÀ GỪNG',
];

const MASTER_PRODUCTS: ProductMaster[] = [
  // 1. TRÀ SỮA 330ML (Dòng chai Green Tea - Hàn Châu chuẩn mẫu)
  {
    id: 'p_ts_nuong_330',
    name: 'Trà Sữa Nướng Hàn Châu 330ml',
    sku: 'TS_NUONG_330',
    category: 'TRÀ SỮA 330ML',
    unit: 'Chai',
    stock: 150,
    price: 22000,
    vatRate: 8,
  },
  {
    id: 'p_ts_hong_330',
    name: 'Hồng Trà Sữa Hàn Châu 330ml',
    sku: 'TS_HONG_330',
    category: 'TRÀ SỮA 330ML',
    unit: 'Chai',
    stock: 120,
    price: 20000,
    vatRate: 8,
  },
  {
    id: 'p_ts_thaix_330',
    name: 'Trà Sữa Thái Xanh Hàn Châu 330ml',
    sku: 'TS_THAIX_330',
    category: 'TRÀ SỮA 330ML',
    unit: 'Chai',
    stock: 90,
    price: 20000,
    vatRate: 8,
  },
  {
    id: 'p_ts_olong_330',
    name: 'Trà Sữa Ô Long Hàn Châu 330ml',
    sku: 'TS_OLONG_330',
    category: 'TRÀ SỮA 330ML',
    unit: 'Chai',
    stock: 85,
    price: 22000,
    vatRate: 8,
  },
  {
    id: 'p_ts_lai_330',
    name: 'Trà Sữa Lài Hàn Châu 330ml',
    sku: 'TS_LAI_330',
    category: 'TRÀ SỮA 330ML',
    unit: 'Chai',
    stock: 70,
    price: 20000,
    vatRate: 8,
  },
  {
    id: 'p_ts_matcha_330',
    name: 'Trà Sữa Matcha Hàn Châu 330ml',
    sku: 'TS_MATCHA_330',
    category: 'TRÀ SỮA 330ML',
    unit: 'Chai',
    stock: 65,
    price: 25000,
    vatRate: 8,
  },

  // 2. DÒNG GIÁ TỐT 250ML
  {
    id: 'p_ts_tt_250',
    name: 'Trà Sữa Truyền Thống 250ml',
    sku: 'TS_TT_250',
    category: 'DÒNG GIÁ TỐT 250ML',
    unit: 'Chai',
    stock: 180,
    price: 15000,
    vatRate: 8,
  },
  {
    id: 'p_ts_nuong_250',
    name: 'Trà Sữa Nướng 250ml',
    sku: 'TS_NUONG_250',
    category: 'DÒNG GIÁ TỐT 250ML',
    unit: 'Chai',
    stock: 130,
    price: 16000,
    vatRate: 8,
  },
  {
    id: 'p_ts_matcha_250',
    name: 'Trà Sữa Matcha 250ml',
    sku: 'TS_MATCHA_250',
    category: 'DÒNG GIÁ TỐT 250ML',
    unit: 'Chai',
    stock: 95,
    price: 17000,
    vatRate: 8,
  },
  {
    id: 'p_ts_thaido_250',
    name: 'Trà Sữa Thái Đỏ 250ml',
    sku: 'TS_THAIDO_250',
    category: 'DÒNG GIÁ TỐT 250ML',
    unit: 'Chai',
    stock: 80,
    price: 15000,
    vatRate: 8,
  },
  {
    id: 'p_ts_khoai_250',
    name: 'Trà Sữa Khoai Môn 250ml',
    sku: 'TS_KHOAI_250',
    category: 'DÒNG GIÁ TỐT 250ML',
    unit: 'Chai',
    stock: 75,
    price: 16000,
    vatRate: 8,
  },

  // 3. TRÀ TRÁI CÂY HÀN CHÂU
  {
    id: 'p_ttc_dao',
    name: 'Trà Đào Hàn Châu 350ml',
    sku: 'TTC_DAO',
    category: 'TRÀ TRÁI CÂY HÀN CHÂU',
    unit: 'Chai',
    stock: 140,
    price: 22000,
    vatRate: 8,
  },
  {
    id: 'p_ttc_vai',
    name: 'Trà Vải Hàn Châu 350ml',
    sku: 'TTC_VAI',
    category: 'TRÀ TRÁI CÂY HÀN CHÂU',
    unit: 'Chai',
    stock: 90,
    price: 22000,
    vatRate: 8,
  },
  {
    id: 'p_ttc_dau',
    name: 'Trà Dâu Tây Hàn Châu 350ml',
    sku: 'TTC_DAU',
    category: 'TRÀ TRÁI CÂY HÀN CHÂU',
    unit: 'Chai',
    stock: 85,
    price: 25000,
    vatRate: 8,
  },
  {
    id: 'p_ttc_mangcau',
    name: 'Trà Mãng Cầu Hàn Châu 350ml',
    sku: 'TTC_MANGCAU',
    category: 'TRÀ TRÁI CÂY HÀN CHÂU',
    unit: 'Chai',
    stock: 60,
    price: 25000,
    vatRate: 8,
  },
  {
    id: 'p_ttc_oihong',
    name: 'Trà Ổi Hồng Hàn Châu 350ml',
    sku: 'TTC_OIHONG',
    category: 'TRÀ TRÁI CÂY HÀN CHÂU',
    unit: 'Chai',
    stock: 70,
    price: 22000,
    vatRate: 8,
  },
  {
    id: 'p_ttc_chanhleo',
    name: 'Trà Chanh Leo Hàn Châu 350ml',
    sku: 'TTC_CHANHLEO',
    category: 'TRÀ TRÁI CÂY HÀN CHÂU',
    unit: 'Chai',
    stock: 95,
    price: 20000,
    vatRate: 8,
  },

  // 4. PANNA COTTA
  {
    id: 'p_pc_dau',
    name: 'Panna Cotta Dâu Tây',
    sku: 'PC_DAU',
    category: 'PANNA COTTA',
    unit: 'Hũ',
    stock: 110,
    price: 15000,
    vatRate: 8,
  },
  {
    id: 'p_pc_xoai',
    name: 'Panna Cotta Xoài Nhiệt Đới',
    sku: 'PC_XOAI',
    category: 'PANNA COTTA',
    unit: 'Hũ',
    stock: 85,
    price: 15000,
    vatRate: 8,
  },
  {
    id: 'p_pc_vietquat',
    name: 'Panna Cotta Việt Quất',
    sku: 'PC_VIETQUAT',
    category: 'PANNA COTTA',
    unit: 'Hũ',
    stock: 70,
    price: 16000,
    vatRate: 8,
  },
  {
    id: 'p_pc_matcha',
    name: 'Panna Cotta Matcha Trà Xanh',
    sku: 'PC_MATCHA',
    category: 'PANNA COTTA',
    unit: 'Hũ',
    stock: 60,
    price: 16000,
    vatRate: 8,
  },
  {
    id: 'p_pc_chanhleo',
    name: 'Panna Cotta Chanh Leo',
    sku: 'PC_CHANHLEO',
    category: 'PANNA COTTA',
    unit: 'Hũ',
    stock: 55,
    price: 15000,
    vatRate: 8,
  },

  // 5. COFFEE
  {
    id: 'p_cf_muoi',
    name: 'Cà Phê Muối Hàn Châu 250ml',
    sku: 'CF_MUOI',
    category: 'COFFEE',
    unit: 'Chai',
    stock: 130,
    price: 20000,
    vatRate: 10,
  },
  {
    id: 'p_cf_machiato',
    name: 'Cafe Machiato - Hàn Châu',
    sku: 'TM_CFM',
    category: 'COFFEE',
    unit: 'Chai',
    stock: 95,
    price: 22000,
    vatRate: 10,
  },
  {
    id: 'p_cf_sua',
    name: 'Cà Phê Sữa Truyền Thống 250ml',
    sku: 'CF_SUA',
    category: 'COFFEE',
    unit: 'Chai',
    stock: 105,
    price: 18000,
    vatRate: 10,
  },
  {
    id: 'p_cf_bacxiu',
    name: 'Bạc Xỉu Sữa Tươi Hàn Châu 250ml',
    sku: 'CF_BACXIU',
    category: 'COFFEE',
    unit: 'Chai',
    stock: 85,
    price: 20000,
    vatRate: 10,
  },
  {
    id: 'p_cf_den',
    name: 'Cà Phê Đen Đậm Vị 250ml',
    sku: 'CF_DEN',
    category: 'COFFEE',
    unit: 'Chai',
    stock: 75,
    price: 16000,
    vatRate: 10,
  },

  // 6. GIẢI PHÁP PHA CHẾ 5T
  {
    id: 'p_gp_hongtra_5l',
    name: 'Cốt Hồng Trà Đậm Vị (Can 5L)',
    sku: 'GP_HONGTRA_5L',
    category: 'GIẢI PHÁP PHA CHẾ 5T',
    unit: 'Can',
    stock: 45,
    price: 185000,
    vatRate: 8,
  },
  {
    id: 'p_gp_tsnuong_5l',
    name: 'Cốt Trà Sữa Nướng Đậm Đà (Can 5L)',
    sku: 'GP_TSNUONG_5L',
    category: 'GIẢI PHÁP PHA CHẾ 5T',
    unit: 'Can',
    stock: 35,
    price: 210000,
    vatRate: 8,
  },
  {
    id: 'p_gp_olong_5l',
    name: 'Cốt Trà Ô Long Rang Đậm (Can 5L)',
    sku: 'GP_OLONG_5L',
    category: 'GIẢI PHÁP PHA CHẾ 5T',
    unit: 'Can',
    stock: 30,
    price: 225000,
    vatRate: 8,
  },
  {
    id: 'p_gp_duongden_2l',
    name: 'Sốt Đường Đen Hàn Quốc (Can 2L)',
    sku: 'GP_DUONGDEN_2L',
    category: 'GIẢI PHÁP PHA CHẾ 5T',
    unit: 'Can',
    stock: 50,
    price: 145000,
    vatRate: 8,
  },
  {
    id: 'p_gp_kemtrung_1kg',
    name: 'Bột Kem Trứng Nướng Đặc Biệt (Túi 1kg)',
    sku: 'GP_KEMTRUNG_1KG',
    category: 'GIẢI PHÁP PHA CHẾ 5T',
    unit: 'Túi',
    stock: 60,
    price: 120000,
    vatRate: 8,
  },

  // 7. SPECIAL TEA
  {
    id: 'p_st_luc_nhai',
    name: 'Lục Trà Nhài Thượng Hạng 350ml',
    sku: 'ST_LUC_NHAI',
    category: 'SPECIAL TEA',
    unit: 'Chai',
    stock: 80,
    price: 18000,
    vatRate: 8,
  },
  {
    id: 'p_st_olong_4mua',
    name: 'Trà Ô Long Bốn Mùa 350ml',
    sku: 'ST_OLONG_4MUA',
    category: 'SPECIAL TEA',
    unit: 'Chai',
    stock: 75,
    price: 20000,
    vatRate: 8,
  },
  {
    id: 'p_st_ceylon',
    name: 'Trà Đen Ceylon Cao Cấp 350ml',
    sku: 'ST_CEYLON',
    category: 'SPECIAL TEA',
    unit: 'Chai',
    stock: 60,
    price: 20000,
    vatRate: 8,
  },

  // 8. TRÀ GỪNG
  {
    id: 'p_tg_matong',
    name: 'Trà Gừng Mật Ong Hàn Châu 250ml',
    sku: 'TG_MATONG',
    category: 'TRÀ GỪNG',
    unit: 'Chai',
    stock: 65,
    price: 18000,
    vatRate: 8,
  },
  {
    id: 'p_tg_satuoi',
    name: 'Trà Gừng Sả Tươi 250ml',
    sku: 'TG_SATUOI',
    category: 'TRÀ GỪNG',
    unit: 'Chai',
    stock: 50,
    price: 18000,
    vatRate: 8,
  },
  {
    id: 'p_tg_duongnau',
    name: 'Trà Gừng Đường Nâu Nóng 250ml',
    sku: 'TG_DUONGNAU',
    category: 'TRÀ GỪNG',
    unit: 'Chai',
    stock: 45,
    price: 20000,
    vatRate: 8,
  },
];

interface ExistingOrderInfo {
  locationId: string;
  locationName: string;
  address: string;
  contactPerson: string;
  salesPerson?: string;
  dateStr: string;
  orderCode: string;
  itemCount: number;
}

const EXISTING_ORDERS: ExistingOrderInfo[] = [
  {
    locationId: 'hn_cva',
    locationName: 'CHU VĂN THỨC (CƠ SỞ THPT CHU VĂN AN)',
    address: 'Số 10 Thụy Khuê, P. Thụy Khuê, Q. Tây Hồ, Hà Nội',
    contactPerson: 'Thầy Thức - 098.345.6789',
    dateStr: getTodayDateStr(),
    orderCode: 'PGH-09619',
    itemCount: 8,
  },
  {
    locationId: 'yen_thuc',
    locationName: 'YẾN THỨC (Cơ sở Yến Thức)',
    address: 'Tổ 18, Phường Phan Đình Phùng, TP Thái Nguyên',
    contactPerson: 'Chị Yến - 098.123.4567',
    dateStr: getTodayDateStr(),
    orderCode: 'PGH-09620',
    itemCount: 6,
  },
  {
    locationId: 'hn_bk',
    locationName: 'Hà Nội - Hai Bà Trưng (Bách Khoa)',
    address: 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
    contactPerson: 'Chị Hà - 091.234.5678',
    dateStr: getTodayDateStr(),
    orderCode: 'PGH-09621',
    itemCount: 5,
  },
];

function parseDateStr(str?: string): DateRangePickerValue {
  const today = getSystemToday();
  if (!str) {
    return {
      from: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
      to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
    };
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return {
        from: d,
        to: new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 23, 59, 59),
      };
    }
  } else if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return {
        from: d,
        to: new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59),
      };
    }
  }
  return {
    from: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
    to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
  };
}

export const OrderAddPage: React.FC = () => {
  const navigate = useNavigate();
  const locationState = useLocation();
  const params = useParams<{ id: string }>();

  // Nhận thông tin đơn hàng nếu từ nút SỬA đơn HOẶC nút SAO CHÉP đơn chuyển sang
  const editOrder = (locationState.state as any)?.order;
  const copyOrder = (locationState.state as any)?.copyOrder;
  const isCopyMode = Boolean(copyOrder);
  const sourceOrder = editOrder || copyOrder;
  const returnFrom = (locationState.state as any)?.from || 'list';
  const isEditMode = Boolean((editOrder || params.id) && !isCopyMode);
  const editCode = editOrder?.code || (params.id ? `Đơn ${params.id}` : '');
  const copyCode = copyOrder?.code || '';
  const isPXK = !isCopyMode && (editOrder?.kind === 'pxk' || editCode.startsWith('PXK'));

  // Master inputs (Đồng bộ với OperationalFilterBar)
  const [dateRange, setDateRange] = useState<DateRangePickerValue>(() => {
    if (isCopyMode) {
      const baseDate = parseDateStr(copyOrder?.dateStr || copyOrder?.orderDate);
      const d = new Date(baseDate.from || getSystemToday());
      d.setDate(d.getDate() + 1);
      return {
        from: d,
        to: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
      };
    }
    return parseDateStr(editOrder?.dateStr || editOrder?.orderDate);
  });
  const [customer, setCustomer] = useState(() => {
    if (sourceOrder?.customerName) {
      const c = sourceOrder.customerName.toLowerCase();
      if (c.includes('yến thức')) return 'yen_thuc';
      if (c.includes('chu văn thức')) return '1';
      if (c.includes('hà')) return '2';
      if (c.includes('trâm')) return '3';
      if (c.includes('tuấn')) return '4';
      if (c.includes('long')) return '5';
      if (c.includes('mai')) return '6';
    }
    return '1';
  });
  const [location, setLocation] = useState(() => {
    if (sourceOrder?.locationName) {
      const l = sourceOrder.locationName.toLowerCase();
      if (l.includes('yến thức')) return 'yen_thuc';
      if (l.includes('chu văn an') || l.includes('chu văn thức')) return 'hn_cva';
      if (l.includes('bách khoa')) return 'hn_bk';
      if (l.includes('fpt')) return 'hn_cg';
      if (l.includes('viettel')) return 'hn_vt';
      if (l.includes('quốc gia')) return 'hn_qg';
      if (l.includes('keangnam')) return 'hn_kn';
    }
    return 'hn_cva';
  });
  const [shipper, setShipper] = useState(() => {
    if (sourceOrder?.shipperName) {
      const s = sourceOrder.shipperName.toLowerCase();
      if (s.includes('lương')) return 'a_luong';
      if (s.includes('hỏa tốc') || s.includes('ahamove')) return 'express';
      if (s.includes('xe xưởng 01')) return 'xe_xuong_01';
      if (s.includes('xe xưởng 02')) return 'xe_xuong_02';
      if (s.includes('tự lấy')) return 'pickup';
    }
    return 'a_luong';
  });
  const [note, setNote] = useState(() => {
    if (isCopyMode) {
      return copyOrder?.note
        ? `${copyOrder.note} (Sao chép từ ${copyCode})`
        : `Sao chép từ ${copyCode}`;
    }
    return editOrder?.note || '';
  });

  // Tìm kiếm sản phẩm & Bộ lọc nhóm trà sữa
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('Tất cả');

  // Danh sách sản phẩm đã chọn (nạp từ đơn đang sửa HOẶC đơn đang sao chép)
  const [selectedList, setSelectedList] = useState<SelectedProductItem[]>(() => {
    if (sourceOrder && Array.isArray(sourceOrder.items) && sourceOrder.items.length > 0) {
      return sourceOrder.items.map((it: any, idx: number) => ({
        id: it.id ? String(it.id) : (it.sku || it.productCode || `p_source_${idx}`),
        name: it.name || it.productName || 'Sản phẩm',
        sku: it.sku || it.productCode || '',
        category: it.category || 'TRÀ SỮA 330ML',
        unit: it.unit || 'Chai',
        quantity: Number(it.quantity) || Number(it.qtyOrdered) || 1,
        returnedQty: isCopyMode ? 0 : (it.returnedQty !== undefined ? Number(it.returnedQty) : 0),
        price: Number(it.price) || Number(it.unitPrice) || 0,
        vatRate: it.vatRate !== undefined ? Number(it.vatRate) : 8,
      }));
    }
    return [
      {
        id: 'p_ts_nuong_330',
        name: 'Trà Sữa Nướng Hàn Châu 330ml',
        sku: 'TS_NUONG_330',
        category: 'TRÀ SỮA 330ML',
        unit: 'Chai',
        quantity: 20,
        price: 22000,
        vatRate: 8,
      },
      {
        id: 'p_ts_hong_330',
        name: 'Hồng Trà Sữa Hàn Châu 330ml',
        sku: 'TS_HONG_330',
        category: 'TRÀ SỮA 330ML',
        unit: 'Chai',
        quantity: 20,
        price: 20000,
        vatRate: 8,
      },
      {
        id: 'p_ts_thaix_330',
        name: 'Trà Sữa Thái Xanh Hàn Châu 330ml',
        sku: 'TS_THAIX_330',
        category: 'TRÀ SỮA 330ML',
        unit: 'Chai',
        quantity: 15,
        price: 20000,
        vatRate: 8,
      },
      {
        id: 'p_pc_dau',
        name: 'Panna Cotta Dâu Tây',
        sku: 'PC_DAU',
        category: 'PANNA COTTA',
        unit: 'Hũ',
        quantity: 10,
        price: 15000,
        vatRate: 8,
      },
      {
        id: 'p_cf_machiato',
        name: 'Cafe Machiato - Hàn Châu',
        sku: 'TM_CFM',
        category: 'COFFEE',
        unit: 'Chai',
        quantity: 10,
        price: 22000,
        vatRate: 10,
      },
    ];
  });

  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [slipModalData, setSlipModalData] = useState<DeliverySlipData | null>(null);

  // Set các ID đã chọn để tra cứu O(1)
  const selectedIdSet = useMemo(
    () => new Set(selectedList.map((item) => item.id)),
    [selectedList]
  );

  // Lọc danh sách sản phẩm theo tìm kiếm và nhóm trà sữa
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return MASTER_PRODUCTS.filter((p) => {
      const matchCat =
        selectedCategoryTab === 'Tất cả' || p.category === selectedCategoryTab;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [productSearch, selectedCategoryTab]);

  // Toggle tick chọn sản phẩm
  const handleToggleProduct = (product: ProductMaster) => {
    if (selectedIdSet.has(product.id)) {
      // Bỏ chọn
      setSelectedList((prev) => prev.filter((item) => item.id !== product.id));
    } else {
      // Chọn mới -> thêm xuống danh sách dưới
      setSelectedList((prev) => [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          unit: product.unit,
          quantity: 1,
          price: product.price,
          vatRate: product.vatRate,
        },
      ]);
    }
  };

  // Cập nhật số lượng
  const handleUpdateQuantity = (id: string, qty: number) => {
    setSelectedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  // Cập nhật số lượng trả (khi sửa phiếu)
  const handleUpdateReturnedQty = (id: string, qty: number) => {
    setSelectedList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, returnedQty: Math.max(0, qty) } : item
      )
    );
  };

  // Cập nhật giá bán
  const handleUpdatePrice = (id: string, price: number) => {
    setSelectedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: Math.max(0, price) } : item))
    );
  };

  // Cập nhật VAT
  const handleUpdateVat = (id: string, vat: number) => {
    setSelectedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, vatRate: Math.max(0, vat) } : item))
    );
  };

  // Xóa khỏi danh sách đã chọn
  const handleRemoveItem = (id: string) => {
    setSelectedList((prev) => prev.filter((item) => item.id !== id));
  };

  // Tính tổng
  const totalQuantity = selectedList.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPrice = selectedList.reduce((sum, item) => {
    const effectiveQty = isEditMode && item.returnedQty ? Math.max(0, item.quantity - item.returnedQty) : item.quantity;
    return sum + item.price * effectiveQty;
  }, 0);
  const totalVat = selectedList.reduce((sum, item) => {
    const effectiveQty = isEditMode && item.returnedQty ? Math.max(0, item.quantity - item.returnedQty) : item.quantity;
    return sum + Math.round(item.price * effectiveQty * (item.vatRate / 100));
  }, 0);
  const grandTotal = subtotalPrice + totalVat;
  const amountInWords = convertNumberToVietnameseWords(grandTotal);

  // Format ngày đã chọn DD/MM/YYYY
  const selectedDateStr = useMemo(() => {
    if (!dateRange.from) return getTodayDateStr();
    const d = dateRange.from;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }, [dateRange.from]);

  // Kiểm tra cảnh báo phiếu đã tồn tại theo ĐỊA ĐIỂM vào ngày giao (check theo địa điểm, không check khách hàng)
  const existingOrderWarning = useMemo(() => {
    if (!location) return null;
    return (
      EXISTING_ORDERS.find(
        (o) => o.locationId === location && o.dateStr === selectedDateStr
      ) || null
    );
  }, [location, selectedDateStr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedList.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để tạo phiếu giao hàng!');
      return;
    }

    if (isEditMode && editOrder) {
      // Cập nhật đơn hàng đã sửa vào localStorage để đồng bộ với các trang danh sách
      const updatedOrder = {
        ...editOrder,
        dateStr: selectedDateStr,
        orderDate: selectedDateStr,
        note,
        hasTagE: !isPXK, // Khi sửa đơn xong thì PGH đấy có chữ E màu đỏ còn PXK thì không cần!
        totalAmount: grandTotal,
        totalBeforeVat: String(subtotalPrice),
        totalVat: String(totalVat),
        items: selectedList.map((it, idx) => ({
          id: it.id || String(idx),
          sku: it.sku,
          productCode: it.sku,
          name: it.name,
          productName: it.name,
          category: it.category,
          unit: it.unit,
          quantity: it.quantity,
          returnedQty: it.returnedQty || 0,
          qtyOrdered: String(it.quantity),
          price: it.price,
          unitPrice: String(it.price),
          vatRate: it.vatRate,
        })),
      };

      try {
        const stored = JSON.parse(localStorage.getItem('vietthang_edited_orders') || '{}');
        stored[editOrder.id] = updatedOrder;
        stored[editOrder.code] = updatedOrder;
        localStorage.setItem('vietthang_edited_orders', JSON.stringify(stored));
      } catch (err) {
        console.error(err);
      }
      navigate(returnFrom === 'approval' ? '/orders/approval' : '/orders/list');
    } else {
      // 1. TẠO ĐƠN MỚI (RA ĐƠN): Trạng thái CHỜ DUYỆT (pending) -> Chuyển sang trang Approval để duyệt
      const customerObj = DEFAULT_CUSTOMERS.find((c) => c.id === customer);
      const locationObj = DEFAULT_LOCATIONS.find((l) => l.id === location);
      const shipperObj = DEFAULT_SHIPPING_METHODS.find((s) => s.id === shipper);
      const randSeq = Math.floor(100 + Math.random() * 900);
      const newCode = `DH-${randSeq}`;

      // Đánh giá tồn kho: Nếu tổng số lượng <= 80 thì Xanh, nếu lớn hơn thì Vàng
      const totalOrderedQty = selectedList.reduce((sum, it) => sum + it.quantity, 0);
      const checkLevel = totalOrderedQty <= 80 ? 'green' : 'yellow';

      const newPendingOrder = {
        id: String(Date.now()),
        code: newCode,
        orderType: 'standard',
        parentOrderCode: null,
        customerId: Number(customer) || 1,
        customerCode: customerObj?.id?.toUpperCase() || 'KH-VT',
        customerName: customerObj?.name || 'KHÁCH HÀNG MỚI',
        locationId: Number(location) || 1,
        locationName: locationObj?.name || customerObj?.location || 'Cơ sở khách hàng',
        locationAddress: locationObj?.note || customerObj?.location || 'Số 10 Thụy Khuê, Tây Hồ, Hà Nội',
        orderDate: selectedDateStr,
        deliveryAt: `${selectedDateStr} 07:30:00`,
        status: 'pending', // Chờ duyệt
        checkLevel,
        totalBeforeVat: String(subtotalPrice),
        totalVat: String(totalVat),
        totalAmount: String(grandTotal),
        contactPerson: locationObj?.note ? `Liên hệ: ${locationObj.name}` : 'Dung - 097.484.6310',
        salesPerson: 'Chị Ly - 086.709.9978',
        shipperName: shipperObj?.label || 'A Lương',
        note,
        items: selectedList.map((it, idx) => ({
          id: String(Date.now() + idx),
          productId: 101 + idx,
          productCode: it.sku,
          productName: it.name,
          packageSpec: it.unit,
          unit: it.unit,
          qtyOrdered: String(it.quantity),
          unitPrice: String(it.price),
          vatRate: String(it.vatRate),
          qtyFromStock: checkLevel === 'green' ? String(it.quantity) : '0.000',
          qtyToProduce: checkLevel === 'green' ? '0.000' : String(it.quantity),
        })),
        materialShortages: [],
      };

      try {
        const storedPending = JSON.parse(localStorage.getItem('vietthang_pending_orders') || '[]');
        storedPending.unshift(newPendingOrder);
        localStorage.setItem('vietthang_pending_orders', JSON.stringify(storedPending));
      } catch (err) {
        console.error(err);
      }

      // Thông báo và chuyển hướng sang trang Approval để duyệt
      navigate('/orders/approval', {
        state: { newlyCreatedOrderCode: newCode },
      });
    }
  };

  return (
    <div className="space-y-4 max-w-[1250px] mx-auto pb-16">
      {/* Breadcrumb đầu trang */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pb-0.5 px-0.5">
        <span
          onClick={() => navigate('/')}
          className="text-blue-600 hover:underline cursor-pointer font-medium"
        >
          Home
        </span>
        <span className="text-slate-300">/</span>
        <span
          onClick={() => navigate(returnFrom === 'approval' ? '/orders/approval' : '/orders/list')}
          className="text-blue-600 hover:underline cursor-pointer font-medium"
        >
          QL PHIẾU HÀNG
        </span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-bold uppercase tracking-wide">
          {isEditMode
            ? `CHỈNH SỬA ${isPXK ? 'PHIẾU XUẤT KHO' : 'PHIẾU GIAO HÀNG'}`
            : isCopyMode
              ? `SAO CHÉP ĐƠN (${copyCode})`
              : 'TẠO PHIẾU GIAO HÀNG'}
        </span>
      </div>

      {/* CARD FORM CHÍNH */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
      >
        {/* THANH HEADER ĐEN TRÊN CÙNG */}
        <div className="bg-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PlusCircleOutlined className="text-base text-slate-200" />
            <h1 className="text-sm font-extrabold uppercase tracking-wider text-white">
              {isEditMode
                ? `CHỈNH SỬA ${isPXK ? 'PHIẾU XUẤT KHO' : 'PHIẾU GIAO HÀNG'}: ${editCode}`
                : isCopyMode
                  ? `TẠO PHIẾU GIAO HÀNG (SAO CHÉP TỪ ĐƠN ${copyCode})`
                  : 'TẠO PHIẾU GIAO HÀNG'}
            </h1>
          </div>
          {selectedList.length > 0 && (
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <span>
                Đã chọn <strong className="text-white">{selectedList.length}</strong> món ({totalQuantity} cái/chai)
              </span>
              <span>•</span>
              <span>
                Tổng: <strong className="text-emerald-400">{grandTotal.toLocaleString('vi-VN')} đ</strong>
              </span>
            </div>
          )}
        </div>

        {/* NỘI DUNG FORM */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* KHỐI 1: BỘ LỌC ĐIỀU HÀNH DÙNG CHUNG (ẨN DẢI NÚT THỜI GIAN THEO YÊU CẦU) */}
          <OperationalFilterBar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            showDateTabs={false}
            columns={2}
            customer={customer}
            onCustomerChange={setCustomer}
            location={location}
            onLocationChange={setLocation}
            shippingMethod={shipper}
            onShippingMethodChange={setShipper}
          />

          {/* CẢNH BÁO ĐÃ CÓ PHIẾU GIAO HÀNG TRÙNG NGÀY THEO ĐỊA ĐIỂM (CHUẨN THEO ẢNH MẪU) */}
          {existingOrderWarning && (
            <div className="rounded-xl border border-amber-200/90 bg-[#fff8ea] px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-600 font-bold shrink-0 text-sm">⚠️</span>
                <span>
                  {existingOrderWarning.locationName} đã có 1 phiếu ngày{' '}
                  {existingOrderWarning.dateStr} — kiểm tra kẻo tạo trùng:{' '}
                  <span
                    onClick={() => {
                      setSlipModalData({
                        orderCode: existingOrderWarning.orderCode,
                        createdDate: existingOrderWarning.dateStr,
                        customerName: existingOrderWarning.locationName,
                        address: existingOrderWarning.address,
                        contactPerson: existingOrderWarning.contactPerson,
                        salesPerson: existingOrderWarning.salesPerson,
                        shipperName: 'A Lương',
                        items: [
                          {
                            id: 'p1',
                            sku: 'TS_NUONG_330',
                            name: 'Trà Sữa Nướng Hàn Châu 330ml',
                            category: 'TRÀ SỮA 330ML',
                            unit: 'Chai',
                            quantity: 50,
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
                          {
                            id: 'p3',
                            sku: 'PC_DAU',
                            name: 'Panna Cotta Dâu Tây',
                            category: 'PANNA COTTA',
                            unit: 'Hũ',
                            quantity: 30,
                            price: 15000,
                            vatRate: 8,
                          },
                        ],
                      });
                      setIsSlipModalOpen(true);
                    }}
                    className="text-blue-600 underline font-semibold hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>
                      {existingOrderWarning.orderCode} · {existingOrderWarning.dateStr} ({existingOrderWarning.itemCount} SP)
                    </span>
                    <EyeOutlined className="text-xs" />
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* KHỐI 2: CHỌN SẢN PHẨM (KÉO CUỘN GỌN GÀNG, CHỈ HIỆN 1 ÍT SẢN PHẨM) */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            {/* Thanh tiêu đề con Chọn sản phẩm */}
            <div className="bg-[#0f172a] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UnorderedListOutlined className="text-slate-300 text-sm" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  Chọn sản phẩm
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-300">
                Hiển thị {filteredProducts.length} sản phẩm (cuộn để xem thêm)
              </span>
            </div>

            <div className="p-4 space-y-3 bg-white">
              {/* Ô TÌM KIẾM SẢN PHẨM */}
              <div className="relative">
                <SearchOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-8 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none transition shadow-2xs"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* BỘ LỌC CHIP PHÂN LOẠI NHÓM TRÀ SỮA & NƯỚC (THEO ĐÚNG ẢNH MẪU) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                {MILK_TEA_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryTab(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      selectedCategoryTab === cat
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* DANH SÁCH SẢN PHẨM CÓ SCROLLBAR GỌN GÀNG (max-h-[220px]) */}
              <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 pr-1">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isChecked = selectedIdSet.has(p.id);

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleProduct(p)}
                        className={`flex items-center justify-between p-3 transition cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50/40 hover:bg-blue-50/70'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        {/* Cột trái: Tên sản phẩm & các nhãn tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm min-w-[140px]">
                            {p.name}
                          </span>

                          {/* Badge Mã SKU */}
                          <span className="rounded bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[11px] font-bold">
                            {p.sku}
                          </span>

                          {/* Badge Phân Loại */}
                          <span className="rounded bg-blue-50 text-blue-600 px-1.5 py-0.5 text-[11px] font-medium border border-blue-200/50">
                            {p.category}
                          </span>

                          {/* Badge ĐVT */}
                          <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[11px] font-medium">
                            {p.unit}
                          </span>

                          {/* Badge Tồn kho SL */}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                              p.stock < 0
                                ? 'bg-amber-50 text-amber-900 border border-amber-200/60'
                                : p.stock === 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            SL: {p.stock.toLocaleString('vi-VN')}
                          </span>

                          {/* Badge Giá bán chuẩn (GBC) */}
                          <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[11px] font-extrabold border border-emerald-200/60">
                            GBC: {p.price.toLocaleString('vi-VN')}
                          </span>

                          {/* Badge Thuế VAT mặc định */}
                          <span className="rounded bg-sky-50 text-sky-700 px-1.5 py-0.5 text-[11px] font-bold border border-sky-200/60">
                            VAT: {p.vatRate}%
                          </span>
                        </div>

                        {/* Cột phải: Checkbox màu hồng cánh sen chuẩn ảnh */}
                        <div
                          className="pl-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleProduct(p);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleProduct(p)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-rose-500 focus:ring-rose-400 cursor-pointer accent-rose-500"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                    Không tìm thấy sản phẩm phù hợp với từ khóa "{productSearch}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KHỐI 3: SẢN PHẨM ĐÃ CHỌN (TỰ ĐỘNG XUỐNG DƯỚI ĐÂY) */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
            {/* Header phân đoạn: Sản phẩm đã chọn */}
            <div className="bg-[#0f172a] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersOutlined className="text-slate-300 text-sm" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  Sản phẩm đã chọn ({selectedList.length})
                </span>
              </div>
              {selectedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedList([])}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <div className="p-4 space-y-3">
              {selectedList.length > 0 ? (
                selectedList.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
                  >
                    {/* Số thứ tự tròn đen ❶, ❷, ❸ */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-black shadow-xs">
                      {index + 1}
                    </div>

                    {/* Cột 1: Tên sản phẩm */}
                    <div className="flex-1 relative">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-medium text-slate-500 z-10">
                        Tên sản phẩm
                      </span>
                      <div className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 flex items-center text-sm font-normal text-slate-700 shadow-2xs">
                        <span className="truncate">{item.name}</span>
                        <span className="ml-1.5 text-xs font-normal text-slate-400 shrink-0">
                          ({item.sku} - {item.unit})
                        </span>
                      </div>
                    </div>

                    {/* Cột 2: SỐ LƯỢNG * */}
                    <div className={`w-full ${isEditMode ? 'md:w-36' : 'md:w-44'} relative`}>
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-medium text-slate-500 uppercase z-10">
                        {isEditMode ? 'SL GIAO' : 'SỐ LƯỢNG'} <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none transition shadow-2xs text-center"
                      />
                    </div>

                    {/* CỘT TRẢ: CHỈ XUẤT HIỆN KHI SỬA PHIẾU (PGH / PXK), KHI RA ĐƠN THÌ KHÔNG CÓ */}
                    {isEditMode && (
                      <div className="w-full md:w-28 relative">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-rose-600 uppercase z-10">
                          SL TRẢ
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={item.returnedQty !== undefined && item.returnedQty !== 0 ? item.returnedQty : ''}
                          placeholder="0"
                          onChange={(e) =>
                            handleUpdateReturnedQty(item.id, parseInt(e.target.value) || 0)
                          }
                          className="h-11 w-full rounded-xl border border-rose-200 bg-rose-50/30 px-3 text-sm font-bold text-rose-600 focus:border-rose-500 focus:outline-none transition shadow-2xs text-center"
                        />
                      </div>
                    )}

                    {/* Cột 3: Giá bán * */}
                    <div className={`w-full ${isEditMode ? 'md:w-36' : 'md:w-44'} relative`}>
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-medium text-slate-500 uppercase z-10">
                        GIÁ BÁN <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={item.price}
                        onChange={(e) =>
                          handleUpdatePrice(item.id, parseInt(e.target.value) || 0)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    {/* Cột 4: VAT (%) mặc định sản phẩm */}
                    <div className={`w-full ${isEditMode ? 'md:w-24' : 'md:w-28'} relative`}>
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-medium text-slate-500 uppercase z-10">
                        VAT (%)
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.vatRate}
                        onChange={(e) =>
                          handleUpdateVat(item.id, parseInt(e.target.value) || 0)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none transition shadow-2xs text-center"
                      />
                    </div>

                    {/* Nút Xóa thùng rác */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Xóa món này"
                      className="h-11 w-11 shrink-0 rounded-xl border border-rose-200/80 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-300 transition flex items-center justify-center cursor-pointer shadow-2xs"
                    >
                      <DeleteOutlined className="text-base" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-xl">
                  Chưa có sản phẩm nào được chọn. Hãy tích chọn sản phẩm ở ô phía trên!
                </div>
              )}
            </div>
          </div>

          {/* KHỐI 4: XEM TRƯỚC PHIẾU GIAO HÀNG */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white">
            {/* Header đen của Bảng Xem trước */}
            <div className="bg-[#0f172a] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOutlined className="text-slate-300 text-sm" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  XEM TRƯỚC PHIẾU GIAO HÀNG
                </span>
              </div>
              {selectedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const locObj = DEFAULT_LOCATIONS.find(
                      (l) => l.id === location || l.name === location
                    );
                    const isCVA = location === 'hn_cva';
                    setSlipModalData({
                      orderCode: 'PGH-09618',
                      createdDate: selectedDateStr,
                      customerName: isCVA
                        ? 'CHU VĂN THỨC (CƠ SỞ THPT CHU VĂN AN)'
                        : locObj
                          ? `${locObj.name} (${locObj.note})`
                          : 'UBF_THCS NHA TRANG - THÁI NGUYÊN',
                      address: isCVA
                        ? 'Số 10 Thụy Khuê, P. Thụy Khuê, Q. Tây Hồ, Hà Nội'
                        : 'Tổ 18, Phường Phan Đình Phùng, Thành phố Thái Nguyên, Tỉnh Thái Nguyên',
                      contactPerson: isCVA
                        ? 'Thầy Thức - 098.345.6789'
                        : 'Dung - 097.484.6310',
                      shipperName: shipper === 'a_luong' ? 'A Lương' : 'Ship_UBF_TN',
                      note: note,
                      items: selectedList.map((item) => ({
                        id: item.id,
                        sku: item.sku,
                        name: item.name,
                        category: item.category,
                        unit: item.unit,
                        quantity: item.quantity,
                        returnedQty: item.returnedQty || 0,
                        price: item.price,
                        vatRate: item.vatRate,
                      })),
                    });
                    setIsSlipModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <EyeOutlined className="text-[11px] text-blue-400" />
                  <span>Xem phiếu giao hàng</span>
                </button>
              )}
            </div>

            {/* BẢNG TABLE XEM TRƯỚC */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-14 text-center">STT</th>
                    <th className="px-4 py-3 w-28">MÃ</th>
                    <th className="px-4 py-3 min-w-[220px]">TÊN</th>
                    <th className="px-4 py-3 w-32">NHÓM</th>
                    <th className="px-4 py-3 w-20">ĐVT</th>
                    <th className="px-4 py-3 w-24 text-center">SL GIAO</th>
                    <th className="px-4 py-3 w-24 text-center">SL TRẢ</th>
                    <th className="px-4 py-3 w-28 text-right">GIÁ</th>
                    <th className="px-4 py-3 w-20 text-center">VAT</th>
                    <th className="px-4 py-3 w-32 text-right">TỔNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {selectedList.length > 0 ? (
                    <>
                      {selectedList.map((item, idx) => {
                        const effectiveQty = isEditMode && item.returnedQty ? Math.max(0, item.quantity - item.returnedQty) : item.quantity;
                        const itemTotal = item.price * effectiveQty;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3.5 text-center font-medium text-slate-700">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              {item.sku}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              {item.name}
                            </td>
                            <td className="px-4 py-3.5 text-slate-700">
                              {item.category}
                            </td>
                            <td className="px-4 py-3.5 text-slate-700">
                              {item.unit}
                            </td>
                            <td className="px-4 py-3.5 text-center font-semibold text-slate-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3.5 text-center text-rose-600 font-bold">
                              {item.returnedQty || ''}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                              {formatMoneyNoUnit(item.price)}
                            </td>
                            <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                              {item.vatRate}%
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                              {formatMoneyNoUnit(itemTotal)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* DÒNG 1: TỔNG GIÁ TRỊ TRƯỚC THUẾ */}
                      <tr className="border-t border-slate-200">
                        <td colSpan={9} className="px-4 py-2.5 text-right font-bold text-slate-900">
                          Tổng giá trị trước thuế
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                          {formatMoneyNoUnit(subtotalPrice)}
                        </td>
                      </tr>

                      {/* DÒNG 2: TỔNG TIỀN THUẾ */}
                      <tr>
                        <td colSpan={9} className="px-4 py-2.5 text-right font-bold text-slate-900">
                          Tổng tiền thuế
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                          {formatMoneyNoUnit(totalVat)}
                        </td>
                      </tr>

                      {/* DÒNG 3: TỔNG GIÁ TRỊ ĐƠN HÀNG */}
                      <tr>
                        <td colSpan={9} className="px-4 py-2.5 text-right font-extrabold text-slate-900">
                          Tổng giá trị đơn hàng
                        </td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-slate-900">
                          {formatMoneyNoUnit(grandTotal)}
                        </td>
                      </tr>

                      {/* DÒNG 4: SỐ TIỀN BẰNG CHỮ */}
                      <tr>
                        <td colSpan={10} className="px-4 py-3 text-right text-slate-700">
                          <span className="font-medium">Số tiền bằng chữ: </span>
                          <span className="font-bold text-slate-800">{amountInWords}</span>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-xs">
                        Chưa có sản phẩm nào trong phiếu giao hàng
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* KHỐI 5: GHI CHÚ */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              GHI CHÚ
            </label>
            <textarea
              rows={3}
              placeholder="Ghi chú đơn hàng..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition shadow-2xs resize-y"
            />
          </div>

          {/* KHỐI 6: FOOTER CÁC NÚT THAO TÁC */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto h-10 px-5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CloseOutlined className="text-xs" />
              <span>HỦY BỎ</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto h-10 px-6 rounded-lg bg-[#3b82f6] text-white text-xs font-extrabold hover:bg-blue-600 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <CheckOutlined className="text-xs font-black" />
              <span>
                {isEditMode
                  ? `LƯU THAY ĐỔI ${!isPXK ? '(GẮN NHÃN E)' : ''}`
                  : 'TẠO — PHIẾU GIAO HÀNG'}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* POPUP XEM PHIẾU GIAO HÀNG (KÈM ĐƠN VỊ GIAO HÀNG & CÁC CỘT ORDER/ADD) */}
      <DeliverySlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        order={slipModalData}
      />
    </div>
  );
};
