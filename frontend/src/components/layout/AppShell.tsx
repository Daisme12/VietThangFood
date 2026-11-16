import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  OrderedListOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  ShoppingOutlined,
  PlusCircleOutlined,
  CameraOutlined,
  FileExcelOutlined,
  InboxOutlined,
  AuditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  SearchOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  FormOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  BarsOutlined,
  DollarOutlined,
  ShopOutlined,
  BankOutlined,
  TagOutlined,
  CreditCardOutlined,
  DollarCircleOutlined,
  PayCircleOutlined,
  PieChartOutlined,
  AccountBookOutlined,
  SettingOutlined,
  FolderOpenOutlined,
  ToolOutlined,
  UserSwitchOutlined,
  LogoutOutlined,
  RightOutlined,
  UnorderedListOutlined,
  EnvironmentOutlined,
  ContactsOutlined,
  FireOutlined,
} from '@ant-design/icons';

export interface AppShellProps {
  children?: React.ReactNode;
}

interface SubMenuItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

interface MainMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  items?: SubMenuItem[];
}

const MENU_DATA: MainMenuItem[] = [
  {
    id: 'orders',
    label: 'QL PHIẾU HÀNG',
    icon: <ShoppingOutlined />,
    items: [
      { label: 'DANH SÁCH', to: '/orders/list', icon: <UnorderedListOutlined /> },
      { label: 'ĐƠN CẦN DUYỆT', to: '/orders/approval', icon: <AuditOutlined /> },
      { label: 'TỔNG BẾP SẢN XUẤT', to: '/kitchen/production', icon: <FireOutlined /> },
      { label: 'TẠO PHIẾU GIAO HÀNG', to: '/orders/add', icon: <PlusCircleOutlined /> },
      { label: 'NHẬP PGH TỪ ẢNH', to: '/orders/approval', icon: <CameraOutlined /> },
      { label: 'NHẬP PGH TỪ EXCEL', to: '/orders/approval', icon: <FileExcelOutlined /> },
    ],
  },
  {
    id: 'inventory',
    label: 'QL KHO',
    icon: <InboxOutlined />,
    items: [
      { label: 'NHẬP HÀNG', to: '/inventory/purchases', icon: <ShoppingOutlined /> },
      { label: 'KIỂM KÊ CUỐI NGÀY', to: '/inventory/stocktake', icon: <AuditOutlined /> },
      { label: 'HỦY / HAO HỤT', to: '/inventory/waste-loss', icon: <DeleteOutlined /> },
      { label: 'BÁO CÁO TỒN KHO', to: '/inventory/report', icon: <BarChartOutlined /> },
      { label: 'TỒN KHO TỨC THỜI', to: '/inventory/overview', icon: <SearchOutlined /> },
    ],
  },
  {
    id: 'production',
    label: 'KẾ HOẠCH SẢN XUẤT',
    icon: <CalendarOutlined />,
    items: [
      { label: 'TỔNG BẾP SẢN XUẤT', to: '/kitchen/production', icon: <FireOutlined /> },
      { label: 'TỔNG SẢN XUẤT', to: '/kitchen/production', icon: <AppstoreOutlined /> },
      { label: 'GHI NHẬN SẢN XUẤT', to: '/production/record', icon: <FormOutlined /> },
      { label: 'ĐỊNH MỨC BOM', to: '/production/bom', icon: <ApartmentOutlined /> },
      { label: 'ĐỊNH MỨC AN TOÀN', to: '/production/safety-stock', icon: <SafetyCertificateOutlined /> },
    ],
  },
  {
    id: 'products',
    label: 'QL HÀNG HOÁ',
    icon: <TagsOutlined />,
    items: [
      { label: 'DANH SÁCH SẢN PHẨM', to: '/settings/categories', icon: <BarsOutlined /> },
      { label: 'BẢNG GIÁ & ĐỊNH LƯỢNG', to: '/settings/categories', icon: <DollarOutlined /> },
    ],
  },
  {
    id: 'customers',
    label: 'QL KHÁCH HÀNG',
    icon: <TeamOutlined />,
    items: [
      { label: 'DANH SÁCH KHÁCH HÀNG', to: '/customers', icon: <ContactsOutlined /> },
      { label: 'ĐIỂM GIAO HÀNG', to: '/customers', icon: <EnvironmentOutlined /> },
    ],
  },
  {
    id: 'suppliers',
    label: 'QL NHÀ CUNG CẤP',
    icon: <ShopOutlined />,
    items: [
      { label: 'DANH SÁCH NHÀ CUNG CẤP', to: '/suppliers', icon: <BankOutlined /> },
      { label: 'BẢNG GIÁ NGUYÊN LIỆU', to: '/suppliers', icon: <TagOutlined /> },
    ],
  },
  {
    id: 'cashflow',
    label: 'QL THU CHI',
    icon: <CreditCardOutlined />,
    items: [
      { label: 'PHIẾU THU TIỀN HÀNG', to: '/reports/debts', icon: <DollarCircleOutlined /> },
      { label: 'PHIẾU CHI TIỀN NVL', to: '/inventory/purchases', icon: <PayCircleOutlined /> },
    ],
  },
  {
    id: 'reports',
    label: 'BÁO CÁO',
    icon: <PieChartOutlined />,
    items: [
      { label: 'BÁO CÁO DOANH THU', to: '/reports/revenue', icon: <LineChartOutlined /> },
      { label: 'ĐỐI SOÁT CÔNG NỢ', to: '/reports/debts', icon: <AccountBookOutlined /> },
    ],
  },
  {
    id: 'system',
    label: 'HỆ THỐNG',
    icon: <SettingOutlined />,
    items: [
      { label: 'DANH MỤC HỆ THỐNG', to: '/settings/categories', icon: <FolderOpenOutlined /> },
      { label: 'CẤU HÌNH XƯỞNG', to: '/settings/config', icon: <ToolOutlined /> },
      { label: 'NGƯỜI DÙNG & PHÂN QUYỀN', to: '/settings/users', icon: <UserSwitchOutlined /> },
    ],
  },
];

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  // Trạng thái mở menu đa cấp
  const [menuOpen, setMenuOpen] = useState(false);
  // Mục đang hover ở Menu cấp 1
  const [hoveredCategory, setHoveredCategory] = useState<string>('orders');
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const activeMainItem = MENU_DATA.find((m) => m.id === hoveredCategory) || MENU_DATA[0];

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 font-sans">
      {/* =========================================================================
          TOP HEADER: NÚT HAMBURGER + CÁC BUTTON CHUYỂN TRANG NHANH
          ========================================================================= */}
      <header className="sticky top-0 z-40 h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3" ref={menuContainerRef}>
          {/* Nút Hamburger ☰ */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              menuOpen
                ? 'bg-slate-100 text-[#0d5c46]'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Menu hệ thống"
            aria-label="Menu hệ thống"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Các nút chuyển trang nhanh trên Header */}
          <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {/* Nút 1: Phiếu hàng */}
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${
                  isActive
                    ? 'bg-[#0f172a] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`
              }
            >
              <OrderedListOutlined className="text-sm" />
              <span>Phiếu hàng</span>
            </NavLink>

            {/* Nút 2: Doanh thu */}
            <NavLink
              to="/reports/revenue"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${
                  isActive
                    ? 'bg-[#0f172a] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`
              }
            >
              <LineChartOutlined className="text-sm" />
              <span>Doanh thu</span>
            </NavLink>

            {/* Nút 3: Xem nhanh (Dashboard) */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${
                  isActive || location.pathname === '/'
                    ? 'bg-[#0f172a] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`
              }
            >
              <ThunderboltOutlined className="text-sm" />
              <span>Xem nhanh</span>
            </NavLink>

            {/* Nút 4: Công nợ KH */}
            <NavLink
              to="/reports/debts"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${
                  isActive
                    ? 'bg-[#0f172a] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`
              }
            >
              <TeamOutlined className="text-sm" />
              <span>Công nợ KH</span>
            </NavLink>
          </nav>

          {/* =========================================================================
              CASCADING FLYOUT MENU: 2 CỘT CHUẨN XÁC THEO ẢNH MẪU
              Cột 1: Menu chính  |  Cột 2: Trang con khi hover
              ========================================================================= */}
          {menuOpen && (
            <div className="absolute left-4 top-14 mt-1 flex z-50 rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* CỘT 1: DANH SÁCH MENU CHÍNH (BÊN TRÁI) */}
              <div className="w-64 p-3 border-r border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    MENU
                  </div>

                  <div className="space-y-0.5">
                    {MENU_DATA.map((item) => {
                      const isHovered = hoveredCategory === item.id;
                      return (
                        <div
                          key={item.id}
                          onMouseEnter={() => setHoveredCategory(item.id)}
                          onClick={() => {
                            if (!item.items || item.items.length === 0) {
                              setMenuOpen(false);
                            }
                          }}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                            isHovered
                              ? 'bg-slate-100 text-slate-900'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 text-sm">
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </div>

                          {item.items && item.items.length > 0 && (
                            <RightOutlined className="text-slate-400 text-[10px]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Nút Đăng xuất ở dưới cùng */}
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      // xử lý đăng xuất
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 text-sm">
                      <LogoutOutlined />
                    </span>
                    <span>ĐĂNG XUẤT</span>
                  </button>
                </div>
              </div>

              {/* CỘT 2: SUBMENU KHI HOVER (BÊN PHẢI) */}
              {activeMainItem && activeMainItem.items && activeMainItem.items.length > 0 && (
                <div className="w-72 p-3 bg-white rounded-r-2xl">
                  <div className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {activeMainItem.label}
                  </div>

                  <div className="space-y-1">
                    {activeMainItem.items.map((subItem) => (
                      <button
                        key={subItem.label}
                        type="button"
                        onClick={() => {
                          navigate(subItem.to);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition text-left"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm">
                          {subItem.icon}
                        </span>
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phía bên phải Header: Thông tin tài khoản */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-right">
            <div>
              <p className="text-xs font-bold text-slate-900">
                {user?.fullName ?? 'Nguyễn Văn Thắng'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Admin / Quản trị viên
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-bold text-xs ring-1 ring-orange-200">
              VT
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          NỘI DUNG CHÍNH (TOÀN MÀN HÌNH THOÁNG ĐÃNG)
          ========================================================================= */}
      <main className="p-4 sm:p-6 lg:p-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
};
