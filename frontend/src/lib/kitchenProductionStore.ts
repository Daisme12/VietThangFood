import { getTodayDateStr } from './formatters';
import { PendingOrderForApproval } from '../features/orders/types/order-approval.types';

export interface SafetyBufferConfig {
  defaultPercent: number; // Tỷ lệ định mức an toàn mặc định (e.g. 10%)
  productOverrides: Record<string, number>; // Cho phép tùy biến % riêng theo từng SKU/Mã SP
}

export interface ProductionSourceOrder {
  orderCode: string;
  customerName?: string;
  qty: number;
  checkLevel?: 'green' | 'yellow' | 'red';
}

export interface KitchenProductionItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  neededQty: number; // Tổng số lượng đơn đặt cần sản xuất (từ các đơn Cần SX / Thiếu hàng)
  safetyBufferPercent: number; // Định mức an toàn tính theo % (mặc định lấy theo config)
  safetyBufferQty: number; // Số lượng cộng thêm theo định mức an toàn (= Math.ceil(neededQty * safetyBufferPercent / 100))
  totalPlanQty: number; // Tổng số lượng bếp cần nấu/sản xuất thực tế (= neededQty + safetyBufferQty)
  status: 'pending' | 'cooking' | 'done'; // Trạng thái mẻ nấu
  sourceOrders: ProductionSourceOrder[]; // Các đơn hàng kích hoạt sản xuất món này
  dateStr: string; // Ngày sản xuất (DD/MM/YYYY)
  note?: string;
}

const STORAGE_KEY_ITEMS = 'vietthang_kitchen_production_items';
const STORAGE_KEY_BUFFER = 'vietthang_safety_buffer_config';
export const KITCHEN_PRODUCTION_EVENT = 'vietthang_kitchen_production_updated';

// 1. Cấu hình định mức an toàn
export function getSafetyBufferConfig(): SafetyBufferConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUFFER);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        defaultPercent: typeof parsed.defaultPercent === 'number' ? parsed.defaultPercent : 10,
        productOverrides: parsed.productOverrides || {},
      };
    }
  } catch (e) {
    console.error('Error reading safety buffer config:', e);
  }
  return {
    defaultPercent: 10, // Mặc định 10%
    productOverrides: {},
  };
}

export function saveSafetyBufferConfig(config: SafetyBufferConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_BUFFER, JSON.stringify(config));
    // Tự động cập nhật lại safetyBufferQty và totalPlanQty cho toàn bộ danh sách
    const items = getRawKitchenProductionItems();
    const updated = items.map((it) => {
      const percent = config.productOverrides[it.sku] !== undefined 
        ? config.productOverrides[it.sku] 
        : config.defaultPercent;
      const bufferQty = Math.ceil((it.neededQty * percent) / 100);
      return {
        ...it,
        safetyBufferPercent: percent,
        safetyBufferQty: bufferQty,
        totalPlanQty: it.neededQty + bufferQty,
      };
    });
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(KITCHEN_PRODUCTION_EVENT));
  } catch (e) {
    console.error('Error saving safety buffer config:', e);
  }
}

