import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CheckLevel,
  OrderStatus,
  OrderType,
  Prisma,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CustomerDebtQueryDto,
  DebtGroupBy,
  RevenueDimension,
  RevenueReportQueryDto,
} from './dto/reports.dto';

const ZERO_DEC = new Prisma.Decimal(0);
const HUNDRED_DEC = new Prisma.Decimal(100);

// ============================================================================
// INTERFACES CHO PHÂN HỆ BÁO CÁO & TÀI CHÍNH (TRANG 15 & TRANG 16)
// ============================================================================

export interface ReportCompanyInfo {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyTaxCode: string;
  invoiceFooter: string;
}

export interface ReportFilterCatalogs {
  customers: Array<{
    id: number;
    code: string;
    name: string;
    taxCode: string | null;
    phone: string | null;
  }>;
  locations: Array<{
    id: number;
    customerId: number;
    customerCode: string;
    customerName: string;
    name: string;
    address: string;
    receiverName: string | null;
    receiverPhone: string | null;
  }>;
  categories: Array<{
    id: number;
    name: string;
    sortOrder: number;
  }>;
  companyInfo: ReportCompanyInfo;
}

export interface RevenueSummaryKpi {
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
  totalDeliveredOrders: number;
  totalQtyOrdered: string;
  totalQtyDelivered: string;
  fulfillmentRatePercent: string;
}

export interface RevenueBreakdownRow {
  key: string;
  dimension: RevenueDimension;
  id: number;
  code: string;
  name: string;
  subLabel: string | null;
  unit: string;
  orderCount: number;
  qtyOrdered: string;
  qtyDelivered: string;
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
  sharePercent: string;
}

export interface RevenueDailyPoint {
  date: string;
  orderCount: number;
  qtyDelivered: string;
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
}

export interface RevenueReportResponse {
  period: {
    fromDate: string;
    toDate: string;
    month: string | null;
  };
  activeDimension: RevenueDimension;
  summary: RevenueSummaryKpi;
  rows: RevenueBreakdownRow[];
  byDimension: Record<RevenueDimension, RevenueBreakdownRow[]>;
  dailySeries: RevenueDailyPoint[];
}

export interface DebtVoucherItemView {
  orderItemId: string;
  productId: number;
  productCode: string;
  productName: string;
  packageSpec: string | null;
  unit: string;
  qtyOrdered: string;
  qtyDelivered: string;
  qtyShort: string;
  unitPrice: string;
  vatRate: string;
  lineBeforeVat: string;
  lineVat: string;
  lineTotal: string;
}

export interface DebtDeliveryVoucherRow {
  orderId: string;
  orderCode: string;
  orderType: OrderType;
  parentOrderCode: string | null;
  deliveryCode: string;
  orderDate: string;
  deliveredAt: string;
  deliveredDate: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerTaxCode: string | null;
  customerPhone: string | null;
  locationId: number;
  locationName: string;
  locationAddress: string;
  receiverName: string | null;
  receiverPhone: string | null;
  note: string | null;
  totalQtyOrdered: string;
  totalQtyDelivered: string;
  totalBeforeVat: string;
  totalVat: string;
  totalAmount: string;
  items: DebtVoucherItemView[];
}

export interface DebtGroupView {
  groupKey: string;
  groupBy: DebtGroupBy;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerTaxCode: string | null;
  customerPhone: string | null;
  locationId: number | null;
  locationName: string | null;
  locationAddress: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  voucherCount: number;
  subtotalQtyOrdered: string;
  subtotalQtyDelivered: string;
  subtotalBeforeVat: string;
  subtotalVat: string;
  subtotalAmount: string;
  vouchers: DebtDeliveryVoucherRow[];
}

export interface CustomerDebtReportResponse {
  period: {
    fromDate: string;
    toDate: string;
    month: string | null;
  };
  groupBy: DebtGroupBy;
  sortOrder: 'asc' | 'desc';
  summary: {
    totalVouchers: number;
    totalCustomers: number;
    totalLocations: number;
    totalQtyOrdered: string;
    totalQtyDelivered: string;
    grandTotalBeforeVat: string;
    grandTotalVat: string;
    grandTotalAmount: string;
  };
  groups: DebtGroupView[];
  customerGroups: DebtGroupView[];
  locationGroups: DebtGroupView[];
  companyInfo: ReportCompanyInfo;
}

interface InternalDimensionAccumulator {
  dimension: RevenueDimension;
  id: number;
  code: string;
  name: string;
  subLabel: string | null;
  unit: string;
  orderIdSet: Set<string>;
  qtyOrderedDec: Prisma.Decimal;
  qtyDeliveredDec: Prisma.Decimal;
  beforeVatDec: Prisma.Decimal;
  vatDec: Prisma.Decimal;
  totalDec: Prisma.Decimal;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // TIỆN ÍCH CHUẨN HÓA KHOẢNG NGÀY / THÁNG & THÔNG TIN CÔNG TY
  // ==========================================================================

