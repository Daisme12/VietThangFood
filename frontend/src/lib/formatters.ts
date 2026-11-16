export function formatCurrencyVnd(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatQuantity(value: string | number, maxDecimals = 3): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

export function formatDateTimeVi(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function docBlockBaSo(so: number, dayDu: boolean): string {
  const tram = Math.floor(so / 100);
  const chuc = Math.floor((so % 100) / 10);
  const donVi = so % 10;
  let ketQua = '';

  if (tram > 0 || dayDu) {
    ketQua += `${CHU_SO[tram]} trăm `;
  }

  if (chuc === 0) {
    if (donVi !== 0) {
      if (tram > 0 || dayDu) ketQua += 'lẻ ';
      ketQua += CHU_SO[donVi];
    }
  } else if (chuc === 1) {
    ketQua += 'mười ';
    if (donVi === 1) ketQua += 'một';
    else if (donVi === 5) ketQua += 'lăm';
    else if (donVi !== 0) ketQua += CHU_SO[donVi];
  } else {
    ketQua += `${CHU_SO[chuc]} mươi `;
    if (donVi === 1) ketQua += 'mốt';
    else if (donVi === 4) ketQua += 'tư';
    else if (donVi === 5) ketQua += 'lăm';
    else if (donVi !== 0) ketQua += CHU_SO[donVi];
  }

  return ketQua.trim();
}

/**
 * Đọc số tiền thành chữ tiếng Việt chuẩn xác
 */
export function convertNumberToVietnameseWords(n: number): string {
  if (n === 0) return 'Không đồng';
  if (n < 0) return `Âm ${convertNumberToVietnameseWords(Math.abs(n)).toLowerCase()}`;

  let so = Math.round(n);
  const donViLop = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const cacLop: number[] = [];

  while (so > 0) {
    cacLop.push(so % 1000);
    so = Math.floor(so / 1000);
  }

  let ketQua = '';
  for (let i = cacLop.length - 1; i >= 0; i--) {
    const giaTriLop = cacLop[i];
    if (giaTriLop > 0) {
      const docLop = docBlockBaSo(giaTriLop, i < cacLop.length - 1);
      ketQua += `${docLop} ${donViLop[i]} `;
    }
  }

  ketQua = ketQua.trim();
  if (!ketQua) return 'Không đồng';

  // Viết hoa chữ cái đầu và thêm đuôi "đồng"
  return ketQua.charAt(0).toUpperCase() + ketQua.slice(1) + ' đồng';
}

// Trả về ngày hiện tại theo đồng hồ hệ thống (mặc định 00:00:00)
export function getSystemToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Chuỗi ngày DD/MM/YYYY của ngày hôm nay
export function getTodayDateStr(): string {
  const d = getSystemToday();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

// Chuỗi ngày DD/MM/YYYY của ngày mai
export function getTomorrowDateStr(): string {
  const d = getSystemToday();
  d.setDate(d.getDate() + 1);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

// Phân tích mọi định dạng ngày (DD/MM/YYYY, YYYY-MM-DD, ISO string) thành Date
export function parseOrderDate(dateVal?: string | Date | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  const str = String(dateVal).trim();
  if (!str) return null;

  // DD/MM/YYYY hoặc YYYY/MM/DD
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day, 12, 0, 0);
        }
      } else {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day, 12, 0, 0);
        }
      }
    }
  }

  // YYYY-MM-DD hoặc ISO string: YYYY-MM-DDTHH:mm:ss...
  if (str.includes('-')) {
    const dateOnly = str.includes('T') ? str.split('T')[0] : str.split(' ')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day, 12, 0, 0);
        }
      } else {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day, 12, 0, 0);
        }
      }
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

// Format hiển thị chuẩn DD/MM/YYYY
export function formatDisplayDate(dateVal?: string | Date | null): string {
  if (!dateVal) return getTodayDateStr();
  const d = parseOrderDate(dateVal);
  if (!d) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