// 2. Dữ liệu mẫu khởi tạo cho Tổng Bếp Sản Xuất
function getInitialSeedProductionItems(): KitchenProductionItem[] {
  const todayStr = getTodayDateStr();
  const config = getSafetyBufferConfig();

  const seed = [
    {
      id: 'kp_1',
      sku: 'TP-TS-OLONG-1L',
      name: 'Cốt Trà Sữa Ô Long Rang Mộc (Chai 1L)',
      category: 'CỐT TRÀ SỮA',
      unit: 'Chai',
      neededQty: 36,
      status: 'pending' as const,
      sourceOrders: [
        {
          orderCode: 'ORD-2026-083',
          customerName: 'Đối Tác Nhượng Quyền Trà Sữa Đài Loan',
          qty: 36,
          checkLevel: 'yellow' as const,
        },
      ],
      dateStr: todayStr,
      note: 'Mẻ nấu sáng 8h',
    },
    {
      id: 'kp_2',
      sku: 'TS_NUONG_330',
      name: 'Trà Sữa Nướng Hàn Châu 330ml',
      category: 'TRÀ SỮA 330ML',
      unit: 'Chai',
      neededQty: 50,
      status: 'cooking' as const,
      sourceOrders: [
        {
          orderCode: 'ORD-2026-085',
          customerName: 'Chuỗi Trà Sữa TocoToco Ba Đình',
          qty: 50,
          checkLevel: 'yellow' as const,
        },
      ],
      dateStr: todayStr,
      note: 'Đang ủ trà',
    },
    {
      id: 'kp_3',
      sku: 'TP-TC-HOANGKIM',
      name: 'Topping Trân Châu Hoàng Kim Ủ Sẵn (Túi 2kg)',
      category: 'TOPPING',
      unit: 'Túi',
      neededQty: 25,
      status: 'pending' as const,
      sourceOrders: [
        {
          orderCode: 'ORD-2026-084',
          customerName: 'Chuỗi Trà Sữa Royal Tea House',
          qty: 25,
          checkLevel: 'red' as const,
        },
      ],
      dateStr: todayStr,
      note: 'Luộc 35 phút + ngâm đường nâu 20 phút',
    },
    {
      id: 'kp_4',
      sku: 'TS_THAI_330',
      name: 'Trà Sữa Thái Xanh Hàn Châu 330ml',
      category: 'TRÀ SỮA 330ML',
      unit: 'Chai',
      neededQty: 40,
      status: 'pending' as const,
      sourceOrders: [
        {
          orderCode: 'ORD-2026-086',
          customerName: 'Ding Tea Cầu Giấy',
          qty: 40,
          checkLevel: 'yellow' as const,
        },
      ],
      dateStr: todayStr,
      note: 'Dùng lá trà Thái nhập khẩu',
    },
    {
      id: 'kp_5',
      sku: 'TS_MATCHA_330',
      name: 'Trà Sữa Matcha Hàn Châu 330ml',
      category: 'TRÀ SỮA 330ML',
      unit: 'Chai',
      neededQty: 30,
      status: 'pending' as const,
      sourceOrders: [
        {
          orderCode: 'ORD-2026-087',
          customerName: 'The Alley Vincom',
          qty: 30,
          checkLevel: 'yellow' as const,
        },
      ],
      dateStr: todayStr,
      note: 'Matcha Uji Nhật Bản',
    },
    {
      id: 'kp_6',
      sku: 'PANNA_DAU_HO',
      name: 'Panna Cotta Dâu Tây (Hũ)',
      category: 'PANNA COTTA',
      unit: 'Hũ',
      neededQty: 20,
      status: 'done' as const,
      sourceOrders: [
        {
          orderCode: 'ORD-2026-088',
          customerName: 'Tiệm Bánh & Trà La Rose',
          qty: 20,
          checkLevel: 'yellow' as const,
        },
      ],
      dateStr: todayStr,
      note: 'Đã hoàn thành cấp lạnh',
    },
  ];

  return seed.map((it) => {
    const percent = config.productOverrides[it.sku] !== undefined 
      ? config.productOverrides[it.sku] 
      : config.defaultPercent;
    const bufferQty = Math.ceil((it.neededQty * percent) / 100);
    return {
      ...it,
      safetyBufferPercent: percent,
      safetyBufferQty: bufferQty,
      totalPlanQty: it.neededQty + bufferQty,
    };
  });
}

function getRawKitchenProductionItems(): KitchenProductionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading kitchen production items:', e);
  }
  const seed = getInitialSeedProductionItems();
  try {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(seed));
  } catch (e) {
    console.error(e);
  }
  return seed;
}

// 3. Lấy danh sách sản xuất bếp (hỗ trợ lọc theo ngày)
export function getKitchenProductionList(dateFilter?: string): KitchenProductionItem[] {
  const items = getRawKitchenProductionItems();
  if (!dateFilter || dateFilter === 'all') {
    return items;
  }
  return items.filter((it) => it.dateStr === dateFilter);
}