  private resolveDateRange(
    fromDate?: string,
    toDate?: string,
    month?: string,
  ): {
    fromDateStr: string;
    toDateStr: string;
    monthStr: string | null;
    fromDateTime: Date;
    toDateTime: Date;
  } {
    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const [yearStr, monthNumStr] = month.split('-');
      const year = Number(yearStr);
      const monthIndex = Number(monthNumStr); // 1..12
      const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
      const startStr = `${month}-01`;
      const endStr = `${month}-${String(lastDay).padStart(2, '0')}`;

      const finalFrom = fromDate ?? startStr;
      const finalTo = toDate ?? endStr;

      if (finalFrom > finalTo) {
        throw new BadRequestException(
          `Ngày bắt đầu (${finalFrom}) không được lớn hơn ngày kết thúc (${finalTo}).`,
        );
      }

      return {
        fromDateStr: finalFrom,
        toDateStr: finalTo,
        monthStr: month,
        fromDateTime: new Date(`${finalFrom}T00:00:00.000Z`),
        toDateTime: new Date(`${finalTo}T23:59:59.999Z`),
      };
    }

    const nowIso = new Date().toISOString().slice(0, 10);
    const defaultFrom = `${nowIso.slice(0, 8)}01`;
    const finalFrom = fromDate ?? defaultFrom;
    const finalTo = toDate ?? nowIso;

    if (finalFrom > finalTo) {
      throw new BadRequestException(
        `Ngày bắt đầu (${finalFrom}) không được lớn hơn ngày kết thúc (${finalTo}).`,
      );
    }

    const derivedMonth =
      finalFrom.slice(0, 7) === finalTo.slice(0, 7)
        ? finalFrom.slice(0, 7)
        : null;

