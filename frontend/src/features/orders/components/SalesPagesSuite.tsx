import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyVnd, formatDateTimeVi, formatQuantity } from '../../../lib/formatters';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';

export interface SalesOrderLine {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  unit: string;
  qtyOrdered: number;
  qtyDelivered: number;
  unitPrice: number;
  vatRate: number;
}

export interface SalesOrderRecord {
  id: number;
  orderCode: string;
  orderType: 'normal' | 'compensate';
  parentOrderCode?: string;
  customerName: string;
  locationName: string;
  deliveryAddress: string;
  orderDate: string;
  deliveryAt: string;
  status: 'draft' | 'pending' | 'approved' | 'delivered' | 'cancelled' | 'blocked';
  checkLevel: 'green' | 'yellow' | 'red';
  cancelReason?: string;
  shortCloseReason?: string;
  items: SalesOrderLine[];
}

const INITIAL_SALES_ORDERS: SalesOrderRecord[] = [
  {
    id: 501,
    orderCode: 'DH-001',
    orderType: 'normal',
    customerName: 'Chuỗi Trà Sữa GongCha',
    locationName: 'Cơ sở Quận 1 - Nguyễn Huệ',
    deliveryAddress: '68 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
    orderDate: '2026-11-10T07:30:00.000Z',
    deliveryAt: '2026-11-10T15:00:00.000Z',
    status: 'approved',
    checkLevel: 'green',
    items: [
      {
        id: 1,
        productId: 10,
        sku: 'TP-TC-HOANGKIM-1KG',
        productName: 'Trân Châu Hoàng Kim (Túi 1kg)',
        unit: 'tui',
        qtyOrdered: 50,
        qtyDelivered: 50,
        unitPrice: 68000,
        vatRate: 10,
      },
      {
        id: 2,
        productId: 11,
        sku: 'TP-SYRUP-DUONGDEN-2L',
        productName: 'Sốt Đường Đen Hàn Quốc (Can 2L)',
        unit: 'can',
        qtyOrdered: 30,
        qtyDelivered: 30,
        unitPrice: 135000,
        vatRate: 10,
      },
    ],
  },
  {
    id: 502,
    orderCode: 'DH-002',
    orderType: 'normal',
    customerName: 'Hệ Thống Koi Thé Vietnam',
    locationName: 'Chi nhánh Thảo Điền Q2',
    deliveryAddress: '12 Xuân Thủy, Thảo Điền, TP. Thủ Đức',
    orderDate: '2026-11-10T08:15:00.000Z',
    deliveryAt: '2026-11-10T16:30:00.000Z',
    status: 'approved',
    checkLevel: 'yellow',
    items: [
      {
        id: 3,
        productId: 12,
        sku: 'TP-COT-TRASUA-OOLONG-5L',
        productName: 'Cốt Trà Sữa Oolong Rang Đậm (Can 5L)',
        unit: 'can',
        qtyOrdered: 40,
        qtyDelivered: 35,
        unitPrice: 245000,
        vatRate: 10,
      },
    ],
  },
  {
    id: 503,
    orderCode: 'DH-20261109-018',
    orderType: 'normal',
    customerName: 'Đại Lý Nguyên Liệu Pha Chế Miền Nam',
    locationName: 'Kho Trung Tâm Quận 10',
    deliveryAddress: '240 Đường 3/2, Quận 10, TP.HCM',
    orderDate: '2026-11-09T09:00:00.000Z',
    deliveryAt: '2026-11-09T17:00:00.000Z',
    status: 'delivered',
    checkLevel: 'green',
    items: [
      {
        id: 4,
        productId: 10,
        sku: 'TP-TC-HOANGKIM-1KG',
        productName: 'Trân Châu Hoàng Kim (Túi 1kg)',
        unit: 'tui',
        qtyOrdered: 80,
        qtyDelivered: 80,
        unitPrice: 68000,
        vatRate: 10,
      },
    ],
  },
  {
    id: 504,
    orderCode: 'DH-20261108-009',
    orderType: 'normal',
    customerName: 'Trà Sữa Phúc Long Partner',
    locationName: 'Cơ sở Phú Mỹ Hưng Q7',
    deliveryAddress: '105 Nguyễn Đức Cảnh, Quận 7, TP.HCM',
    orderDate: '2026-11-08T10:20:00.000Z',
    deliveryAt: '2026-11-08T18:00:00.000Z',
    status: 'cancelled',
    checkLevel: 'red',
    cancelReason: 'Khách đổi lịch khai trương sang tuần sau, yêu cầu hủy đơn tạm thời.',
    items: [
      {
        id: 5,
        productId: 11,
        sku: 'TP-SYRUP-DUONGDEN-2L',
        productName: 'Sốt Đường Đen Hàn Quốc (Can 2L)',
        unit: 'can',
        qtyOrdered: 25,
        qtyDelivered: 0,
        unitPrice: 135000,
        vatRate: 10,
      },
    ],
  },
];