// 4. Thêm đơn hàng vào Tổng Bếp Sản Xuất
// QUY TẮC: "khi mà ấn nút duyệt nếu đủ hàng thì thôi, nếu cần sx hay thiếu thì sẽ cộng vào đơn sản xuất"
export function addOrderToKitchenProduction(order: PendingOrderForApproval): {
  added: boolean;
  addedItemCount: number;
  totalQtyAdded: number;
} {
  // 1. Kiểm tra trạng thái: Nếu đủ hàng (green) thì thôi không cộng
  if (order.checkLevel === 'green') {
    return { added: false, addedItemCount: 0, totalQtyAdded: 0 };
  }

  // 2. Nếu là Cần SX (yellow) hoặc Thiếu hàng / Thiếu BOM (red): gom các món cần sản xuất
  const config = getSafetyBufferConfig();
  const currentItems = getRawKitchenProductionItems();

  // Xác định ngày đơn hàng
  const orderDateStr = order.orderDate
    ? (order.orderDate.includes('/') 
        ? order.orderDate 
        : `${order.orderDate.slice(8, 10)}/${order.orderDate.slice(5, 7)}/${order.orderDate.slice(0, 4)}`)
    : getTodayDateStr();

  let addedItemCount = 0;
  let totalQtyAdded = 0;

  order.items.forEach((ordItem) => {
    // Số lượng cần sản xuất: ưu tiên lấy qtyToProduce, nếu chưa có thì lấy qtyOrdered
    const qtyToProduceNum = parseFloat(ordItem.qtyToProduce || '0');
    const effectiveQty = qtyToProduceNum > 0 ? qtyToProduceNum : parseFloat(ordItem.qtyOrdered || '0');

    if (effectiveQty <= 0) return;

    addedItemCount += 1;
    totalQtyAdded += effectiveQty;

    const sku = ordItem.productCode || ordItem.id || 'SP-GEN';
    const name = ordItem.productName || 'Sản phẩm chưa đặt tên';
    const unit = ordItem.unit || 'Chai';
    const category = ordItem.packageSpec?.toUpperCase().includes('CHAI') 
      ? 'TRÀ SỮA 330ML' 
      : (ordItem.packageSpec?.toUpperCase().includes('LÍT') || ordItem.packageSpec?.toUpperCase().includes('LIT') ? 'CỐT TRÀ SỮA' : 'SẢN XUẤT CHUNG');

    // Tìm xem mặt hàng này trong ngày đã có trong kế hoạch bếp chưa
    const existingIndex = currentItems.findIndex(
      (it) => (it.sku === sku || it.name.trim().toLowerCase() === name.trim().toLowerCase()) && it.dateStr === orderDateStr
    );

    const sourceEntry: ProductionSourceOrder = {
      orderCode: order.code,
      customerName: order.customerName,
      qty: effectiveQty,
      checkLevel: order.checkLevel,
    };

    if (existingIndex >= 0) {
      // Cộng dồn vào sản phẩm đã có
      const item = currentItems[existingIndex];
      const newNeededQty = item.neededQty + effectiveQty;
      const percent = config.productOverrides[item.sku] !== undefined 
        ? config.productOverrides[item.sku] 
        : config.defaultPercent;
      const newBufferQty = Math.ceil((newNeededQty * percent) / 100);

      currentItems[existingIndex] = {
        ...item,
        neededQty: newNeededQty,
        safetyBufferPercent: percent,
        safetyBufferQty: newBufferQty,
        totalPlanQty: newNeededQty + newBufferQty,
        sourceOrders: [...item.sourceOrders, sourceEntry],
      };
    } else {
      // Tạo mới mặt hàng vào bảng sản xuất bếp
      const percent = config.productOverrides[sku] !== undefined 
        ? config.productOverrides[sku] 
        : config.defaultPercent;
      const bufferQty = Math.ceil((effectiveQty * percent) / 100);

      const newItem: KitchenProductionItem = {
        id: `kp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        sku,
        name,
        category,
        unit,
        neededQty: effectiveQty,
        safetyBufferPercent: percent,
        safetyBufferQty: bufferQty,
        totalPlanQty: effectiveQty + bufferQty,
        status: 'pending',
        sourceOrders: [sourceEntry],
        dateStr: orderDateStr,
        note: `Tự động từ duyệt đơn ${order.code} (${order.checkLevel === 'yellow' ? 'Cần SX' : 'Thiếu hàng'})`,
      };
      currentItems.unshift(newItem);
    }
  });

  try {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(currentItems));
    window.dispatchEvent(new CustomEvent(KITCHEN_PRODUCTION_EVENT));
  } catch (e) {
    console.error('Error saving updated kitchen production list:', e);
  }

  return {
    added: true,
    addedItemCount,
    totalQtyAdded,
  };
}

// 5. Cập nhật trạng thái sản xuất (Chờ nấu -> Đang nấu -> Hoàn thành)
export function updateProductionItemStatus(
  itemId: string,
  newStatus: 'pending' | 'cooking' | 'done'
): void {
  const items = getRawKitchenProductionItems();
  const updated = items.map((it) => (it.id === itemId ? { ...it, status: newStatus } : it));
  try {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(KITCHEN_PRODUCTION_EVENT));
  } catch (e) {
    console.error(e);
  }
}
