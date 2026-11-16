import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkUpdateSettingsDto } from './dto/settings.dto';

export interface SystemSettingsMap {
  urgent_hours_threshold: string;
  order_prefix: string;
  invoice_prefix: string;
  company_name: string;
  company_tax_code: string;
  company_address: string;
  company_phone: string;
  invoice_logo_url: string;
  invoice_footer: string;
  [key: string]: string;
}

const DEFAULT_SETTINGS: Array<{
  settingKey: string;
  settingValue: string;
  description: string;
}> = [
  {
    settingKey: 'urgent_hours_threshold',
    settingValue: '24',
    description: 'Ngưỡng giờ ưu tiên duyệt đơn khẩn cấp (24h hoặc 48h)',
  },
  {
    settingKey: 'order_prefix',
    settingValue: 'DH',
    description: 'Tiền tố sinh mã đơn hàng tự động (VD: DH2611-0001)',
  },
  {
    settingKey: 'invoice_prefix',
    settingValue: 'PXK',
    description: 'Tiền tố sinh mã phiếu xuất kho tự động (VD: PXK2611-0001)',
  },
  {
    settingKey: 'company_name',
    settingValue: 'CÔNG TY TNHH SẢN XUẤT & THỰC PHẨM VIỆT THẮNG',
    description: 'Tên công ty hiển thị trên phiếu giao hàng / hóa đơn',
  },
  {
    settingKey: 'company_tax_code',
    settingValue: '0316889900',
    description: 'Mã số thuế doanh nghiệp',
  },
  {
    settingKey: 'company_address',
    settingValue: 'KCN Tân Bình, Quận Tân Phú, TP. Hồ Chí Minh',
    description: 'Địa chỉ xưởng / trụ sở in trên hóa đơn',
  },
  {
    settingKey: 'company_phone',
    settingValue: '1900 6868',
    description: 'Hotline điều phối kho & CSKH',
  },
  {
    settingKey: 'invoice_logo_url',
    settingValue: '/assets/logo-vietthang.png',
    description: 'Đường dẫn Logo in trên phiếu xuất kho',
  },
  {
    settingKey: 'invoice_footer',
    settingValue:
      'Quý khách vui lòng kiểm đếm kỹ số lượng thực giao và bảo quản lạnh từ 2-6°C.',
    description: 'Ghi chú chân trang trên phiếu giao hàng',
  },
];

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trang 21: Lấy toàn bộ cấu hình hệ thống (kết hợp giá trị mặc định nếu DB chưa khởi tạo).
   */
  async getAllSettings() {
    const rows = await this.prisma.setting.findMany({
      orderBy: { id: 'asc' },
    });

    const rowMap = new Map(rows.map((r) => [r.settingKey, r]));
    const merged = DEFAULT_SETTINGS.map((def) => {
      const found = rowMap.get(def.settingKey);
      return {
        settingKey: def.settingKey,
        settingValue: found?.settingValue ?? def.settingValue,
        description: found?.description ?? def.description,
      };
    });

    for (const r of rows) {
      if (!DEFAULT_SETTINGS.some((d) => d.settingKey === r.settingKey)) {
        merged.push({
          settingKey: r.settingKey,
          settingValue: r.settingValue,
          description: r.description ?? '',
        });
      }
    }

    const mapObject: Record<string, string> = {};
    for (const item of merged) {
      mapObject[item.settingKey] = item.settingValue;
    }

    return {
      items: merged,
      values: mapObject as SystemSettingsMap,
    };
  }

  /**
   * Trang 21: Cập nhật hàng loạt cấu hình hệ thống trong Transaction.
   */
  async updateSettings(dto: BulkUpdateSettingsDto) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.settings) {
        await tx.setting.upsert({
          where: { settingKey: item.settingKey },
          update: {
            settingValue: item.settingValue,
            ...(item.description !== undefined
              ? { description: item.description }
              : {}),
          },
          create: {
            settingKey: item.settingKey,
            settingValue: item.settingValue,
            description: item.description ?? null,
          },
        });
      }

      return this.getAllSettings();
    });
  }

  /**
   * Sinh mã đơn hàng tự động gọn: Năm(2 số)Tháng(2 số) + STT (VD: DH2611-0001).
   */
  async generateNextOrderCode(
    tx: Prisma.TransactionClient,
    dateInput: Date | string,
  ): Promise<string> {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const year2 = String(d.getFullYear()).slice(-2);
    const month2 = String(d.getMonth() + 1).padStart(2, '0');
    const ym = `${year2}${month2}`;

    const prefixRow = await tx.setting.findUnique({
      where: { settingKey: 'order_prefix' },
    });
    const prefix = prefixRow?.settingValue?.trim() || 'DH';
    const basePrefix = `${prefix}${ym}-`;

    const latestOrder = await tx.order.findFirst({
      where: {
        code: { startsWith: basePrefix },
        orderType: 'standard',
      },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let nextSeq = 1;
    if (latestOrder?.code) {
      const tail = latestOrder.code.slice(basePrefix.length);
      const parsed = parseInt(tail, 10);
      if (!Number.isNaN(parsed) && parsed >= 1) {
        nextSeq = parsed + 1;
      }
    }

    return `${basePrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Sinh mã phiếu xuất kho tự động gọn: Năm(2 số)Tháng(2 số) + STT (VD: PXK2611-0001).
   */
  async generateNextInvoiceCode(
    tx: Prisma.TransactionClient,
    dateInput: Date,
  ): Promise<string> {
    const year2 = String(dateInput.getFullYear()).slice(-2);
    const month2 = String(dateInput.getMonth() + 1).padStart(2, '0');
    const ym = `${year2}${month2}`;

    const prefixRow = await tx.setting.findUnique({
      where: { settingKey: 'invoice_prefix' },
    });
    const prefix = prefixRow?.settingValue?.trim() || 'PXK';
    const basePrefix = `${prefix}${ym}-`;

    const latestDelivered = await tx.order.findFirst({
      where: {
        deliveryCode: { startsWith: basePrefix },
      },
      orderBy: { deliveryCode: 'desc' },
      select: { deliveryCode: true },
    });

    let nextSeq = 1;
    if (latestDelivered?.deliveryCode) {
      const tail = latestDelivered.deliveryCode.slice(basePrefix.length);
      const parsed = parseInt(tail, 10);
      if (!Number.isNaN(parsed) && parsed >= 1) {
        nextSeq = parsed + 1;
      }
    }

    return `${basePrefix}${String(nextSeq).padStart(4, '0')}`;
  }
}