// ============================================================================
// TRANG 2: DANH SÁCH ĐƠN HÀNG (Quản lý đơn, bộ lọc nâng cao, Đã giao cấm sửa, Hủy bắt buộc lý do)
// ============================================================================
export const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrderRecord[]>(INITIAL_SALES_ORDERS);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<SalesOrderRecord | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState('Chuỗi Trà Sữa GongCha');
  const [newLocation, setNewLocation] = useState('Cơ sở Quận 1 - Nguyễn Huệ');
  const [newQty, setNewQty] = useState<number>(30);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (
        searchTerm.trim() &&
        !o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  const handleConfirmCancel = () => {
    if (!cancellingOrder || !cancelReasonInput.trim()) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === cancellingOrder.id
          ? { ...o, status: 'cancelled', cancelReason: cancelReasonInput.trim() }
          : o,
      ),
    );
    setCancellingOrder(null);
    setCancelReasonInput('');
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const seq = String(orders.length + 1).padStart(3, '0');
    const code = `DH-${seq}`;
    const created: SalesOrderRecord = {
      id: Date.now(),
      orderCode: code,
      orderType: 'normal',
      customerName: newCustomer,
      locationName: newLocation,
      deliveryAddress: 'Địa chỉ giao hàng tiêu chuẩn theo điểm bán',
      orderDate: new Date().toISOString(),
      deliveryAt: new Date(Date.now() + 18 * 3600000).toISOString(),
      status: 'pending',
      checkLevel: 'green',
      items: [
        {
          id: Date.now() + 1,
          productId: 10,
          sku: 'TP-TC-HOANGKIM-1KG',
          productName: 'Trân Châu Hoàng Kim (Túi 1kg)',
          unit: 'tui',
          qtyOrdered: newQty,
          qtyDelivered: 0,
          unitPrice: 68000,
          vatRate: 10,
        },
      ],
    };
    setOrders((prev) => [created, ...prev]);
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            TRANG 2 • QUẢN LÝ ĐƠN HÀNG
          </span>
          <h2 className="mt-1 text-lg font-extrabold text-slate-900">
            Danh Sách Đơn Hàng Toàn Hệ Thống
          </h2>
          <p className="text-xs text-slate-500">
            Quy tắc nghiệp vụ: Mã tự động <code className="font-mono font-bold">DH-YYYYMMDD-XXX</code> • Đơn <strong>Đã giao (delivered)</strong> khóa chỉnh sửa • Hủy đơn bắt buộc nhập lý do.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => navigate('/orders/approval')}>
            Sang Trang 3: Duyệt Đơn
          </Button>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            + Tạo Đơn Hàng Mới
          </Button>
        </div>
      </div>

      {/* Bộ lọc nâng cao */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">
            Tìm mã đơn / Khách hàng
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="VD: DH-001 hoặc GongCha..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">
            Trạng thái đơn hàng
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt (pending)</option>
            <option value="approved">Đã duyệt (approved)</option>
            <option value="delivered">Đã giao - Khóa sửa (delivered)</option>
            <option value="cancelled">Đã hủy (cancelled)</option>
          </select>
        </div>
        <div className="flex items-end">
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
            Tổng số đơn lọc: <strong>{filteredOrders.length}</strong> đơn hàng
          </div>
        </div>
      </div>

      {/* Bảng đơn hàng */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3.5">Mã đơn</th>
                <th className="px-4 py-3.5">Khách hàng &amp; Điểm giao</th>
                <th className="px-4 py-3.5">Hạn giao</th>
                <th className="px-4 py-3.5 text-right">Tổng tiền dự kiến</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const total = order.items.reduce(
                  (acc, i) => acc + i.qtyOrdered * i.unitPrice * (1 + i.vatRate / 100),
                  0,
                );
                const isDelivered = order.status === 'delivered';
                return (
                  <tr key={order.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      {order.orderCode}
                      {order.orderType === 'compensate' && (
                        <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                          Giao bù ({order.parentOrderCode})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{order.customerName}</div>
                      <div className="text-slate-500">{order.locationName}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {formatDateTimeVi(order.deliveryAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                      {formatCurrencyVnd(total)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {order.status === 'delivered' && (
                        <StatusBadge color="green" label="Đã giao (Khóa sửa)" />
                      )}
                      {order.status === 'approved' && (
                        <StatusBadge color="blue" label="Đã duyệt - Chờ xuất" />
                      )}
                      {order.status === 'pending' && (
                        <StatusBadge color="yellow" label="Chờ duyệt BOM" />
                      )}
                      {order.status === 'cancelled' && (
                        <StatusBadge color="red" label="Đã hủy" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          🔒 Cấm sửa đơn đã giao
                        </span>
                      ) : order.status === 'cancelled' ? (
                        <span className="text-[11px] italic text-rose-600">
                          Lý do: {order.cancelReason}
                        </span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('/sales/delivery')}
                          >
                            Xuất kho (P.5)
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setCancellingOrder(order);
                              setCancelReasonInput('');
                            }}
                          >
                            Hủy đơn
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Hủy đơn bắt buộc nhập lý do */}
      <Modal
        isOpen={Boolean(cancellingOrder)}
        onClose={() => setCancellingOrder(null)}
        title={`Hủy đơn hàng ${cancellingOrder?.orderCode ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancellingOrder(null)}>
              Đóng
            </Button>
            <Button
              variant="danger"
              disabled={!cancelReasonInput.trim()}
              onClick={handleConfirmCancel}
            >
              Xác nhận hủy đơn
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Theo quy tắc mục 4.2 trong <code className="font-mono">activity.md</code>, hủy đơn hàng <strong>bắt buộc phải ghi rõ lý do</strong> để lưu vết kiểm toán:
          </p>
          <textarea
            rows={3}
            value={cancelReasonInput}
            onChange={(e) => setCancelReasonInput(e.target.value)}
            placeholder="Nhập lý do hủy đơn (bắt buộc)..."
            className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-rose-500 focus:outline-none"
          />
        </div>
      </Modal>

      {/* Modal Tạo đơn mới */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tạo Đơn Hàng Mới (Sinh mã tự động DH-YYYYMMDD-XXX)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleCreateOrder}>
              Lưu &amp; Đẩy sang Duyệt Đơn
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-700">Khách hàng</label>
            <input
              type="text"
              value={newCustomer}
              onChange={(e) => setNewCustomer(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-slate-700">Địa điểm giao hàng</label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-slate-700">
              Số lượng đặt: Trân Châu Hoàng Kim (Túi 1kg)
            </label>
            <input
              type="number"
              min={1}
              value={newQty}
              onChange={(e) => setNewQty(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// TRANG 4: ĐƠN HÔM NAY (ĐI ĐƠN) - Gom theo Khách hàng & Địa điểm + In phiếu giao hàng
// ============================================================================
export const TodayOrdersPage: React.FC = () => {
  const [printPreviewOrder, setPrintPreviewOrder] = useState<SalesOrderRecord | null>(null);
  const todayOrders = INITIAL_SALES_ORDERS.filter((o) => o.status === 'approved');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
            TRANG 4 • ĐƠN HÔM NAY (ĐI ĐƠN)
          </span>
          <h2 className="mt-1 text-lg font-extrabold text-slate-900">
            Điều Phối Đi Đơn Trong Ngày Gom Theo Khách Hàng &amp; Địa Điểm
          </h2>
          <p className="text-xs text-slate-500">
            Hỗ trợ in Phiếu Giao Hàng tiêu chuẩn (đầy đủ thông tin công ty, mã số thuế, VAT và 3 chữ ký xác nhận).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {todayOrders.map((order) => {
          const subtotal = order.items.reduce(
            (s, i) => s + i.qtyOrdered * i.unitPrice,
            0,
          );
          const vat = subtotal * 0.1;
          return (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-emerald-700">
                      {order.orderCode}
                    </span>
                    <StatusBadge color="green" label="Sẵn sàng đi đơn hôm nay" />
                  </div>
                  <h3 className="mt-1 text-sm font-extrabold text-slate-900">
                    {order.customerName} — <span className="text-teal-700">{order.locationName}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    📍 Địa chỉ nhận: {order.deliveryAddress} • ⏰ Hạn giao:{' '}
                    {formatDateTimeVi(order.deliveryAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setPrintPreviewOrder(order)}
                  >
                    🖨️ In Phiếu Giao Hàng (Có VAT &amp; Chữ ký)
                  </Button>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase">
                    <tr>
                      <th className="py-2">SKU</th>
                      <th className="py-2">Tên thành phẩm</th>
                      <th className="py-2 text-right">SL Đặt</th>
                      <th className="py-2 text-right">Đơn giá</th>
                      <th className="py-2 text-right">VAT (10%)</th>
                      <th className="py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 font-mono text-slate-600">{item.sku}</td>
                        <td className="py-2 font-semibold text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-2 text-right font-bold">
                          {formatQuantity(item.qtyOrdered)} {item.unit}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrencyVnd(item.unitPrice)}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrencyVnd(item.qtyOrdered * item.unitPrice * 0.1)}
                        </td>
                        <td className="py-2 text-right font-bold text-slate-900">
                          {formatCurrencyVnd(item.qtyOrdered * item.unitPrice * 1.1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex justify-end gap-6 border-t border-slate-100 pt-3 text-xs">
                <span>
                  Trước VAT: <strong>{formatCurrencyVnd(subtotal)}</strong>
                </span>
                <span>
                  Thuế VAT (10%): <strong>{formatCurrencyVnd(vat)}</strong>
                </span>
                <span className="text-emerald-700">
                  Tổng thanh toán: <strong>{formatCurrencyVnd(subtotal + vat)}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal In Phiếu Giao Hàng */}
      <Modal
        isOpen={Boolean(printPreviewOrder)}
        onClose={() => setPrintPreviewOrder(null)}
        title={`Bản In Phiếu Giao Hàng Kiêm Hóa Đơn — ${printPreviewOrder?.orderCode ?? ''}`}
        maxWidthClass="max-w-3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPrintPreviewOrder(null)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              🖨️ Xác nhận In ra giấy / PDF
            </Button>
          </>
        }
      >
        {printPreviewOrder && (
          <div className="space-y-4 rounded-xl border border-slate-300 bg-white p-6 text-xs text-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h4 className="text-sm font-black uppercase">
                  CÔNG TY TNHH SẢN XUẤT &amp; THỰC PHẨM VIỆT THẮNG (VIETTHANGFOOD)
                </h4>
                <p>MST: 0316889900 • Đ/c: KCN Tân Bình, Q. Tân Phú, TP. Hồ Chí Minh</p>
                <p>Hotline Điều Phối Kho: 1900 6868</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-black">
                  {printPreviewOrder.orderCode}
                </span>
                <p className="text-slate-500">Ngày in: 10/11/2026</p>
              </div>
            </div>

            <div>
              <p>
                <strong>Khách hàng:</strong> {printPreviewOrder.customerName}
              </p>
              <p>
                <strong>Điểm nhận hàng:</strong> {printPreviewOrder.locationName} (
                {printPreviewOrder.deliveryAddress})
              </p>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 p-2 text-left">Sản phẩm</th>
                  <th className="border border-slate-300 p-2 text-right">SL</th>
                  <th className="border border-slate-300 p-2 text-right">Đơn giá</th>
                  <th className="border border-slate-300 p-2 text-right">VAT 10%</th>
                  <th className="border border-slate-300 p-2 text-right">Tổng cộng</th>
                </tr>
              </thead>
              <tbody>
                {printPreviewOrder.items.map((it) => (
                  <tr key={it.id}>
                    <td className="border border-slate-300 p-2">{it.productName}</td>
                    <td className="border border-slate-300 p-2 text-right">
                      {it.qtyOrdered} {it.unit}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">
                      {formatCurrencyVnd(it.unitPrice)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">
                      {formatCurrencyVnd(it.qtyOrdered * it.unitPrice * 0.1)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-bold">
                      {formatCurrencyVnd(it.qtyOrdered * it.unitPrice * 1.1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-3 pt-6 text-center font-bold">
              <div>
                <p>NGƯỜI LẬP PHIẾU</p>
                <p className="mt-10 font-normal text-slate-500">(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p>THỦ KHO / GIAO NHẬN</p>
                <p className="mt-10 font-normal text-slate-500">(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p>KHÁCH HÀNG NHẬN</p>
                <p className="mt-10 font-normal text-slate-500">(Ký, đóng dấu xác nhận)</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================================================
// TRANG 5: PHIẾU XUẤT KHO (GIAO HÀNG) & POPUP GIAO BÙ PHẦN THIẾU (Quy tắc 3.2)
// ============================================================================
export const DeliveryNotePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderRecord>(
    INITIAL_SALES_ORDERS[1], // Đơn có thực_giao (35) < đặt_hàng (40) sẵn để test ngay
  );
  const [shortageModalOpen, setShortageModalOpen] = useState(false);
  const [shortAction, setShortAction] = useState<'compensate' | 'close'>('compensate');
  const [shortCloseReason, setShortCloseReason] = useState('');
  const [resultBanner, setResultBanner] = useState<string | null>(null);

  const handleQtyChange = (lineId: number, value: number) => {
    setSelectedOrder((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === lineId
          ? { ...item, qtyDelivered: Math.max(0, Math.min(item.qtyOrdered, value)) }
          : item,
      ),
    }));
  };

  const hasShortage = selectedOrder.items.some(
    (i) => i.qtyDelivered < i.qtyOrdered,
  );

  // Tính tiền theo SỐ LƯỢNG THỰC GIAO (Quy tắc 3.2)
  const totalBeforeVat = selectedOrder.items.reduce(
    (s, i) => s + i.qtyDelivered * i.unitPrice,
    0,
  );
  const totalVat = selectedOrder.items.reduce(
    (s, i) => s + i.qtyDelivered * i.unitPrice * (i.vatRate / 100),
    0,
  );
  const totalAmount = totalBeforeVat + totalVat;

  const handleConfirmDeliveryClick = () => {
    if (hasShortage) {
      setShortageModalOpen(true);
      return;
    }
    setResultBanner(
      `Đã xác nhận xuất kho phiếu PXK-${selectedOrder.orderCode}! Trừ kho thành phẩm và ghi nhận công nợ thực giao ${formatCurrencyVnd(totalAmount)}.`,
    );
  };

  const handleConfirmShortagePopup = () => {
    if (shortAction === 'close' && !shortCloseReason.trim()) return;
    setShortageModalOpen(false);
    if (shortAction === 'compensate') {
      setResultBanner(
        `Đã chốt xuất kho thực giao (${formatCurrencyVnd(totalAmount)}) VÀ tự động sinh đơn Giao bù DH-BU01 (gắn mã đơn gốc ${selectedOrder.orderCode}) đẩy sang Trang 3: Duyệt đơn hàng!`,
      );
    } else {
      setResultBanner(
        `Đã chốt xuất kho thực giao (${formatCurrencyVnd(totalAmount)}) và đóng phần thiếu với lý do: "${shortCloseReason}".`,
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          TRANG 5 • PHIẾU XUẤT KHO (GIAO HÀNG) &amp; XỬ LÝ GIAO BÙ (QUY TẮC 3.2)
        </span>
        <h2 className="mt-1 text-lg font-extrabold text-slate-900">
          Chốt Số Lượng Thực Giao • Tính Công Nợ Thực Tế • Tự Động Sinh Đơn Giao Bù
        </h2>
        <p className="text-xs text-slate-500">
          Quy tắc 3.2: Chỉ trừ kho thành phẩm và tính tiền/VAT/công nợ theo <strong>số lượng thực giao</strong>. Nếu <code className="font-mono">thực_giao &lt; đặt_hàng</code>, bắt buộc bật popup <strong>&quot;Giao bù phần thiếu?&quot;</strong>.
        </p>
      </div>

      {resultBanner && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
          <span>✅ {resultBanner}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/orders/approval')}
          >
            Xem đơn Giao bù tại Trang 3 →
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold text-slate-500">ĐANG XỬ LÝ PHIẾU XUẤT KHO CHO ĐƠN:</p>
            <h3 className="text-base font-black text-slate-900">
              {selectedOrder.orderCode} — {selectedOrder.customerName} ({selectedOrder.locationName})
            </h3>
          </div>
          {hasShortage ? (
            <StatusBadge color="yellow" label="Phát hiện: Thực giao < Đặt hàng (Sẽ hỏi Giao bù)" pulse />
          ) : (
            <StatusBadge color="green" label="Giao đủ 100% số lượng đặt" />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3 text-right">SL Đặt hàng</th>
                <th className="px-4 py-3 text-right">SL Thực giao (Cho phép sửa)</th>
                <th className="px-4 py-3 text-right">SL Thiếu</th>
                <th className="px-4 py-3 text-right">Đơn giá</th>
                <th className="px-4 py-3 text-right">Thành tiền (Theo thực giao)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedOrder.items.map((item) => {
                const shortage = Math.max(0, item.qtyOrdered - item.qtyDelivered);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="font-mono text-slate-500">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatQuantity(item.qtyOrdered)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={item.qtyOrdered}
                        value={item.qtyDelivered}
                        onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                        className="w-24 rounded-lg border border-emerald-400 bg-emerald-50/40 px-2.5 py-1.5 text-right font-bold text-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700">
                      {shortage > 0 ? `-${formatQuantity(shortage)} ${item.unit}` : '0'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrencyVnd(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      {formatCurrencyVnd(item.qtyDelivered * item.unitPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <div className="space-x-5 text-xs">
            <span>
              Tiền hàng thực giao: <strong>{formatCurrencyVnd(totalBeforeVat)}</strong>
            </span>
            <span>
              VAT (10%): <strong>{formatCurrencyVnd(totalVat)}</strong>
            </span>
            <span className="text-sm text-emerald-700">
              Công nợ ghi nhận: <strong>{formatCurrencyVnd(totalAmount)}</strong>
            </span>
          </div>
          <Button variant="primary" onClick={handleConfirmDeliveryClick}>
            Xác Nhận Xuất Kho &amp; Ghi Nhận Công Nợ
          </Button>
        </div>
      </div>

      {/* Popup bắt buộc khi thực_giao < đặt_hàng */}
      <Modal
        isOpen={shortageModalOpen}
        onClose={() => setShortageModalOpen(false)}
        title="Giao bù phần thiếu? (Quy tắc 3.2 - Phát hiện Thực giao < Đặt hàng)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShortageModalOpen(false)}>
              Quay lại
            </Button>
            <Button
              variant="primary"
              disabled={shortAction === 'close' && !shortCloseReason.trim()}
              onClick={handleConfirmShortagePopup}
            >
              Xác nhận xử lý phần thiếu
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            Hệ thống phát hiện số lượng thực giao nhỏ hơn số lượng khách đặt. Bạn có muốn{' '}
            <strong>Giao bù phần thiếu</strong> không?
          </div>

          <div className="space-y-2.5">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
              <input
                type="radio"
                name="shortAction"
                checked={shortAction === 'compensate'}
                onChange={() => setShortAction('compensate')}
                className="mt-0.5"
              />
              <div>
                <div className="font-bold text-slate-900">
                  CÓ — Tự động sinh đơn hàng Giao bù (Khuyên dùng)
                </div>
                <p className="text-slate-500">
                  Sinh ngay đơn mới (loại đơn: Giao bù, gắn mã đơn gốc{' '}
                  <code className="font-mono">{selectedOrder.orderCode}</code>) và tự động đẩy vào trang Duyệt đơn hàng.
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
              <input
                type="radio"
                name="shortAction"
                checked={shortAction === 'close'}
                onChange={() => setShortAction('close')}
                className="mt-0.5"
              />
              <div className="w-full">
                <div className="font-bold text-slate-900">
                  KHÔNG — Đóng phần thiếu và kết thúc đơn
                </div>
                <p className="text-slate-500">
                  Bắt buộc nhập lý do đóng phần thiếu bên dưới:
                </p>
                {shortAction === 'close' && (
                  <textarea
                    rows={2}
                    value={shortCloseReason}
                    onChange={(e) => setShortCloseReason(e.target.value)}
                    placeholder="VD: Khách đồng ý nhận 35 can, không cần giao bù 5 can còn lại..."
                    className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                )}
              </div>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// TRANG 6: ĐƠN ĐÃ HỦY (Xem lý do hủy & Khôi phục về trạng thái Nháp)
// ============================================================================
export const CancelledOrdersPage: React.FC = () => {
  const [cancelledList, setCancelledList] = useState<SalesOrderRecord[]>(
    INITIAL_SALES_ORDERS.filter((o) => o.status === 'cancelled'),
  );
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);

  const handleRestoreToDraft = (order: SalesOrderRecord) => {
    setCancelledList((prev) => prev.filter((o) => o.id !== order.id));
    setRestoredMessage(
      `Đã khôi phục đơn ${order.orderCode} (${order.customerName}) về trạng thái Nháp (draft) thành công!`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
          TRANG 6 • ĐƠN ĐÃ HỦY
        </span>
        <h2 className="mt-1 text-lg font-extrabold text-slate-900">
          Danh Sách Đơn Hàng Đã Hủy &amp; Khôi Phục Về Trạng Thái Nháp
        </h2>
        <p className="text-xs text-slate-500">
          Kiểm tra lý do hủy của từng đơn và cho phép Quản lý/Admin khôi phục về trạng thái Nháp (Draft).
        </p>
      </div>

      {restoredMessage && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900">
          ✅ {restoredMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3.5">Mã đơn</th>
              <th className="px-4 py-3.5">Khách hàng &amp; Địa điểm</th>
              <th className="px-4 py-3.5">Lý do hủy bắt buộc</th>
              <th className="px-4 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cancelledList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Không còn đơn hàng nào trong danh sách đã hủy.
                </td>
              </tr>
            ) : (
              cancelledList.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                    {order.orderCode}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900">{order.customerName}</div>
                    <div className="text-slate-500">{order.locationName}</div>
                  </td>
                  <td className="px-4 py-3.5 text-rose-700 font-medium">
                    {order.cancelReason}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleRestoreToDraft(order)}
                    >
                      ↺ Khôi phục về Nháp (Draft)
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

