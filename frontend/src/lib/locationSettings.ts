export interface LocationCopyConfig {
  defaultCopies: number;
  locationCopies: Record<string, number>;
}

export const DEFAULT_LOCATION_LIST: Array<{ id: string; name: string; note: string; copies: number }> = [
  { id: 'hn_cva', name: 'CHU VĂN THỨC', note: 'Cơ sở THPT Chu Văn An', copies: 2 },
  { id: 'yen_thuc', name: 'YẾN THỨC', note: 'Cơ sở Yến Thức', copies: 2 },
  { id: 'hn_bk', name: 'Hà Nội - Hai Bà Trưng', note: 'Bách Khoa', copies: 2 },
  { id: 'hn_cg', name: 'Hà Nội - Cầu Giấy', note: 'FPT Tower', copies: 2 },
  { id: 'hn_vt', name: 'Hà Nội - Cầu Giấy', note: 'Viettel', copies: 2 },
  { id: 'hn_qg', name: 'Hà Nội - Cầu Giấy', note: 'Đại Học Quốc Gia', copies: 2 },
  { id: 'hn_kn', name: 'Hà Nội - Nam Từ Liêm', note: 'Keangnam', copies: 2 },
];

const STORAGE_KEY = 'vietthang_location_copy_settings';

export const getLocationCopyConfig = (): LocationCopyConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        defaultCopies: Number(parsed.defaultCopies) || 2,
        locationCopies: {
          ...DEFAULT_LOCATION_LIST.reduce((acc, loc) => ({ ...acc, [loc.id]: loc.copies, [loc.name]: loc.copies }), {}),
          ...(parsed.locationCopies || {}),
        },
      };
    }
  } catch (e) {
    console.error('Error reading location copy config:', e);
  }
  return {
    defaultCopies: 2,
    locationCopies: DEFAULT_LOCATION_LIST.reduce((acc, loc) => ({ ...acc, [loc.id]: loc.copies, [loc.name]: loc.copies }), {}),
  };
};

export const saveLocationCopyConfig = (config: LocationCopyConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('location_copy_config_updated'));
  } catch (e) {
    console.error('Error saving location copy config:', e);
  }
};

export const getCopiesForLocation = (locationIdOrName?: string): number => {
  if (!locationIdOrName) return 2;
  const config = getLocationCopyConfig();
  const loc = locationIdOrName.toLowerCase();

  // 1. Khớp theo id hoặc tên lưu trong bảng cấu hình
  for (const [key, copies] of Object.entries(config.locationCopies)) {
    if (key.toLowerCase() === loc) return Number(copies) || 2;
  }

  // 2. Khớp chuỗi phụ
  if (loc.includes('chu văn an') || loc.includes('chu văn thức')) return Number(config.locationCopies.hn_cva) || 2;
  if (loc.includes('yến thức')) return Number(config.locationCopies.yen_thuc) || 2;
  if (loc.includes('bách khoa')) return Number(config.locationCopies.hn_bk) || 2;
  if (loc.includes('fpt')) return Number(config.locationCopies.hn_cg) || 2;
  if (loc.includes('viettel')) return Number(config.locationCopies.hn_vt) || 2;
  if (loc.includes('quốc gia')) return Number(config.locationCopies.hn_qg) || 2;
  if (loc.includes('keangnam')) return Number(config.locationCopies.hn_kn) || 2;

  return config.defaultCopies || 2;
};

