import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Select, MenuItem, FormControl, ListSubheader } from '@mui/material';
import { notification } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  PrinterOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  AppstoreOutlined,
  CheckOutlined,
  FileDoneOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CarOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  useApproveOrderMutation,
  usePendingOrdersForApproval,
} from '../hooks/useOrderApproval';
import {
  OrderCheckLevel,
  PendingOrderForApproval,
} from '../types/order-approval.types';
import { DeliverySlipModal, DeliverySlipData } from './DeliverySlipModal';
import { KitchenReportModal } from './KitchenReportModal';
import {
  DateRangePicker,
  DateRangePickerValue,
} from '../../../components/ui/DateRangePicker';
import {
  DEFAULT_LOCATIONS,
  DEFAULT_CUSTOMERS,
  DEFAULT_SHIPPING_METHODS,
} from '../../../components/ui/OperationalFilterBar';
import {
  getSystemToday,
  getTodayDateStr,
  getTomorrowDateStr,
  parseOrderDate,
  formatDisplayDate,
} from '../../../lib/formatters';
import {
  addOrderToKitchenProduction,
  getKitchenProductionList,
  KITCHEN_PRODUCTION_EVENT,
} from '../../../lib/kitchenProductionStore';

export interface OrderApprovalTableProps {
  onViewOrderDetail?: (order: PendingOrderForApproval) => void;
}

const mapOrderToSlipData = (order: PendingOrderForApproval): DeliverySlipData => {
  const subtotal = Number(order.totalAmount) || 0;
  const vat = Number(order.totalVat) || 0;
  return {
    orderCode: order.code,
    createdDate: order.orderDate ? formatDisplayDate(order.orderDate) : getTodayDateStr(),
    customerName: `${order.customerName} (${order.locationName})`,
    address: order.locationAddress || 'Số 10 Thụy Khuê, Tây Hồ, Hà Nội',
    salesPerson: 'Chị Ly - 086.709.9978',
    contactPerson: 'Dung - 097.484.6310',
    shipperName: 'A Lương',
    note: order.note || '',
    items: order.items.map((it, idx) => ({
      id: it.id || String(idx),
      sku: it.productCode,
      name: it.productName,
      category: 'Thành phẩm',
      unit: it.unit,
      quantity: Number(it.qtyOrdered) || 0,
      returnedQty: (it as any).returnedQty,
      price: Number(it.unitPrice) || 0,
      vatRate: 0,
    })),
    subtotal,
    vatAmount: vat,
    grandTotal: subtotal + vat,
  };
};