    return {
      fromDateStr: finalFrom,
      toDateStr: finalTo,
      monthStr: derivedMonth,
      fromDateTime: new Date(`${finalFrom}T00:00:00.000Z`),
      toDateTime: new Date(`${finalTo}T23:59:59.999Z`),
    };
  }

  private async resolveCompanyInfo(): Promise<ReportCompanyInfo> {
    const settings = await this.prisma.setting.findMany({
      where: {
        settingKey: {
          in: [
            'company_name',
            'company_address',
            'company_phone',
            'company_tax_code',
            'invoice_footer',
          ],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.settingKey, s.settingValue]));

    return {
      companyName:
        map.get('company_name') ??
        'CÔNG TY TNHH SẢN XUẤT & THƯƠNG MẠI TRÀ SỮA VIỆT THẮNG (VIETTHANGFOOD)',
      companyAddress:
        map.get('company_address') ??
        'Khu Công Nghiệp Tân Bình, Quận Tân Phú, TP. Hồ Chí Minh',
      companyPhone: map.get('company_phone') ?? '028 3812 9999 - 0909 888 777',
      companyTaxCode: map.get('company_tax_code') ?? '0316889900',
      invoiceFooter:
        map.get('invoice_footer') ??
        'Chứng từ đối soát công nợ & doanh thu căn cứ theo số lượng thực giao trên Phiếu xuất kho.',
    };
  }

  /**
   * Danh mục dùng chung cho Bộ lọc Báo cáo Doanh thu & Công nợ (Khách hàng, Địa điểm, Danh mục SP, Thông tin công ty)
   */
  async getReportFilterCatalogs(): Promise<ReportFilterCatalogs> {
    const [customers, locations, categories, companyInfo] = await Promise.all([
      this.prisma.customer.findMany({
        where: { isHidden: false },
        orderBy: { name: 'asc' },
      }),
      this.prisma.customerLocation.findMany({
        where: { isHidden: false, customer: { isHidden: false } },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: [{ customerId: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.category.findMany({
        where: { isHidden: false },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.resolveCompanyInfo(),
    ]);

    return {
      customers: customers.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        taxCode: c.taxCode,
        phone: c.phone,
      })),
      locations: locations.map((loc) => ({
        id: loc.id,
        customerId: loc.customerId,
        customerCode: loc.customer.code,
        customerName: loc.customer.name,
        name: loc.name,
        address: loc.address,
        receiverName: loc.receiverName,
        receiverPhone: loc.receiverPhone,
      })),
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
      })),
      companyInfo,
    };
  }

  // ==========================================================================
  // TRANG 15: BÁO CÁO DOANH THU (REVENUE REPORT)
  // Nguyên tắc sống còn:
  // - Chỉ tính doanh thu trên số lượng THỰC GIAO (qty_delivered) của các đơn
  //   đã có phiếu xuất kho (delivered_at IS NOT NULL & status = 'delivered'),
  //   tuyệt đối KHÔNG tính trên số đặt (qty_ordered).
  // ==========================================================================

  async getRevenueReport(
    query: RevenueReportQueryDto,
  ): Promise<RevenueReportResponse> {
    const {
      fromDateStr,
      toDateStr,
      monthStr,
      fromDateTime,
      toDateTime,
    } = this.resolveDateRange(query.fromDate, query.toDate, query.month);

    const activeDimension: RevenueDimension =
      query.dimension ?? RevenueDimension.customer;
    const normalizedKeyword = query.keyword?.trim().toLowerCase() ?? '';

    const whereOrder: Prisma.OrderWhereInput = {
      isHidden: false,
      status: OrderStatus.delivered,
      deliveredAt: {
        not: null,
        gte: fromDateTime,
        lte: toDateTime,
      },
      ...(query.customerId ? { customerId: query.customerId } : {}),
    };

    const deliveredOrders = await this.prisma.order.findMany({
      where: whereOrder,
      include: {
        customer: true,
        location: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: [{ deliveredAt: 'asc' }, { id: 'asc' }],
    });

    // Bộ tích lũy 3 chỉ số KPI tổng toàn kỳ
    let summaryBeforeVatDec = ZERO_DEC;
    let summaryVatDec = ZERO_DEC;
    let summaryTotalAmountDec = ZERO_DEC;
    let summaryQtyOrderedDec = ZERO_DEC;
    let summaryQtyDeliveredDec = ZERO_DEC;
    const countedOrderIds = new Set<string>();

    // Bộ tích lũy cho 4 trục phân tích: Customer | Location | Product | Category
    const customerAccMap = new Map<number, InternalDimensionAccumulator>();
    const locationAccMap = new Map<number, InternalDimensionAccumulator>();
    const productAccMap = new Map<number, InternalDimensionAccumulator>();
    const categoryAccMap = new Map<number, InternalDimensionAccumulator>();

    // Bộ tích lũy theo ngày thực giao (Daily Trend Series)
    const dailyMap = new Map<
      string,
      {
        date: string;
        orderIdSet: Set<string>;
        qtyDeliveredDec: Prisma.Decimal;
        beforeVatDec: Prisma.Decimal;
        vatDec: Prisma.Decimal;
        totalDec: Prisma.Decimal;
      }
    >();

    for (const order of deliveredOrders) {
      if (!order.deliveredAt) {
        continue;
      }

      const orderIdStr = order.id.toString();
      const deliveredDateStr = order.deliveredAt.toISOString().slice(0, 10);

      for (const item of order.items) {
        // Nếu người dùng lọc theo Danh mục sản phẩm (categoryId)
        if (
          query.categoryId &&
          item.product.categoryId !== query.categoryId
        ) {
          continue;
        }

        // Lọc theo từ khóa nếu có
        if (normalizedKeyword) {
          const matchesKeyword =
            order.code.toLowerCase().includes(normalizedKeyword) ||
            (order.deliveryCode ?? '')
              .toLowerCase()
              .includes(normalizedKeyword) ||
            order.customer.code.toLowerCase().includes(normalizedKeyword) ||
            order.customer.name.toLowerCase().includes(normalizedKeyword) ||
            order.location.name.toLowerCase().includes(normalizedKeyword) ||
            item.product.code.toLowerCase().includes(normalizedKeyword) ||
            item.product.name.toLowerCase().includes(normalizedKeyword) ||
            item.product.category.name
              .toLowerCase()
              .includes(normalizedKeyword);

          if (!matchesKeyword) {
            continue;
          }
        }

        const qtyOrderedDec = item.qtyOrdered.toDecimalPlaces(
          3,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        const qtyDeliveredDec = item.qtyDelivered.toDecimalPlaces(
          3,
          Prisma.Decimal.ROUND_HALF_UP,
        );

        // NGUYÊN TẮC SỐNG CÒN: Chỉ tính doanh thu trên qty_delivered
        const lineBeforeVatDec = qtyDeliveredDec
          .mul(item.unitPrice)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const lineVatDec = lineBeforeVatDec
          .mul(item.vatRate)
          .div(HUNDRED_DEC)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const lineTotalDec = lineBeforeVatDec.add(lineVatDec);

        countedOrderIds.add(orderIdStr);
        summaryQtyOrderedDec = summaryQtyOrderedDec.add(qtyOrderedDec);
        summaryQtyDeliveredDec = summaryQtyDeliveredDec.add(qtyDeliveredDec);
        summaryBeforeVatDec = summaryBeforeVatDec.add(lineBeforeVatDec);
        summaryVatDec = summaryVatDec.add(lineVatDec);
        summaryTotalAmountDec = summaryTotalAmountDec.add(lineTotalDec);

        // 1. Tích lũy theo Trục KHÁCH HÀNG (Customer)
        this.accumulateDimensionRow(
          customerAccMap,
          order.customerId,
          {
            dimension: RevenueDimension.customer,
            id: order.customerId,
            code: order.customer.code,
            name: order.customer.name,
            subLabel: order.customer.taxCode
              ? `MST: ${order.customer.taxCode}${order.customer.phone ? ` • SĐT: ${order.customer.phone}` : ''}`
              : order.customer.phone
                ? `SĐT: ${order.customer.phone}`
                : null,
            unit: 'SP',
          },
          orderIdStr,
          qtyOrderedDec,
          qtyDeliveredDec,
          lineBeforeVatDec,
          lineVatDec,
          lineTotalDec,
        );

        // 2. Tích lũy theo Trục ĐỊA ĐIỂM GIAO HÀNG (Location)
        this.accumulateDimensionRow(
          locationAccMap,
          order.locationId,
          {
            dimension: RevenueDimension.location,
            id: order.locationId,
            code: `${order.customer.code}-LOC${order.locationId}`,
            name: order.location.name,
            subLabel: `${order.customer.name} — ${order.location.address}`,
            unit: 'SP',
          },
          orderIdStr,
          qtyOrderedDec,
          qtyDeliveredDec,
          lineBeforeVatDec,
          lineVatDec,
          lineTotalDec,
        );

        // 3. Tích lũy theo Trục SẢN PHẨM (Product)
        this.accumulateDimensionRow(
          productAccMap,
          item.productId,
          {
            dimension: RevenueDimension.product,
            id: item.productId,
            code: item.product.code,
            name: item.product.name,
            subLabel: `${item.product.category.name}${item.product.packageSpec ? ` (${item.product.packageSpec})` : ''} • VAT ${item.vatRate.toFixed(0)}%`,
            unit: item.product.unit,
          },
          orderIdStr,
          qtyOrderedDec,
          qtyDeliveredDec,
          lineBeforeVatDec,
          lineVatDec,
          lineTotalDec,
        );

        // 4. Tích lũy theo Trục DANH MỤC (Category)
        this.accumulateDimensionRow(
          categoryAccMap,
          item.product.categoryId,
          {
            dimension: RevenueDimension.category,
            id: item.product.categoryId,
            code: `CAT-${String(item.product.categoryId).padStart(2, '0')}`,
            name: item.product.category.name,
            subLabel: `Nhóm danh mục thành phẩm #${item.product.category.sortOrder}`,
            unit: item.product.unit,
          },
          orderIdStr,
          qtyOrderedDec,
          qtyDeliveredDec,
          lineBeforeVatDec,
          lineVatDec,
          lineTotalDec,
        );

        // 5. Tích lũy chuỗi thời gian theo Ngày thực giao (Daily Series)
        const existingDay = dailyMap.get(deliveredDateStr);
        if (existingDay) {
          existingDay.orderIdSet.add(orderIdStr);
          existingDay.qtyDeliveredDec =
            existingDay.qtyDeliveredDec.add(qtyDeliveredDec);
          existingDay.beforeVatDec =
            existingDay.beforeVatDec.add(lineBeforeVatDec);
          existingDay.vatDec = existingDay.vatDec.add(lineVatDec);
          existingDay.totalDec = existingDay.totalDec.add(lineTotalDec);
        } else {
          dailyMap.set(deliveredDateStr, {
            date: deliveredDateStr,
            orderIdSet: new Set([orderIdStr]),
            qtyDeliveredDec,
            beforeVatDec: lineBeforeVatDec,
            vatDec: lineVatDec,
            totalDec: lineTotalDec,
          });
        }
      }
    }

    const byDimension: Record<RevenueDimension, RevenueBreakdownRow[]> = {
      [RevenueDimension.customer]: this.finalizeDimensionRows(
        customerAccMap,
        summaryTotalAmountDec,
      ),
      [RevenueDimension.location]: this.finalizeDimensionRows(
        locationAccMap,
        summaryTotalAmountDec,
      ),
      [RevenueDimension.product]: this.finalizeDimensionRows(
        productAccMap,
        summaryTotalAmountDec,
      ),
      [RevenueDimension.category]: this.finalizeDimensionRows(
        categoryAccMap,
        summaryTotalAmountDec,
      ),
    };

    const dailySeries: RevenueDailyPoint[] = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date,
        orderCount: d.orderIdSet.size,
        qtyDelivered: d.qtyDeliveredDec.toFixed(3),
        totalBeforeVat: d.beforeVatDec.toFixed(2),
        totalVat: d.vatDec.toFixed(2),
        totalAmount: d.totalDec.toFixed(2),
      }));

    const fulfillmentRatePercent = summaryQtyOrderedDec.gt(ZERO_DEC)
      ? summaryQtyDeliveredDec
          .mul(HUNDRED_DEC)
          .div(summaryQtyOrderedDec)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          .toFixed(2)
      : '0.00';

    return {
      period: {
        fromDate: fromDateStr,
        toDate: toDateStr,
        month: monthStr,
      },
      activeDimension,
      summary: {
        totalBeforeVat: summaryBeforeVatDec.toFixed(2),
        totalVat: summaryVatDec.toFixed(2),
        totalAmount: summaryTotalAmountDec.toFixed(2),
        totalDeliveredOrders: countedOrderIds.size,
        totalQtyOrdered: summaryQtyOrderedDec.toFixed(3),
        totalQtyDelivered: summaryQtyDeliveredDec.toFixed(3),
        fulfillmentRatePercent,
      },
      rows: byDimension[activeDimension],
      byDimension,
      dailySeries,
    };
  }

  private accumulateDimensionRow(
    map: Map<number, InternalDimensionAccumulator>,
    id: number,
    meta: {
      dimension: RevenueDimension;
      id: number;
      code: string;
      name: string;
      subLabel: string | null;
      unit: string;
    },
    orderIdStr: string,
    qtyOrderedDec: Prisma.Decimal,
    qtyDeliveredDec: Prisma.Decimal,
    lineBeforeVatDec: Prisma.Decimal,
    lineVatDec: Prisma.Decimal,
    lineTotalDec: Prisma.Decimal,
  ): void {
    const existing = map.get(id);
    if (existing) {
      existing.orderIdSet.add(orderIdStr);
      existing.qtyOrderedDec = existing.qtyOrderedDec.add(qtyOrderedDec);
      existing.qtyDeliveredDec = existing.qtyDeliveredDec.add(qtyDeliveredDec);
      existing.beforeVatDec = existing.beforeVatDec.add(lineBeforeVatDec);
      existing.vatDec = existing.vatDec.add(lineVatDec);
      existing.totalDec = existing.totalDec.add(lineTotalDec);
    } else {
      map.set(id, {
        dimension: meta.dimension,
        id: meta.id,
        code: meta.code,
        name: meta.name,
        subLabel: meta.subLabel,
        unit: meta.unit,
        orderIdSet: new Set([orderIdStr]),
        qtyOrderedDec,
        qtyDeliveredDec,
        beforeVatDec: lineBeforeVatDec,
        vatDec: lineVatDec,
        totalDec: lineTotalDec,
      });
    }
  }

  private finalizeDimensionRows(
    map: Map<number, InternalDimensionAccumulator>,
    grandTotalAmountDec: Prisma.Decimal,
  ): RevenueBreakdownRow[] {
    return Array.from(map.values())
      .sort((a, b) => b.totalDec.comparedTo(a.totalDec))
      .map((acc) => {
        const sharePercent = grandTotalAmountDec.gt(ZERO_DEC)
          ? acc.totalDec
              .mul(HUNDRED_DEC)
              .div(grandTotalAmountDec)
              .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
              .toFixed(2)
          : '0.00';

        return {
          key: `${acc.dimension}-${acc.id}`,
          dimension: acc.dimension,
          id: acc.id,
          code: acc.code,
          name: acc.name,
          subLabel: acc.subLabel,
          unit: acc.unit,
          orderCount: acc.orderIdSet.size,
          qtyOrdered: acc.qtyOrderedDec.toFixed(3),
          qtyDelivered: acc.qtyDeliveredDec.toFixed(3),
          totalBeforeVat: acc.beforeVatDec.toFixed(2),
          totalVat: acc.vatDec.toFixed(2),
          totalAmount: acc.totalDec.toFixed(2),
          sharePercent,
        };
      });
  }

  // ==========================================================================
  // TRANG 16: BÁO CÁO CÔNG NỢ KHÁCH HÀNG (CUSTOMER DEBTS RECONCILIATION)
  // - Đối chiếu số tiền các khách hàng phải thanh toán theo từng địa điểm giao hàng.
  // - Sắp xếp theo ngày giao (delivered_at), hỗ trợ gom nhóm theo [Khách hàng] hoặc [Địa điểm].
  // - Tính chính xác tuyệt đối bằng Decimal trên số lượng thực giao (qty_delivered).
  // ==========================================================================

  async getCustomerDebtReport(
    query: CustomerDebtQueryDto,
  ): Promise<CustomerDebtReportResponse> {
    const {
      fromDateStr,
      toDateStr,
      monthStr,
      fromDateTime,
      toDateTime,
    } = this.resolveDateRange(query.fromDate, query.toDate, query.month);

    const activeGroupBy: DebtGroupBy = query.groupBy ?? DebtGroupBy.location;
    const sortOrder: 'asc' | 'desc' = query.sortOrder ?? 'asc';
    const normalizedKeyword = query.keyword?.trim().toLowerCase() ?? '';

    const whereOrder: Prisma.OrderWhereInput = {
      isHidden: false,
      status: OrderStatus.delivered,
      deliveredAt: {
        not: null,
        gte: fromDateTime,
        lte: toDateTime,
      },
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };

    const [deliveredOrders, companyInfo] = await Promise.all([
      this.prisma.order.findMany({
        where: whereOrder,
        include: {
          customer: true,
          location: true,
          parentOrder: {
            select: { code: true },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: [{ deliveredAt: sortOrder }, { id: sortOrder }],
      }),
      this.resolveCompanyInfo(),
    ]);

    let grandQtyOrderedDec = ZERO_DEC;
    let grandQtyDeliveredDec = ZERO_DEC;
    let grandBeforeVatDec = ZERO_DEC;
    let grandVatDec = ZERO_DEC;
    let grandTotalAmountDec = ZERO_DEC;

    const uniqueCustomerIds = new Set<number>();
    const uniqueLocationIds = new Set<number>();
    const vouchers: DebtDeliveryVoucherRow[] = [];

    for (const order of deliveredOrders) {
      if (!order.deliveredAt) {
        continue;
      }

      if (normalizedKeyword) {
        const matches =
          order.code.toLowerCase().includes(normalizedKeyword) ||
          (order.deliveryCode ?? '')
            .toLowerCase()
            .includes(normalizedKeyword) ||
          order.customer.code.toLowerCase().includes(normalizedKeyword) ||
          order.customer.name.toLowerCase().includes(normalizedKeyword) ||
          order.location.name.toLowerCase().includes(normalizedKeyword) ||
          order.location.address.toLowerCase().includes(normalizedKeyword);

        if (!matches) {
          continue;
        }
      }

      let orderQtyOrderedDec = ZERO_DEC;
      let orderQtyDeliveredDec = ZERO_DEC;
      let orderBeforeVatDec = ZERO_DEC;
      let orderVatDec = ZERO_DEC;
      const voucherItems: DebtVoucherItemView[] = [];

      for (const item of order.items) {
        const qtyOrd = item.qtyOrdered.toDecimalPlaces(
          3,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        const qtyDel = item.qtyDelivered.toDecimalPlaces(
          3,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        const qtyShort = item.qtyShort.toDecimalPlaces(
          3,
          Prisma.Decimal.ROUND_HALF_UP,
        );

        const lineBeforeVat = qtyDel
          .mul(item.unitPrice)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const lineVat = lineBeforeVat
          .mul(item.vatRate)
          .div(HUNDRED_DEC)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const lineTotal = lineBeforeVat.add(lineVat);

        orderQtyOrderedDec = orderQtyOrderedDec.add(qtyOrd);
        orderQtyDeliveredDec = orderQtyDeliveredDec.add(qtyDel);
        orderBeforeVatDec = orderBeforeVatDec.add(lineBeforeVat);
        orderVatDec = orderVatDec.add(lineVat);

        voucherItems.push({
          orderItemId: item.id.toString(),
          productId: item.productId,
          productCode: item.product.code,
          productName: item.product.name,
          packageSpec: item.product.packageSpec,
          unit: item.product.unit,
          qtyOrdered: qtyOrd.toFixed(3),
          qtyDelivered: qtyDel.toFixed(3),
          qtyShort: qtyShort.toFixed(3),
          unitPrice: item.unitPrice.toFixed(2),
          vatRate: item.vatRate.toFixed(2),
          lineBeforeVat: lineBeforeVat.toFixed(2),
          lineVat: lineVat.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
      }

      const orderTotalDec = orderBeforeVatDec.add(orderVatDec);
      const deliveredAtIso = order.deliveredAt.toISOString();
      const deliveredDateStr = deliveredAtIso.slice(0, 10);
      const orderDateStr = order.orderDate.toISOString().slice(0, 10);
      const effectiveDeliveryCode =
        order.deliveryCode && order.deliveryCode.trim() !== ''
          ? order.deliveryCode
          : `PXK-${order.code}`;

      uniqueCustomerIds.add(order.customerId);
      uniqueLocationIds.add(order.locationId);

      grandQtyOrderedDec = grandQtyOrderedDec.add(orderQtyOrderedDec);
      grandQtyDeliveredDec = grandQtyDeliveredDec.add(orderQtyDeliveredDec);
      grandBeforeVatDec = grandBeforeVatDec.add(orderBeforeVatDec);
      grandVatDec = grandVatDec.add(orderVatDec);
      grandTotalAmountDec = grandTotalAmountDec.add(orderTotalDec);

      vouchers.push({
        orderId: order.id.toString(),
        orderCode: order.code,
        orderType: order.orderType,
        parentOrderCode: order.parentOrder?.code ?? null,
        deliveryCode: effectiveDeliveryCode,
        orderDate: orderDateStr,
        deliveredAt: deliveredAtIso,
        deliveredDate: deliveredDateStr,
        customerId: order.customerId,
        customerCode: order.customer.code,
        customerName: order.customer.name,
        customerTaxCode: order.customer.taxCode,
        customerPhone: order.customer.phone,
        locationId: order.locationId,
        locationName: order.location.name,
        locationAddress: order.location.address,
        receiverName: order.location.receiverName,
        receiverPhone: order.location.receiverPhone,
        note: order.note,
        totalQtyOrdered: orderQtyOrderedDec.toFixed(3),
        totalQtyDelivered: orderQtyDeliveredDec.toFixed(3),
        totalBeforeVat: orderBeforeVatDec.toFixed(2),
        totalVat: orderVatDec.toFixed(2),
        totalAmount: orderTotalDec.toFixed(2),
        items: voucherItems,
      });
    }

    const customerGroups = this.buildDebtGroups(vouchers, DebtGroupBy.customer);
    const locationGroups = this.buildDebtGroups(vouchers, DebtGroupBy.location);

    return {
      period: {
        fromDate: fromDateStr,
        toDate: toDateStr,
        month: monthStr,
      },
      groupBy: activeGroupBy,
      sortOrder,
      summary: {
        totalVouchers: vouchers.length,
        totalCustomers: uniqueCustomerIds.size,
        totalLocations: uniqueLocationIds.size,
        totalQtyOrdered: grandQtyOrderedDec.toFixed(3),
        totalQtyDelivered: grandQtyDeliveredDec.toFixed(3),
        grandTotalBeforeVat: grandBeforeVatDec.toFixed(2),
        grandTotalVat: grandVatDec.toFixed(2),
        grandTotalAmount: grandTotalAmountDec.toFixed(2),
      },
      groups:
        activeGroupBy === DebtGroupBy.customer
          ? customerGroups
          : locationGroups,
      customerGroups,
      locationGroups,
      companyInfo,
    };
  }

  private buildDebtGroups(
    vouchers: DebtDeliveryVoucherRow[],
    groupBy: DebtGroupBy,
  ): DebtGroupView[] {
    const groupMap = new Map<
      string,
      {
        groupKey: string;
        groupBy: DebtGroupBy;
        customerId: number;
        customerCode: string;
        customerName: string;
        customerTaxCode: string | null;
        customerPhone: string | null;
        locationId: number | null;
        locationName: string | null;
        locationAddress: string | null;
        receiverName: string | null;
        receiverPhone: string | null;
        qtyOrderedDec: Prisma.Decimal;
        qtyDeliveredDec: Prisma.Decimal;
        beforeVatDec: Prisma.Decimal;
        vatDec: Prisma.Decimal;
        amountDec: Prisma.Decimal;
        vouchers: DebtDeliveryVoucherRow[];
      }
    >();

    for (const v of vouchers) {
      const key =
        groupBy === DebtGroupBy.customer
          ? `customer-${v.customerId}`
          : `location-${v.locationId}`;

      const qtyOrd = new Prisma.Decimal(v.totalQtyOrdered);
      const qtyDel = new Prisma.Decimal(v.totalQtyDelivered);
      const beforeVat = new Prisma.Decimal(v.totalBeforeVat);
      const vat = new Prisma.Decimal(v.totalVat);
      const amount = new Prisma.Decimal(v.totalAmount);

      const existing = groupMap.get(key);
      if (existing) {
        existing.qtyOrderedDec = existing.qtyOrderedDec.add(qtyOrd);
        existing.qtyDeliveredDec = existing.qtyDeliveredDec.add(qtyDel);
        existing.beforeVatDec = existing.beforeVatDec.add(beforeVat);
        existing.vatDec = existing.vatDec.add(vat);
        existing.amountDec = existing.amountDec.add(amount);
        existing.vouchers.push(v);
      } else {
        groupMap.set(key, {
          groupKey: key,
          groupBy,
          customerId: v.customerId,
          customerCode: v.customerCode,
          customerName: v.customerName,
          customerTaxCode: v.customerTaxCode,
          customerPhone: v.customerPhone,
          locationId: groupBy === DebtGroupBy.location ? v.locationId : null,
          locationName:
            groupBy === DebtGroupBy.location ? v.locationName : null,
          locationAddress:
            groupBy === DebtGroupBy.location ? v.locationAddress : null,
          receiverName:
            groupBy === DebtGroupBy.location ? v.receiverName : null,
          receiverPhone:
            groupBy === DebtGroupBy.location ? v.receiverPhone : null,
          qtyOrderedDec: qtyOrd,
          qtyDeliveredDec: qtyDel,
          beforeVatDec: beforeVat,
          vatDec: vat,
          amountDec: amount,
          vouchers: [v],
        });
      }
    }

    return Array.from(groupMap.values())
      .sort((a, b) => {
        const customerCompare = a.customerName.localeCompare(
          b.customerName,
          'vi',
        );
        if (customerCompare !== 0) {
          return customerCompare;
        }
        return (a.locationName ?? '').localeCompare(b.locationName ?? '', 'vi');
      })
      .map((g) => ({
        groupKey: g.groupKey,
        groupBy: g.groupBy,
        customerId: g.customerId,
        customerCode: g.customerCode,
        customerName: g.customerName,
        customerTaxCode: g.customerTaxCode,
        customerPhone: g.customerPhone,
        locationId: g.locationId,
        locationName: g.locationName,
        locationAddress: g.locationAddress,
        receiverName: g.receiverName,
        receiverPhone: g.receiverPhone,
        voucherCount: g.vouchers.length,
        subtotalQtyOrdered: g.qtyOrderedDec.toFixed(3),
        subtotalQtyDelivered: g.qtyDeliveredDec.toFixed(3),
        subtotalBeforeVat: g.beforeVatDec.toFixed(2),
        subtotalVat: g.vatDec.toFixed(2),
        subtotalAmount: g.amountDec.toFixed(2),
        vouchers: g.vouchers,
      }));
  }

  /**
   * TRANG 1: DASHBOARD TỔNG QUAN (Mục 4.1 activity.md):
   * - KPI thẻ màu xanh/vàng/đỏ hôm nay
   * - Doanh thu thực giao ngày / tháng
   * - Cảnh báo nguyên liệu dưới mức min_stock
   * - Đơn hạn khẩn cấp 24h / 48h
   * - Đơn chờ duyệt
   */
  async getDashboardSummary() {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
    );
    const todayEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
    );

    const urgentSetting = await this.prisma.setting.findUnique({
      where: { settingKey: 'urgent_hours_threshold' },
    });
    const urgentHours = urgentSetting
      ? Number(urgentSetting.settingValue) || 24
      : 24;
    const urgentCutoff = new Date(now.getTime() + urgentHours * 3600 * 1000);

    const [
      activeOrders,
      todayDeliveredOrders,
      monthDeliveredOrders,
      materials,
      materialMovements,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          isHidden: false,
          status: {
            in: [
              OrderStatus.pending,
              OrderStatus.draft,
              OrderStatus.blocked,
              OrderStatus.approved,
              OrderStatus.in_production,
              OrderStatus.ready,
            ],
          },
        },
        select: {
          id: true,
          code: true,
          status: true,
          checkLevel: true,
          deliveryAt: true,
          totalAmount: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          isHidden: false,
          status: OrderStatus.delivered,
          deliveredAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: {
          totalBeforeVat: true,
          totalVat: true,
          totalAmount: true,
        },
        _count: { id: true },
      }),
      this.prisma.order.aggregate({
        where: {
          isHidden: false,
          status: OrderStatus.delivered,
          deliveredAt: { gte: monthStart, lte: todayEnd },
        },
        _sum: {
          totalBeforeVat: true,
          totalVat: true,
          totalAmount: true,
        },
        _count: { id: true },
      }),
      this.prisma.material.findMany({
        where: { isHidden: false },
        orderBy: { id: 'asc' },
      }),
      this.prisma.stockMovement.groupBy({
        by: ['materialId', 'movementType'],
        where: { materialId: { not: null } },
        _sum: { qty: true },
      }),
    ]);

    const greenOrdersCount = activeOrders.filter(
      (o) => o.checkLevel === CheckLevel.green,
    ).length;
    const yellowOrdersCount = activeOrders.filter(
      (o) => o.checkLevel === CheckLevel.yellow,
    ).length;
    const redOrdersCount = activeOrders.filter(
      (o) =>
        o.checkLevel === CheckLevel.red || o.status === OrderStatus.blocked,
    ).length;

    const pendingApprovalOrdersCount = activeOrders.filter(
      (o) =>
        o.status === OrderStatus.pending ||
        o.status === OrderStatus.draft ||
        o.status === OrderStatus.blocked,
    ).length;

    const urgentOrders = activeOrders.filter(
      (o) =>
        (o.status === OrderStatus.pending ||
          o.status === OrderStatus.approved ||
          o.status === OrderStatus.in_production) &&
        o.deliveryAt.getTime() <= urgentCutoff.getTime(),
    );

    // Tính tồn nguyên vật liệu hiện tại để cảnh báo dưới min_stock
    const matStockMap = new Map<number, Prisma.Decimal>();
    for (const m of materials) {
      matStockMap.set(m.id, ZERO_DEC);
    }
    for (const row of materialMovements) {
      if (row.materialId === null) continue;
      const sumQty = row._sum.qty ?? ZERO_DEC;
      const current = matStockMap.get(row.materialId) ?? ZERO_DEC;
      const signed =
        row.movementType === StockMovementType.import ||
        row.movementType === StockMovementType.production_in
          ? sumQty.abs()
          : row.movementType === StockMovementType.adjustment
            ? sumQty
            : sumQty.abs().neg();
      matStockMap.set(row.materialId, current.add(signed));
    }

    const lowStockMaterials = materials
      .map((m) => {
        const currentStock = matStockMap.get(m.id) ?? ZERO_DEC;
        const isBelowMin = currentStock.lt(m.minStock);
        return {
          materialId: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          currentStock: currentStock.toFixed(3),
          minStock: m.minStock.toFixed(3),
          shortageToMin: Prisma.Decimal.max(
            ZERO_DEC,
            m.minStock.sub(currentStock),
          ).toFixed(3),
          isBelowMin,
        };
      })
      .filter((m) => m.isBelowMin);

    return {
      generatedAt: now.toISOString(),
      checkLevelCards: {
        greenCount: greenOrdersCount,
        yellowCount: yellowOrdersCount,
        redCount: redOrdersCount,
      },
      revenue: {
        todayDeliveredCount: todayDeliveredOrders._count.id,
        todayRevenueBeforeVat: (
          todayDeliveredOrders._sum.totalBeforeVat ?? ZERO_DEC
        ).toFixed(2),
        todayRevenueTotal: (
          todayDeliveredOrders._sum.totalAmount ?? ZERO_DEC
        ).toFixed(2),
        monthDeliveredCount: monthDeliveredOrders._count.id,
        monthRevenueBeforeVat: (
          monthDeliveredOrders._sum.totalBeforeVat ?? ZERO_DEC
        ).toFixed(2),
        monthRevenueTotal: (
          monthDeliveredOrders._sum.totalAmount ?? ZERO_DEC
        ).toFixed(2),
      },
      urgentThresholdHours: urgentHours,
      urgentOrdersCount: urgentOrders.length,
      urgentOrders: urgentOrders.map((o) => ({
        orderId: o.id.toString(),
        code: o.code,
        status: o.status,
        checkLevel: o.checkLevel,
        deliveryAt: o.deliveryAt.toISOString(),
        totalAmount: o.totalAmount.toFixed(2),
      })),
      pendingApprovalOrdersCount,
      lowStockMaterialsCount: lowStockMaterials.length,
      lowStockMaterials,
    };
  }
}
