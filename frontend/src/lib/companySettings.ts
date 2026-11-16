export interface CompanyDeliveryInfo {
  companyName: string;
  address: string;
  taxId: string;
  representative: string;
  phone: string;
}

export const DEFAULT_COMPANY_DELIVERY_INFO: CompanyDeliveryInfo = {
  companyName: 'CÔNG TY TNHH VIET THANG FOOD',
  address: 'Long Biên',
  taxId: '01N8006168',
  representative: '(Ông) Nguyễn Văn Thắng',
  phone: '086',
};

const STORAGE_KEY = 'vietthang_delivery_company_info';

export function getCompanyDeliveryInfo(): CompanyDeliveryInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_COMPANY_DELIVERY_INFO, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error reading company delivery info', e);
  }
  return DEFAULT_COMPANY_DELIVERY_INFO;
}

export function saveCompanyDeliveryInfo(info: CompanyDeliveryInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    // Thông báo cho các component khác cập nhật
    window.dispatchEvent(new Event('company_info_updated'));
  } catch (e) {
    console.error('Error saving company delivery info', e);
  }
}