const CHECK_LEVEL_CONFIG: Record<
  OrderCheckLevel,
  {
    label: string;
    subLabel: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  green: {
    label: 'Đủ hàng',
    subLabel: 'Xuất ngay từ kho TP',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  yellow: {
    label: 'Cần SX',
    subLabel: 'Thiếu TP, đủ BOM',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
  },
  red: {
    label: 'Thiếu hàng',
    subLabel: 'Không đủ NVL theo BOM',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500',
  },
};

function formatQty(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) {
    return '0';
  }
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

// Hàm tính ngày mai cho thao tác Copy
function getTomorrowDateString(dateStr?: string): string {
  const d = parseOrderDate(dateStr) || getSystemToday();
  d.setDate(d.getDate() + 1);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const getApprovedKeySet = (): Set<string> => {
  const set = new Set<string>();
  try {
    const keys: string[] = JSON.parse(localStorage.getItem('vietthang_approved_keys') || '[]');
    keys.forEach((k) => set.add(String(k).trim()));
  } catch (e) {
    console.error(e);
  }
  try {
    const approvedOrders: any[] = JSON.parse(localStorage.getItem('vietthang_approved_orders') || '[]');
    approvedOrders.forEach((o: any) => {
      if (o.id) {
        const idStr = String(o.id).trim();
        set.add(idStr);
        set.add(idStr.replace(/^ord_/, ''));
        set.add(`ord_${idStr.replace(/^ord_/, '')}`);
      }
      if (o.originalId) {
        set.add(String(o.originalId).trim());
      }
      if (o.code) {
        const codeStr = String(o.code).trim();
        set.add(codeStr);
        set.add(codeStr.replace(/^PGH-/, 'DH-'));
        set.add(codeStr.replace(/^PGH-/, 'ORD-'));
        set.add(codeStr.replace(/^DH-/, 'PGH-'));
        set.add(codeStr.replace(/^ORD-/, 'PGH-'));
      }
      if (o.originalCode) {
        set.add(String(o.originalCode).trim());
      }
    });
  } catch (e) {
    console.error(e);
  }
  return set;
};

const addOrderToApprovedKeys = (order: { id: any; code: string }): Set<string> => {
  const idStr = String(order.id).trim();
  const rawId = idStr.replace(/^ord_/, '');
  const codeStr = String(order.code).trim();
  const pghCode = codeStr.startsWith('PGH') ? codeStr : `PGH-${codeStr.replace(/^(DH-|ORD-)/, '')}`;
  const dhCode = codeStr.replace(/^(PGH-|ORD-)/, 'DH-');
  const ordCode = codeStr.replace(/^(PGH-|DH-)/, 'ORD-');

  const set = getApprovedKeySet();
  set.add(idStr);
  set.add(rawId);
  set.add(`ord_${rawId}`);
  set.add(codeStr);
  set.add(pghCode);
  set.add(dhCode);
  set.add(ordCode);

  try {
    localStorage.setItem('vietthang_approved_keys', JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error(e);
  }
  return set;
};

const checkIsOrderApproved = (o: { id: any; code: string }, approvedSet: Set<string>): boolean => {
  const idStr = String(o.id || '').trim();
  const rawId = idStr.replace(/^ord_/, '');
  const codeStr = String(o.code || '').trim();
  const pghCode = codeStr.startsWith('PGH') ? codeStr : `PGH-${codeStr.replace(/^(DH-|ORD-)/, '')}`;
  const dhCode = codeStr.replace(/^(PGH-|ORD-)/, 'DH-');
  const ordCode = codeStr.replace(/^(PGH-|DH-)/, 'ORD-');

  return (
    approvedSet.has(idStr) ||
    approvedSet.has(rawId) ||
    approvedSet.has(`ord_${rawId}`) ||
    approvedSet.has(codeStr) ||
    approvedSet.has(pghCode) ||
    approvedSet.has(dhCode) ||
    approvedSet.has(ordCode)
  );
};

export const OrderApprovalTable: React.FC<OrderApprovalTableProps> = ({
  onViewOrderDetail,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = usePendingOrdersForApproval();

  const approveSingleMutation = useApproveOrderMutation();

  // State quản lý danh sách đơn đã duyệt để đảm bảo ẩn ngay lập tức
  const [approvedKeySet, setApprovedKeySet] = useState<Set<string>>(() => getApprovedKeySet());
  const [isOrdersLoaded, setIsOrdersLoaded] = useState(false);

  // State danh sách đơn cục bộ để hỗ trợ xóa, sửa, copy, tạo pxk
  const [localOrders, setLocalOrders] = useState<PendingOrderForApproval[]>([]);

  useEffect(() => {
    try {
      const currentApprovedKeys = getApprovedKeySet();
      setApprovedKeySet(currentApprovedKeys);

      const stored = JSON.parse(localStorage.getItem('vietthang_edited_orders') || '{}');
      const pendingStored: PendingOrderForApproval[] = JSON.parse(localStorage.getItem('vietthang_pending_orders') || '[]');

      // Gộp đơn từ API và các đơn mới tạo từ trang Ra đơn
      const combined = [...pendingStored, ...(orders || [])];

      // Loại bỏ các đơn đã duyệt bằng checkIsOrderApproved
      const unapproved = combined.filter((o) => !checkIsOrderApproved(o, currentApprovedKeys));

      // De-duplicate theo id / code
      const seen = new Set<string>();
      const finalOrders: PendingOrderForApproval[] = [];
      for (const o of unapproved) {
        const normalizedCode = o.code.replace('20261110-', '');
        const key = String(o.id || normalizedCode);
        if (!seen.has(key)) {
          seen.add(key);
          const edited = stored[o.id] || stored[o.code] || stored[normalizedCode];
          finalOrders.push(
            edited
              ? { ...o, ...edited, code: (edited.code || normalizedCode).replace('20261110-', '') }
              : {
                  ...o,
                  code: normalizedCode,
                  kind: normalizedCode.startsWith('PXK') ? 'pxk' : 'pgh',
                  hasTagE: false,
                }
          );
        }
      }
      setLocalOrders(finalOrders);
      setIsOrdersLoaded(true);
    } catch {
      setLocalOrders([]);
      setIsOrdersLoaded(true);
    }
  }, [orders]);

  // Thư viện thông báo Ant Design Notification (ngắn gọn 1 dòng, hiển thị góc bên trái, tự tắt sau 3 giây)
  const [notifyApi, notificationContextHolder] = notification.useNotification();

  const showNotification = useCallback(
    (
      type: 'success' | 'warning' | 'error' | 'info',
      text: string
    ) => {
      notifyApi[type]({
        message: text,
        description: undefined, // Không để subtitle để thông báo chỉ hiển thị ngắn gọn đúng 1 dòng
        placement: 'bottomLeft', // Hiện bên góc bên trái
        duration: 3, // 3 giây rồi tự tắt
      });
    },
    [notifyApi]
  );

  // Thông báo nếu vừa tạo mới đơn xong chuyển sang
  useEffect(() => {
    if (location.state && (location.state as any).newlyCreatedOrderCode) {
      const code = (location.state as any).newlyCreatedOrderCode;
      showNotification('success', `Đã ra đơn ${code} thành công!`);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, showNotification]);

  // Danh sách đơn active: nếu đã nạp thì dùng localOrders (ngay cả khi rỗng []), không fallback về orders gốc
  const activeOrders = isOrdersLoaded
    ? localOrders
    : (orders || []).filter((o) => !checkIsOrderApproved(o, approvedKeySet));

  // Bộ lọc
  const [selectedDayTab, setSelectedDayTab] = useState<'today' | 'tomorrow' | null>('today');
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterCheckLevel, setFilterCheckLevel] = useState<'all' | OrderCheckLevel>('all');
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

  // Trạng thái modal và chọn dòng
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<PendingOrderForApproval | null>(null);
  const [viewingDeliverySlip, setViewingDeliverySlip] = useState<DeliverySlipData | null>(null);
  const [viewingBatchSlipData, setViewingBatchSlipData] = useState<DeliverySlipData[] | null>(null);
  const [autoPrintSlip, setAutoPrintSlip] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [kitchenModalOrders, setKitchenModalOrders] = useState<PendingOrderForApproval[] | null>(null);

  // Modal Xóa
  const [deletingOrder, setDeletingOrder] = useState<PendingOrderForApproval | null>(null);

  // Modal xác nhận duyệt nhanh đơn Đỏ (Thiếu nguyên vật liệu BOM)
  const [confirmingRedOrder, setConfirmingRedOrder] = useState<PendingOrderForApproval | null>(null);

  // Modal xác nhận duyệt tất cả các đơn khi có đơn Đỏ
  const [confirmingBulkAllRedOrders, setConfirmingBulkAllRedOrders] = useState<PendingOrderForApproval[] | null>(null);

  // Modal xác nhận tạo thêm PXK nếu đơn đã có PXK
  const [confirmingPXK, setConfirmingPXK] = useState<{
    order: PendingOrderForApproval;
    existingCodes: string;
  } | null>(null);

  // Số lượng món cần sản xuất trong bếp
  const [kitchenProductionCount, setKitchenProductionCount] = useState(() => getKitchenProductionList().length);
  useEffect(() => {
    const updateCount = () => setKitchenProductionCount(getKitchenProductionList().length);
    window.addEventListener(KITCHEN_PRODUCTION_EVENT, updateCount);
    return () => window.removeEventListener(KITCHEN_PRODUCTION_EVENT, updateCount);
  }, []);

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

  // 1. Thao tác XÓA đơn hàng
  const handleConfirmDelete = () => {
    if (!deletingOrder) return;
    const nextApprovedSet = addOrderToApprovedKeys(deletingOrder);
    setApprovedKeySet(nextApprovedSet);
    setLocalOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id && o.code !== deletingOrder.code));
    try {
      const pendingList: any[] = JSON.parse(localStorage.getItem('vietthang_pending_orders') || '[]');
      const filteredPending = pendingList.filter((p) => p.id !== deletingOrder.id && p.code !== deletingOrder.code);
      localStorage.setItem('vietthang_pending_orders', JSON.stringify(filteredPending));
    } catch (e) {
      console.error(e);
    }
    showNotification('success', `Đã xóa đơn hàng ${deletingOrder.code} thành công!`);
    setDeletingOrder(null);
  };

  // 3. Thao tác COPY đơn: sang trang /orders/add để tạo phiếu có sản phẩm giống hệt
  const handleCopyOrderTomorrow = (order: PendingOrderForApproval) => {
    navigate('/orders/add', {
      state: {
        copyOrder: order,
        from: 'approval',
      },
    });
  };

  // 4. Thao tác TẠO PXK từ phiếu
  // PXK sẽ giống nó nhưng khác background xanh lá nhạt, mã PXK, ghi nhận công nợ (PGH thì không), không có chữ E
  // Yêu cầu: PXK tạo ngay dưới phiếu giao hàng; nếu đã có PXK thì hỏi người dùng có muốn tạo thêm.
  const executeCreatePXK = (order: PendingOrderForApproval) => {
    const existingPXKs = activeOrders.filter(
      (o) =>
        (o.kind === 'pxk' || o.code.startsWith('PXK')) &&
        (o.parentOrderCode === order.code || o.code.startsWith(order.code.replace('PGH', 'PXK')))
    );

    let pxkCode = order.code.replace('PGH', 'PXK');
    if (existingPXKs.length > 0) {
      pxkCode = `${order.code.replace('PGH', 'PXK')}-${existingPXKs.length + 1}`;
    }

    const newOrder: PendingOrderForApproval = {
      ...order,
      id: `ord_pxk_${Date.now()}`,
      code: pxkCode,
      parentOrderCode: order.code,
      kind: 'pxk',
      hasTagE: false, // PXK không cần chữ E
      items: order.items.map((it) => ({ ...it })),
    };

    setLocalOrders((prev) => {
      const targetIdx = prev.findIndex((o) => o.id === order.id);
      if (targetIdx !== -1) {
        let insertIdx = targetIdx + 1;
        while (
          insertIdx < prev.length &&
          (prev[insertIdx].kind === 'pxk' || prev[insertIdx].code.startsWith('PXK')) &&
          (prev[insertIdx].parentOrderCode === order.code || prev[insertIdx].code.startsWith(order.code.replace('PGH', 'PXK')))
        ) {
          insertIdx++;
        }
        const nextOrders = [...prev];
        nextOrders.splice(insertIdx, 0, newOrder);
        return nextOrders;
      }
      return [newOrder, ...prev];
    });

    showNotification('success', `Đã tạo Phiếu xuất kho ${pxkCode} thành công!`);
  };

  const handleRequestCreatePXK = (order: PendingOrderForApproval) => {
    const existingPXKs = activeOrders.filter(
      (o) =>
        (o.kind === 'pxk' || o.code.startsWith('PXK')) &&
        (o.parentOrderCode === order.code || o.code.startsWith(order.code.replace('PGH', 'PXK')))
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

  // Lọc danh sách đơn hàng cần duyệt
  const filteredOrders = useMemo<PendingOrderForApproval[]>(() => {
    const kw = searchKeyword.trim().toLowerCase();

    return activeOrders
      .filter((order) => !checkIsOrderApproved(order, approvedKeySet))
      .filter((order) => {
      // 1. Lọc theo phân luồng
      if (filterCheckLevel !== 'all' && order.checkLevel !== filterCheckLevel) {
        return false;
      }

      // 3. Lọc theo ngày (Hỗ trợ chuẩn mọi định dạng: YYYY-MM-DD, DD/MM/YYYY, ISO)
      if (dateRange.from && dateRange.to) {
        const rawDate = order.orderDate || (order as any).dateStr || order.deliveryAt;
        const ordDate = parseOrderDate(rawDate);
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

      // 4. Lọc theo khu vực
      if (filterRegion === 'hn') {
        if (!order.locationAddress.toLowerCase().includes('hà nội')) return false;
      } else if (filterRegion === 'tn') {
        if (!order.locationAddress.toLowerCase().includes('thái nguyên')) return false;
      }

      // 5. Lọc theo Khách hàng
      if (filterCustomer && !order.customerName.toLowerCase().includes(filterCustomer.toLowerCase())) {
        return false;
      }

      // 6. Lọc theo Địa điểm
      if (filterLocation && !order.locationName.toLowerCase().includes(filterLocation.toLowerCase())) {
        return false;
      }

      // 7. Lọc theo Ship
      if (filterShipper) {
        const foundShip = DEFAULT_SHIPPING_METHODS.find((s) => s.id === filterShipper);
        if (foundShip && !order.locationAddress.toLowerCase().includes(foundShip.label.toLowerCase())) {
          // Cho phép nếu có điều kiện
        }
      }

      // 7. Lọc theo từ khóa chạy dài (Mã đơn, khách hàng, địa điểm, sản phẩm...)
      if (kw) {
        const matchCode = order.code.toLowerCase().includes(kw);
        const matchCust = order.customerName.toLowerCase().includes(kw);
        const matchLoc = order.locationName.toLowerCase().includes(kw);
        const matchProd = order.items.some(
          (it) =>
            it.productName.toLowerCase().includes(kw) ||
            it.productCode.toLowerCase().includes(kw)
        );
        if (!matchCode && !matchCust && !matchLoc && !matchProd) return false;
      }
      return true;
    });
  }, [activeOrders, approvedKeySet, filterCheckLevel, dateRange, filterRegion, filterCustomer, filterLocation, filterShipper, searchKeyword]);

  // Thống kê số lượng đơn tự động cập nhật theo các phiếu đang lọc/hiển thị
  const summaryStats = useMemo(() => {
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let totalGreenYellowAmount = 0;
    let totalAllAmount = 0;

    for (const order of filteredOrders) {
      const amount = Number(order.totalAmount) || 0;
      totalAllAmount += amount;
      if (order.checkLevel === 'green') {
        greenCount += 1;
        totalGreenYellowAmount += amount;
      } else if (order.checkLevel === 'yellow') {
        yellowCount += 1;
        totalGreenYellowAmount += amount;
      } else {
        redCount += 1;
      }
    }

    return {
      totalCount: filteredOrders.length,
      greenCount,
      yellowCount,
      redCount,
      greenAndYellowCount: greenCount + yellowCount,
      totalGreenYellowAmount,
      totalAllAmount,
    };
  }, [filteredOrders]);

  // Tổng số đơn đã duyệt (hiển thị trên tab phía trên bên phải)
  const totalApprovedCount = useMemo(() => {
    try {
      const approvedList: any[] = JSON.parse(localStorage.getItem('vietthang_approved_orders') || '[]');
      return 23 + approvedList.length;
    } catch {
      return 23;
    }
  }, [approvedKeySet]);

  // Đơn được tích chọn & tổng tiền của các đơn được chọn
  const selectedOrders = useMemo(() => {
    return filteredOrders.filter((o) => selectedOrderIds.includes(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const selectedOrdersTotalAmount = useMemo(() => {
    return selectedOrders.reduce(
      (sum, o) => sum + (Number(o.totalAmount) || 0) + (Number(o.totalVat) || 0),
      0
    );
  }, [selectedOrders]);

  // Tính tổng sản lượng bếp cần sản xuất thêm (+ Định mức BOM) từ các đơn Vàng và Đỏ (hoặc từ các đơn được chọn)
  const kitchenProductionNeeds = useMemo(() => {
    const productMap = new Map<
      string,
      {
        code: string;
        name: string;
        unit: string;
        totalOrdered: number;
        qtyFromStock: number;
        qtyToProduce: number;
        orderCount: number;
      }
    >();

    const targetList = kitchenModalOrders && kitchenModalOrders.length > 0 ? kitchenModalOrders : filteredOrders;

    targetList.forEach((ord) => {
      ord.items.forEach((it) => {
        const toProduce = Number(it.qtyToProduce) || 0;
        const ordered = Number(it.qtyOrdered) || 0;
        const stock = Number(it.qtyFromStock) || 0;
        const key = it.productCode || it.productName;

        if (!productMap.has(key)) {
          productMap.set(key, {
            code: it.productCode,
            name: it.productName,
            unit: it.unit,
            totalOrdered: ordered,
            qtyFromStock: stock,
            qtyToProduce: toProduce,
            orderCount: 1,
          });
        } else {
          const item = productMap.get(key)!;
          item.totalOrdered += ordered;
          item.qtyFromStock += stock;
          item.qtyToProduce += toProduce;
          item.orderCount += 1;
        }
      });
    });

    return Array.from(productMap.values()).sort(
      (a, b) => b.qtyToProduce - a.qtyToProduce
    );
  }, [activeOrders, kitchenModalOrders]);

  const approvalKitchenItems = useMemo(() => {
    return kitchenProductionNeeds.map((item) => ({
      sku: item.code,
      name: item.name,
      category: item.qtyToProduce > 0 ? 'Cần sản xuất' : 'Sẵn kho',
      unit: item.unit,
      totalQty: item.qtyToProduce > 0 ? item.qtyToProduce : item.totalOrdered,
      orderCount: item.orderCount,
    }));
  }, [kitchenProductionNeeds]);

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
      showNotification('warning', 'Các đơn bạn chọn đều đã có Phiếu xuất kho (PXK)!');
      return;
    }

    eligiblePGHs.forEach((pgh) => {
      executeCreatePXK(pgh);
    });

    showNotification(
      'success',
      `Đã tạo thành công ${eligiblePGHs.length} Phiếu xuất kho PXK!`
    );
    setSelectedOrderIds([]);
  };

  // Nút 3: In các đơn đã chọn (CHỈ IN PHIẾU GIAO HÀNG PGH, BỎ QUA PXK)
  const handlePrintSelectedOrders = () => {
    const pghOrders = selectedOrders.filter(
      (o) => o.kind !== 'pxk' && !o.code.startsWith('PXK')
    );
    if (pghOrders.length === 0) {
      showNotification('warning', 'Chỉ hỗ trợ in Phiếu giao hàng (PGH), các phiếu bạn chọn đều là PXK!');
      return;
    }
    if (pghOrders.length === 1) {
      setAutoPrintSlip(true);
      setViewingDeliverySlip(mapOrderToSlipData(pghOrders[0]));
    } else {
      setAutoPrintSlip(true);
      setViewingBatchSlipData(pghOrders.map((o) => mapOrderToSlipData(o)));
    }
  };

  // Hàm thực thi duyệt đơn: lưu vào danh sách đơn ngày mai giao, cập nhật tồn kho & trừ đơn khỏi bảng duyệt
  const executeApproveOrder = useCallback((order: PendingOrderForApproval, forceApprove = false) => {
    setProcessingOrderId(order.id);

    // 0. Lưu key vào danh sách đã duyệt để ẩn khỏi bảng ngay lập tức
    const nextApprovedSet = addOrderToApprovedKeys(order);
    setApprovedKeySet(nextApprovedSet);
    setSelectedOrderIds((prev) => prev.filter((id) => id !== order.id));

    // 1. Chuyển thành ApprovedOrderRecord cho trang Danh sách đơn hàng
    const pghCode = order.code.startsWith('PGH')
      ? order.code
      : `PGH-${order.code.replace(/^(DH-|ORD-)/, '')}`;

    const approvedRecord = {
      id: `ord_${order.id}`,
      originalId: String(order.id),
      code: pghCode,
      originalCode: order.code,
      kind: 'pgh' as const,
      hasTagE: false,
      dateStr: getTomorrowDateString(order.orderDate), // Đơn ngày mai giao theo đúng yêu cầu
      customerName: order.customerName,
      locationName: order.locationName,
      locationAddress: order.locationAddress || 'Hà Nội',
      contactPerson: (order as any).contactPerson || 'Dung - 097.484.6310',
      salesPerson: (order as any).salesPerson || 'Chị Ly - 086.709.9978',
      shipperName: (order as any).shipperName || 'A Lương',
      note: order.note || '',
      totalAmount: Number(order.totalAmount) || 0,
      items: order.items.map((it, idx) => ({
        id: it.id || String(idx),
        sku: it.productCode,
        name: it.productName,
        category: 'Thành phẩm',
        unit: it.unit,
        quantity: Number(it.qtyOrdered) || 0,
        returnedQty: 0,
        price: Number(it.unitPrice) || 0,
        vatRate: Number(it.vatRate) || 0,
      })),
    };

    // 2. Lưu vào localStorage vietthang_approved_orders
    try {
      const approvedList: any[] = JSON.parse(localStorage.getItem('vietthang_approved_orders') || '[]');
      approvedList.unshift(approvedRecord);
      localStorage.setItem('vietthang_approved_orders', JSON.stringify(approvedList));

      // Xóa khỏi vietthang_pending_orders nếu có
      const pendingList: any[] = JSON.parse(localStorage.getItem('vietthang_pending_orders') || '[]');
      const filteredPending = pendingList.filter((p) => p.id !== order.id && p.code !== order.code);
      localStorage.setItem('vietthang_pending_orders', JSON.stringify(filteredPending));
    } catch (e) {
      console.error(e);
    }

    // 2.1 QUY TẮC BẾP SẢN XUẤT: "khi mà ấn nút duyệt nếu đủ hàng thì thôi, nếu cần sx hay thiếu thì sẽ cộng vào đơn sản xuất"
    let addedToProductionMsg = '';
    if (order.checkLevel === 'yellow' || order.checkLevel === 'red') {
      const prodRes = addOrderToKitchenProduction(order);
      if (prodRes.added) {
        addedToProductionMsg = ` • Đã cộng ${prodRes.addedItemCount} món vào Tổng Bếp Sản Xuất!`;
      }
    }

    // 3. Nếu backend chạy, gọi API mutate
    const orderIdNumber = Number(order.id);
    if (!Number.isNaN(orderIdNumber) && orderIdNumber > 0) {
      approveSingleMutation.mutate(orderIdNumber);
    }

    setProcessingOrderId(null);

    // 4. CẬP NHẬT TỒN KHO & ĐÁNH GIÁ LẠI CÁC ĐƠN TIẾP THEO
    // Yêu cầu: "Báo xanh là kho sẵn hàng nếu duyệt xong đơn 1 xanh thì cập nhật lại số liệu để đơn tiếp theo check được còn tồn đủ không"
    setLocalOrders((prev) => {
      const remaining = prev.filter(
        (o) => o.id !== order.id && o.code !== order.code && !checkIsOrderApproved(o, nextApprovedSet)
      );

      if (order.checkLevel === 'green') {
        const consumedProducts = new Set(order.items.map((it) => it.productCode));
        return remaining.map((remOrder) => {
          if (remOrder.checkLevel === 'green') {
            const hasSharedProduct = remOrder.items.some((it) => consumedProducts.has(it.productCode));
            if (hasSharedProduct) {
              // Tồn kho thành phẩm đã được đơn trước lấy -> Đơn tiếp theo chuyển sang VÀNG (Cần sản xuất)
              return {
                ...remOrder,
                checkLevel: 'yellow' as OrderCheckLevel,
                items: remOrder.items.map((it) => ({
                  ...it,
                  qtyFromStock: '0.000',
                  qtyToProduce: it.qtyOrdered,
                })),
              };
            }
          }
          return remOrder;
        });
      }
      return remaining;
    });

    showNotification(
      'success',
      forceApprove
        ? `Đã xác nhận duyệt đơn ${order.code} (Thiếu BOM)!${addedToProductionMsg}`
        : `Đã duyệt đơn ${order.code} thành công!${addedToProductionMsg}`
    );
  }, [approveSingleMutation, showNotification]);

  // Duyệt đơn lẻ: Đơn Đỏ hiển thị popup xác nhận nhanh, Đơn Xanh/Vàng duyệt ngay
  const handleApproveSingleOrder = useCallback(
    (order: PendingOrderForApproval) => {
      if (order.checkLevel === 'red') {
        setConfirmingRedOrder(order);
      } else {
        executeApproveOrder(order, false);
      }
    },
    [executeApproveOrder]
  );

  // Duyệt hàng loạt danh sách đơn
  const executeApproveBulk = useCallback(
    (ordersToApprove: PendingOrderForApproval[]) => {
      ordersToApprove.forEach((ord) => {
        executeApproveOrder(ord, ord.checkLevel === 'red');
      });

      showNotification(
        'success',
        `Đã duyệt thành công tất cả ${ordersToApprove.length} đơn hàng!`
      );
      setSelectedOrderIds([]);
    },
    [executeApproveOrder, showNotification]
  );

  // Nút DUYỆT TẤT CẢ CÁC ĐƠN (thay thế nút in all đơn trên thanh header)
  const handleApproveAllOrders = useCallback(() => {
    if (filteredOrders.length === 0) {
      showNotification('warning', 'Hiện không có đơn hàng nào để duyệt!');
      return;
    }

    const redOrders = filteredOrders.filter((o) => o.checkLevel === 'red');
    if (redOrders.length > 0) {
      // Nếu có đơn Đỏ, hiện popup xác nhận nhanh trước khi duyệt toàn bộ
      setConfirmingBulkAllRedOrders(redOrders);
    } else {
      executeApproveBulk(filteredOrders);
    }
  }, [filteredOrders, executeApproveBulk, showNotification]);

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

  const handleOpenOrderDetail = (order: PendingOrderForApproval) => {
    setSelectedOrderForModal(order);
    if (onViewOrderDetail) {
      onViewOrderDetail(order);
    }
  };

  const handleCloseModal = () => {
    setSelectedOrderForModal(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-xs font-semibold text-slate-600">
          Đang tải danh sách đơn hàng cần duyệt &amp; đối chiếu định mức BOM...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-xs">
        <h3 className="text-base font-bold text-rose-900">
          Lỗi tải danh sách duyệt đơn hàng
        </h3>
        <p className="mt-1 text-sm text-rose-700">
          {error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-rose-700 cursor-pointer"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

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
          <span className="font-bold text-slate-800">DANH SÁCH ĐƠN HÀNG CẦN DUYỆT</span>
        </div>

        {/* 2 LOẠI DANH SÁCH RÕ RÀNG */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => navigate('/orders/list')}
            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-semibold hover:bg-white/60 transition flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircleOutlined className="text-emerald-600" />
            <span>Danh sách đơn hàng (Đã duyệt)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              {totalApprovedCount}
            </span>
          </button>

          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ClockCircleOutlined className="text-amber-600" />
            <span>Đơn hàng cần duyệt</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              {summaryStats.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/kitchen/production')}
            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <FireOutlined className="text-rose-500" />
            <span>Tổng bếp sản xuất</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px]">
              {kitchenProductionCount}
            </span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO TỰ ĐỘNG THƯ VIỆN ANT DESIGN (HIỆN GÓC BÊN TRÁI VÀ TỰ TẮT) */}
      {notificationContextHolder}

      {/* THANH BANNER MÀU ĐEN (ĐỒNG BỘ 100% PADDING & STYLE VỚI TRANG DANH SÁCH) */}
      <div className="bg-[#0f172a] text-white rounded-2xl px-5 py-3.5 shadow-md flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap">
        {/* Nhóm bên trái: Icon + Tiêu đề + Các huy hiệu phân luồng */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <AppstoreOutlined className="text-base text-slate-300" />
            <span className="text-sm font-extrabold uppercase tracking-wide">
              ĐƠN CẦN DUYỆT
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold flex-nowrap shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
              TỔNG {summaryStats.totalCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>ĐỦ HÀNG {summaryStats.greenCount}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-700/60 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>CẦN SX {summaryStats.yellowCount}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700/60 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span>THIẾU HÀNG {summaryStats.redCount}</span>
            </span>
            <span className="px-3 py-1 rounded-lg bg-blue-950/70 text-blue-300 border border-blue-600/60 font-black">
              DỰ KIẾN {summaryStats.totalAllAmount.toLocaleString('vi-VN')} VNĐ
            </span>
          </div>
        </div>

        {/* Nhóm bên phải: Nút Xem đơn bếp, In all đơn & Nút toggle HÔM NAY / NGÀY MAI */}
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {/* NÚT XEM ĐƠN BẾP */}
          <button
            type="button"
            onClick={() => {
              setKitchenModalOrders(null);
              setIsKitchenModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-rose-500/40 whitespace-nowrap"
            title="Xem báo cáo tổng hợp lượng hàng cần chuẩn bị (Tổng đơn hàng)"
          >
            <FireOutlined className="text-amber-200" />
            <span>TỔNG ĐƠN HÀNG</span>
          </button>

          {/* NÚT TỔNG BẾP SẢN XUẤT */}
          <button
            type="button"
            onClick={() => navigate('/kitchen/production')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-400/40 whitespace-nowrap"
            title="Đến trang Tổng Bếp Sản Xuất (đơn cần SX + bù định mức an toàn)"
          >
            <FireOutlined className="text-yellow-200" />
            <span>TỔNG BẾP</span>
          </button>

          {/* NÚT DUYỆT TẤT CẢ CÁC ĐƠN */}
          <button
            type="button"
            onClick={handleApproveAllOrders}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-500/40 whitespace-nowrap"
            title="Duyệt tất cả các đơn hàng đang hiển thị"
          >
            <CheckCircleOutlined className="text-white" />
            <span>DUYỆT TẤT CẢ</span>
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

      {/* KHỐI BỘ LỌC ĐA TẦNG (GIAO DIỆN CHUẨN CÁC TRANG, KHÔNG BÔI ĐẬM, FONT TO LÊN 1 NẤC) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
        {/* HÀNG 1: Phân luồng Xanh/Vàng/Đỏ, Date range chuẩn, Chọn khu vực */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          {/* Phân luồng */}
          <div className="w-full">
            <FormControl fullWidth size="small">
              <Select
                value={filterCheckLevel}
                onChange={(e) => setFilterCheckLevel(e.target.value as 'all' | OrderCheckLevel)}
                displayEmpty
                renderValue={(val) => {
                  if (val === 'green') return <span className="font-normal text-slate-800">Đủ hàng ({summaryStats.greenCount})</span>;
                  if (val === 'yellow') return <span className="font-normal text-slate-800">Cần SX ({summaryStats.yellowCount})</span>;
                  if (val === 'red') return <span className="font-normal text-slate-800">Thiếu hàng ({summaryStats.redCount})</span>;
                  return <span className="text-slate-600 font-normal">Tất cả trạng thái ({summaryStats.totalCount})</span>;
                }}
                sx={commonSelectSx}
                MenuProps={commonMenuProps}
              >
                <MenuItem value="all">
                  <span className="font-normal">Tất cả trạng thái ({summaryStats.totalCount})</span>
                </MenuItem>
                <MenuItem value="green">
                  <span className="font-normal">Đủ hàng ({summaryStats.greenCount})</span>
                </MenuItem>
                <MenuItem value="yellow">
                  <span className="font-normal">Cần SX ({summaryStats.yellowCount})</span>
                </MenuItem>
                <MenuItem value="red">
                  <span className="font-normal">Thiếu hàng ({summaryStats.redCount})</span>
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

        {/* HÀNG 2: Chọn khách hàng, Chọn địa điểm, Chọn ship */}
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

      {/* BẢNG DANH SÁCH ĐƠN CẦN DUYỆT (TABLE GIỐNG TRANG DANH SÁCH + CỘT HÀNH ĐỘNG) */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3.5 w-44 text-center">THAO TÁC</th>
                <th className="px-4 py-3.5 w-32">MÃ</th>
                <th className="px-3 py-3.5 w-24">NGÀY</th>
                <th className="px-4 py-3.5 min-w-[200px]">KHÁCH HÀNG</th>
                <th className="px-4 py-3.5 min-w-[220px]">ĐỊA ĐIỂM</th>
                <th className="px-3 py-3.5 w-44">TRẠNG THÁI KHO &amp; BOM</th>
                <th className="px-4 py-3.5 w-28 text-right">TỔNG</th>
                <th className="px-4 py-3.5 w-44 text-center">HÀNH ĐỘNG</th>
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
                  const isRowApproving =
                    processingOrderId === ord.id &&
                    approveSingleMutation.isPending;
                  const config = CHECK_LEVEL_CONFIG[ord.checkLevel];

                  const isPXK = ord.kind === 'pxk' || ord.code.startsWith('PXK');
                  const isHovered = hoveredOrderId === ord.id;

                  return (
                    <React.Fragment key={ord.id}>
                      {/* DÒNG 1: THÔNG TIN CHÍNH (Bấm vào ngoài các nút để in phiếu ngay cho nhanh) */}
                      <tr
                        onClick={() => {
                          setAutoPrintSlip(true);
                          setViewingDeliverySlip(mapOrderToSlipData(ord));
                        }}
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
                                  state: { order: ord, from: 'approval' },
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
                              onClick={() => {
                                setAutoPrintSlip(false);
                                setViewingDeliverySlip(mapOrderToSlipData(ord));
                              }}
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

                          {ord.orderType === 'compensation' && (
                            <div className="mt-0.5">
                              <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                                Đơn bù
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Cột 3: Ngày */}
                        <td className="px-3 pt-3 pb-1 align-top font-semibold text-slate-700 whitespace-nowrap text-xs">
                          {formatDisplayDate(ord.orderDate || (ord as any).dateStr || ord.deliveryAt)}
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

                        {/* Cột 6: Trạng thái Kho & BOM */}
                        <td className="px-3 pt-3 pb-1 align-top whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${config.badgeClass}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${config.dotClass}`} />
                            <span>{config.label}</span>
                          </div>

                          {/* Nếu mức Đỏ: hiển thị số loại NVL BOM thiếu */}
                          {ord.checkLevel === 'red' && ord.materialShortages.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenOrderDetail(ord)}
                              className="mt-1 text-[11px] font-bold text-rose-600 hover:underline cursor-pointer block"
                            >
                              Thiếu {ord.materialShortages.length} loại NVL (Xem chi tiết)
                            </button>
                          )}
                        </td>

                        {/* Cột 7: Tổng tiền */}
                        <td className="px-4 pt-3 pb-1 align-top text-right font-black text-sm text-slate-900 whitespace-nowrap">
                          {Number(ord.totalAmount).toLocaleString('vi-VN')}
                        </td>

                        {/* CỘT 8: HÀNH ĐỘNG (DUYỆT ĐƠN - chặn click lan truyền ra tr) */}
                        <td
                          rowSpan={2}
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-3 align-middle text-center border-b border-slate-100 cursor-default"
                        >
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => void handleApproveSingleOrder(ord)}
                              disabled={isRowApproving}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                ord.checkLevel === 'red'
                                  ? 'bg-rose-600 hover:bg-rose-700'
                                  : ord.checkLevel === 'yellow'
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {isRowApproving ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <CheckOutlined className="text-xs" />
                              )}
                              <span>Duyệt</span>
                            </button>
                          </div>
                        </td>

                        {/* Cột 9: Checkbox (chặn click lan truyền ra tr) */}
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
                        onClick={() => {
                          setAutoPrintSlip(true);
                          setViewingDeliverySlip(mapOrderToSlipData(ord));
                        }}
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
                          colSpan={6}
                          className="px-4 pb-3 pt-0 text-[11px] text-slate-500 font-normal leading-relaxed border-b border-slate-100"
                        >
                          {ord.items
                            .map((it) => `${it.productName} x${it.qtyOrdered}${(it as any).returnedQty ? ` (Trả ${(it as any).returnedQty})` : ''} ${it.unit}`)
                            .join(' · ')}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shadow-2xs">
                        <CheckCircleOutlined />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {summaryStats.totalCount === 0
                          ? 'Tất cả đơn hàng đã được duyệt thành công!'
                          : 'Không tìm thấy đơn hàng cần duyệt nào phù hợp'}
                      </div>
                      <p className="text-xs text-slate-500 max-w-md">
                        {summaryStats.totalCount === 0
                          ? 'Toàn bộ đơn hàng đã được chuyển sang Danh sách đơn hàng ngày mai giao để chuẩn bị xuất kho và đi giao.'
                          : 'Hãy thử thay đổi điều kiện tìm kiếm hoặc bộ lọc thời gian.'}
                      </p>
                      {summaryStats.totalCount === 0 && (
                        <button
                          type="button"
                          onClick={() => navigate('/orders/list')}
                          className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircleOutlined />
                          <span>Xem danh sách đơn hàng ngày mai giao</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT ĐƠN HÀNG & NGUYÊN LIỆU BOM */}
      {selectedOrderForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Chi tiết phân bổ kho &amp; BOM: {selectedOrderForModal.code}
                </h3>
                <p className="text-xs text-slate-500">
                  Khách: {selectedOrderForModal.customerName} · Điểm:{' '}
                  {selectedOrderForModal.locationName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Bảng phân bổ sản phẩm thành phẩm */}
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                Sản phẩm đặt hàng &amp; Giữ hàng từ kho thành phẩm
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Mã SP</th>
                      <th className="px-3 py-2">Tên sản phẩm</th>
                      <th className="px-3 py-2 text-right">SL đặt</th>
                      <th className="px-3 py-2 text-right text-emerald-700">Lấy từ kho TP</th>
                      <th className="px-3 py-2 text-right text-amber-700">Cần sản xuất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrderForModal.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 font-mono">{it.productCode}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{it.productName}</td>
                        <td className="px-3 py-2 text-right">{formatQty(it.qtyOrdered)} {it.unit}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatQty(it.qtyFromStock)} {it.unit}</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-700">{formatQty(it.qtyToProduce)} {it.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng nguyên liệu BOM nếu đơn Đỏ */}
            {selectedOrderForModal.materialShortages.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-600">
                  Chi tiết nguyên liệu thiếu theo BOM (recipe_items)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-rose-200 bg-rose-50/40">
                  <table className="min-w-full divide-y divide-rose-200 text-left text-xs">
                    <thead className="bg-rose-100/70 font-semibold text-rose-900">
                      <tr>
                        <th className="px-3 py-2">Mã NL</th>
                        <th className="px-3 py-2">Tên nguyên liệu</th>
                        <th className="px-3 py-2 text-right">Tổng cần theo BOM</th>
                        <th className="px-3 py-2 text-right">Tồn khả dụng</th>
                        <th className="px-3 py-2 text-right">Số lượng thiếu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {selectedOrderForModal.materialShortages.map((m) => (
                        <tr key={m.materialId}>
                          <td className="px-3 py-2 font-mono text-rose-900">{m.materialCode}</td>
                          <td className="px-3 py-2 font-semibold text-rose-950">{m.materialName}</td>
                          <td className="px-3 py-2 text-right">{formatQty(m.requiredQty)} {m.unit}</td>
                          <td className="px-3 py-2 text-right text-emerald-700">{formatQty(m.availableQty)} {m.unit}</td>
                          <td className="px-3 py-2 text-right font-bold text-rose-700">-{formatQty(m.shortageQty)} {m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setViewingDeliverySlip(mapOrderToSlipData(selectedOrderForModal))}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Xem phiếu giao hàng</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedOrderForModal;
                    handleCloseModal();
                    void handleApproveSingleOrder(target);
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
                >
                  Duyệt đơn hàng này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: XEM ĐƠN BẾP (BÁO CÁO KẾ HOẠCH SẢN XUẤT HÔM NAY - BẢNG FULL + IN A4) */}
      <KitchenReportModal
        isOpen={isKitchenModalOpen}
        onClose={() => {
          setIsKitchenModalOpen(false);
          setKitchenModalOrders(null);
        }}
        items={approvalKitchenItems}
        title="BÁO CÁO TỔNG HỢP LƯỢNG HÀNG (TỔNG ĐƠN HÀNG)"
        subtitle="Tổng hợp số lượng sản phẩm cần chuẩn bị từ các đơn hàng cần duyệt"
        reportDate={getTodayDateStr()}
        deliveryDate={`Hôm nay (${getTodayDateStr()})`}
        totalOrdersCount={kitchenModalOrders ? kitchenModalOrders.length : filteredOrders.length}
      />

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
                <strong>{deletingOrder.customerName}</strong> ({deletingOrder.locationName})? Thao tác này sẽ loại bỏ phiếu khỏi danh sách chờ duyệt.
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

      {/* POPUP XÁC NHẬN NHANH DUYỆT ĐƠN ĐỎ (THIẾU NGUYÊN VẬT LIỆU BOM) */}
      {/* POPUP XÁC NHẬN NHANH DUYỆT ĐƠN ĐỎ (CHỈ HIỆN SẢN PHẨM THIẾU) */}
      {confirmingRedOrder && (() => {
        const missingProducts = confirmingRedOrder.items.filter(
          (it) =>
            (Number(it.qtyToProduce) || 0) > 0 ||
            (Number(it.qtyOrdered) - (Number(it.qtyFromStock) || 0)) > 0
        );
        const displayItems =
          missingProducts.length > 0 ? missingProducts : confirmingRedOrder.items;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-lg font-bold">
                  <ExclamationCircleOutlined />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase">
                    Sản phẩm thiếu trong đơn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mã đơn: <strong className="text-slate-800">{confirmingRedOrder.code}</strong> · {confirmingRedOrder.customerName}
                  </p>
                </div>
              </div>

              {/* Danh sách các sản phẩm thiếu */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-2">
                <div className="text-xs font-bold text-rose-800 uppercase tracking-wide flex items-center justify-between">
                  <span>Danh sách sản phẩm thiếu:</span>
                  <span className="text-rose-600 font-extrabold">{displayItems.length} sản phẩm</span>
                </div>

                <div className="divide-y divide-rose-100 bg-white rounded-lg border border-rose-100 overflow-hidden shadow-2xs">
                  {displayItems.map((it, idx) => {
                    const missingQty =
                      Number(it.qtyToProduce) ||
                      (Number(it.qtyOrdered) - (Number(it.qtyFromStock) || 0)) ||
                      Number(it.qtyOrdered);
                    return (
                      <div key={it.id || idx} className="p-3 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-xs">{it.productName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{it.productCode}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-rose-600">
                            Thiếu: {formatQty(missingQty)} {it.unit}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            (Đặt: {formatQty(it.qtyOrdered)})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingRedOrder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = confirmingRedOrder;
                    setConfirmingRedOrder(null);
                    executeApproveOrder(target, true);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckOutlined />
                  <span>Xác nhận duyệt &amp; Đưa vào sản xuất</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* POPUP XÁC NHẬN DUYỆT TẤT CẢ CÁC ĐƠN (CHỈ HIỆN SẢN PHẨM THIẾU) */}
      {confirmingBulkAllRedOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-lg font-bold">
                <ExclamationCircleOutlined />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  Sản phẩm thiếu trong các đơn mức Đỏ
                </h3>
                <p className="text-xs text-slate-500">
                  Duyệt toàn bộ <strong className="text-slate-800">{filteredOrders.length} đơn hàng</strong> (có {confirmingBulkAllRedOrders.length} đơn thiếu sản phẩm)
                </p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {confirmingBulkAllRedOrders.map((ro) => {
                const missingItems = ro.items.filter(
                  (it) =>
                    (Number(it.qtyToProduce) || 0) > 0 ||
                    (Number(it.qtyOrdered) - (Number(it.qtyFromStock) || 0)) > 0
                );
                const displayList = missingItems.length > 0 ? missingItems : ro.items;
                return (
                  <div key={ro.id} className="rounded-xl border border-rose-200 bg-rose-50/30 p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{ro.code} · {ro.customerName}</span>
                      <span className="text-[11px] text-rose-600 font-semibold">{displayList.length} món thiếu</span>
                    </div>
                    <div className="divide-y divide-rose-100 bg-white rounded-lg border border-rose-100 overflow-hidden shadow-2xs">
                      {displayList.map((it, idx) => {
                        const missingQty =
                          Number(it.qtyToProduce) ||
                          (Number(it.qtyOrdered) - (Number(it.qtyFromStock) || 0)) ||
                          Number(it.qtyOrdered);
                        return (
                          <div key={it.id || idx} className="p-2 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800">{it.productName}</span>
                            <span className="font-bold text-rose-600">Thiếu: {formatQty(missingQty)} {it.unit}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmingBulkAllRedOrders(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingBulkAllRedOrders(null);
                  executeApproveBulk(filteredOrders);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckOutlined />
                <span>Xác nhận duyệt tất cả</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL POPUP PHIẾU GIAO HÀNG ĐẦY ĐỦ THÔNG TIN */}
      <DeliverySlipModal
        isOpen={!!viewingDeliverySlip || !!viewingBatchSlipData}
        onClose={() => {
          setViewingDeliverySlip(null);
          setViewingBatchSlipData(null);
          setAutoPrintSlip(false);
        }}
        order={viewingDeliverySlip}
        batchOrders={viewingBatchSlipData || undefined}
        autoPrint={autoPrintSlip}
      />
    </div>
  );
};
