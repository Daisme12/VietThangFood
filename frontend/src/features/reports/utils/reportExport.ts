import {
  formatCurrencyVnd,
  formatDateTimeVi,
  formatQuantity,
} from '../../../lib/formatters';
import {
  CustomerDebtReportResponse,
  DebtGroupView,
  ReportCompanyInfo,
  RevenueBreakdownRow,
  RevenueDimension,
  RevenueReportResponse,
} from '../types/reports.types';

const DIMENSION_LABELS: Record<RevenueDimension, string> = {
  customer: 'Theo Khách hàng',
  location: 'Theo Địa điểm giao hàng',
  product: 'Theo Sản phẩm',
  category: 'Theo Danh mục (Category)',
};

function escapeHtml(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) {
    return '';
  }
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFileName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function triggerExcelDownload(htmlTableDocument: string, fileName: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + htmlTableDocument], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Đọc số tiền VND thành chữ tiếng Việt phục vụ in Biên bản đối chiếu công nợ
 */
export function numberToVietnameseWords(value: string | number): string {
  const numeric = Math.round(
    typeof value === 'string' ? Number(value) : value,
  );
  if (Number.isNaN(numeric) || numeric <= 0) {
    return 'Không đồng';
  }

  const digits = [
    'không',
    'một',
    'hai',
    'ba',
    'bốn',
    'năm',
    'sáu',
    'bảy',
    'tám',
    'chín',
  ];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  const readThreeDigits = (num: number, showZeroHundred: boolean): string => {
    const hundred = Math.floor(num / 100);
    const ten = Math.floor((num % 100) / 10);
    const unit = num % 10;
    const parts: string[] = [];

    if (hundred > 0 || showZeroHundred) {
      parts.push(`${digits[hundred]} trăm`);
    }

    if (ten > 1) {
      parts.push(`${digits[ten]} mươi`);
      if (unit === 1) {
        parts.push('mốt');
      } else if (unit === 4) {
        parts.push('tư');
      } else if (unit === 5) {
        parts.push('lăm');
      } else if (unit > 0) {
        parts.push(digits[unit]);
      }
    } else if (ten === 1) {
      parts.push('mười');
      if (unit === 5) {
        parts.push('lăm');
      } else if (unit > 0) {
        parts.push(digits[unit]);
      }
    } else if (ten === 0 && unit > 0) {
      if (hundred > 0 || showZeroHundred) {
        parts.push('lẻ');
      }
      parts.push(digits[unit]);
    }

    return parts.join(' ');
  };

  const groups: number[] = [];
  let temp = numeric;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const textParts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp > 0) {
      const showZeroHundred = i < groups.length - 1;
      const chunkText = readThreeDigits(grp, showZeroHundred);
      const unitLabel = units[i] ?? '';
      textParts.push(unitLabel ? `${chunkText} ${unitLabel}` : chunkText);
    }
  }

  const fullText = textParts.join(' ').trim();
  return `${fullText.charAt(0).toUpperCase()}${fullText.slice(1)} đồng chẵn.`;
}

// ============================================================================
// 1. XUẤT EXCEL TRANG 15: BÁO CÁO DOANH THU
// ============================================================================

export function exportRevenueReportToExcel(
  report: RevenueReportResponse,
  activeDimension: RevenueDimension,
  rowsToExport?: RevenueBreakdownRow[],
): void {
  const rows = rowsToExport ?? report.byDimension[activeDimension] ?? report.rows;
  const dimLabel = DIMENSION_LABELS[activeDimension];

  const rowsHtml = rows
    .map(
      (r, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="mso-number-format:'\\@';">${escapeHtml(r.code)}</td>
        <td>
          <strong>${escapeHtml(r.name)}</strong>
          ${r.subLabel ? `<br/><span style="color:#555;font-size:11px;">${escapeHtml(r.subLabel)}</span>` : ''}
        </td>
        <td style="text-align:center;">${r.orderCount}</td>
        <td style="text-align:right;">${formatQuantity(r.qtyOrdered)}</td>
        <td style="text-align:right;font-weight:bold;color:#047857;">${formatQuantity(r.qtyDelivered)}</td>
        <td style="text-align:right;">${formatCurrencyVnd(r.totalBeforeVat)}</td>
        <td style="text-align:right;">${formatCurrencyVnd(r.totalVat)}</td>
        <td style="text-align:right;font-weight:bold;">${formatCurrencyVnd(r.totalAmount)}</td>
        <td style="text-align:right;">${escapeHtml(r.sharePercent)}%</td>
      </tr>`,
    )
    .join('');

  const dailyHtml = report.dailySeries
    .map(
      (d, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center;">${escapeHtml(d.date)}</td>
        <td style="text-align:center;">${d.orderCount}</td>
        <td style="text-align:right;">${formatQuantity(d.qtyDelivered)}</td>
        <td style="text-align:right;">${formatCurrencyVnd(d.totalBeforeVat)}</td>
        <td style="text-align:right;">${formatCurrencyVnd(d.totalVat)}</td>
        <td style="text-align:right;font-weight:bold;">${formatCurrencyVnd(d.totalAmount)}</td>
      </tr>`,
    )
    .join('');

  const doc = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 18px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .title { font-size: 16px; font-weight: bold; color: #065f46; }
          .subtitle { font-size: 12px; color: #475569; }
          .total-row { background-color: #ecfdf5; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="title">BÁO CÁO DOANH THU THỰC GIAO - VIETTHANGFOOD ERP</div>
        <div class="subtitle">
          Kỳ báo cáo: Từ ngày <strong>${escapeHtml(report.period.fromDate)}</strong> đến ngày <strong>${escapeHtml(report.period.toDate)}</strong>
          | Trục phân tích: <strong>${escapeHtml(dimLabel)}</strong>
        </div>
        <div class="subtitle">
          Nguyên tắc ghi nhận: Chỉ tính doanh thu trên SỐ LƯỢNG THỰC GIAO (qty_delivered) của các đơn đã có phiếu xuất kho (delivered_at IS NOT NULL).
        </div>
        <br/>

        <table>
          <thead>
            <tr>
              <th>Chỉ số Tổng hợp Kỳ</th>
              <th>Doanh thu trước VAT</th>
              <th>Thuế VAT</th>
              <th>Tổng tiền thanh toán</th>
              <th>Số phiếu xuất kho</th>
              <th>Tổng SL Thực giao</th>
            </tr>
          </thead>
          <tbody>
            <tr class="total-row">
              <td>TỔNG CỘNG TOÀN KỲ</td>
              <td style="text-align:right;">${formatCurrencyVnd(report.summary.totalBeforeVat)}</td>
              <td style="text-align:right;">${formatCurrencyVnd(report.summary.totalVat)}</td>
              <td style="text-align:right;">${formatCurrencyVnd(report.summary.totalAmount)}</td>
              <td style="text-align:center;">${report.summary.totalDeliveredOrders}</td>
              <td style="text-align:right;">${formatQuantity(report.summary.totalQtyDelivered)}</td>
            </tr>
          </tbody>
        </table>

        <h3>1. BẢNG PHÂN TÍCH DOANH THU (${escapeHtml(dimLabel.toUpperCase())})</h3>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã</th>
              <th>Đối tượng phân tích (${escapeHtml(dimLabel)})</th>
              <th>Số phiếu xuất</th>
              <th>SL Đặt</th>
              <th>SL Thực giao</th>
              <th>Doanh thu trước VAT</th>
              <th>Thuế VAT</th>
              <th>Tổng thanh toán</th>
              <th>Tỷ trọng (%)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="3" style="text-align:right;">TỔNG CỘNG</td>
              <td style="text-align:center;">${report.summary.totalDeliveredOrders}</td>
              <td style="text-align:right;">${formatQuantity(report.summary.totalQtyOrdered)}</td>
              <td style="text-align:right;">${formatQuantity(report.summary.totalQtyDelivered)}</td>
              <td style="text-align:right;">${formatCurrencyVnd(report.summary.totalBeforeVat)}</td>
              <td style="text-align:right;">${formatCurrencyVnd(report.summary.totalVat)}</td>
              <td style="text-align:right;">${formatCurrencyVnd(report.summary.totalAmount)}</td>
              <td style="text-align:right;">100.00%</td>
            </tr>
          </tbody>
        </table>

        <h3>2. XU HƯỚNG DOANH THU THEO NGÀY GIAO</h3>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Ngày giao</th>
              <th>Số phiếu xuất</th>
              <th>SL Thực giao</th>
              <th>Doanh thu trước VAT</th>
              <th>Thuế VAT</th>
              <th>Tổng thanh toán</th>
            </tr>
          </thead>
          <tbody>
            ${dailyHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const fileName = `Bao_Cao_Doanh_Thu_${activeDimension}_${report.period.fromDate}_${report.period.toDate}.xls`;
  triggerExcelDownload(doc, fileName);
}

// ============================================================================
// 2. XUẤT FILE CÔNG NỢ RIÊNG BIỆT CHO TỪNG ĐỊA ĐIỂM GIAO HÀNG (TRANG 16)
// ============================================================================

export function exportSingleLocationDebtToExcel(
  locationGroup: DebtGroupView,
  period: { fromDate: string; toDate: string },
  companyInfo: ReportCompanyInfo,
): void {
  const voucherRowsHtml = locationGroup.vouchers
    .map((v, idx) => {
      const itemSummary = v.items
        .map(
          (item) =>
            `${item.productName} (Thực giao: ${formatQuantity(item.qtyDelivered)} ${item.unit} x ${formatCurrencyVnd(item.unitPrice)})`,
        )
        .join('; ');

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="text-align:center;">${escapeHtml(formatDateTimeVi(v.deliveredAt))}</td>
          <td style="mso-number-format:'\\@';font-weight:bold;">${escapeHtml(v.deliveryCode)}</td>
          <td style="mso-number-format:'\\@';">
            ${escapeHtml(v.orderCode)}
            ${v.orderType === 'compensation' ? ` (Đơn bù từ ${escapeHtml(v.parentOrderCode ?? '')})` : ''}
          </td>
          <td>${escapeHtml(itemSummary)}</td>
          <td style="text-align:right;">${formatQuantity(v.totalQtyDelivered)}</td>
          <td style="text-align:right;">${formatCurrencyVnd(v.totalBeforeVat)}</td>
          <td style="text-align:right;">${formatCurrencyVnd(v.totalVat)}</td>
          <td style="text-align:right;font-weight:bold;">${formatCurrencyVnd(v.totalAmount)}</td>
        </tr>`;
    })
    .join('');

  const amountInWords = numberToVietnameseWords(locationGroup.subtotalAmount);

  const doc = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #94a3b8; padding: 6px 8px; }
          th { background-color: #e2e8f0; font-weight: bold; }
          .header-company { font-size: 13px; font-weight: bold; color: #065f46; }
          .doc-title { font-size: 16px; font-weight: bold; text-align: center; margin: 12px 0 4px 0; }
          .subtotal-row { background-color: #fef3c7; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-company">${escapeHtml(companyInfo.companyName)}</div>
        <div>Địa chỉ: ${escapeHtml(companyInfo.companyAddress)} | ĐT: ${escapeHtml(companyInfo.companyPhone)} | MST: ${escapeHtml(companyInfo.companyTaxCode)}</div>
        <hr/>
        <div class="doc-title">BẢNG ĐỐI CHIẾU CÔNG NỢ THEO ĐỊA ĐIỂM GIAO HÀNG</div>
        <div style="text-align:center;margin-bottom:10px;">
          Kỳ đối soát: Từ ngày <strong>${escapeHtml(period.fromDate)}</strong> đến ngày <strong>${escapeHtml(period.toDate)}</strong>
        </div>

        <div><strong>Khách hàng:</strong> ${escapeHtml(locationGroup.customerName)} (${escapeHtml(locationGroup.customerCode)}) ${locationGroup.customerTaxCode ? `- MST: ${escapeHtml(locationGroup.customerTaxCode)}` : ''}</div>
        <div><strong>Địa điểm giao hàng:</strong> ${escapeHtml(locationGroup.locationName ?? 'Điểm giao chính')} — ${escapeHtml(locationGroup.locationAddress ?? '')}</div>
        <div><strong>Người nhận hàng:</strong> ${escapeHtml(locationGroup.receiverName ?? '—')} ${locationGroup.receiverPhone ? `(${escapeHtml(locationGroup.receiverPhone)})` : ''}</div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Ngày giao</th>
              <th>Mã phiếu xuất</th>
              <th>Mã đơn hàng</th>
              <th>Chi tiết mặt hàng thực giao</th>
              <th>Tổng SL thực giao</th>
              <th>Tiền trước VAT</th>
              <th>Tiền VAT</th>
              <th>Tổng cộng thanh toán</th>
            </tr>
          </thead>
          <tbody>
            ${voucherRowsHtml}
            <tr class="subtotal-row">
              <td colspan="5" style="text-align:right;">TỔNG CỘNG CÔNG NỢ ĐỊA ĐIỂM (${escapeHtml(locationGroup.locationName ?? '')})</td>
              <td style="text-align:right;">${formatQuantity(locationGroup.subtotalQtyDelivered)}</td>
              <td style="text-align:right;">${formatCurrencyVnd(locationGroup.subtotalBeforeVat)}</td>
              <td style="text-align:right;">${formatCurrencyVnd(locationGroup.subtotalVat)}</td>
              <td style="text-align:right;">${formatCurrencyVnd(locationGroup.subtotalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <p><strong>Số tiền bằng chữ:</strong> <em>${escapeHtml(amountInWords)}</em></p>
        <p style="font-size:11px;color:#475569;">${escapeHtml(companyInfo.invoiceFooter)}</p>
      </body>
    </html>
  `;

  const safeCust = sanitizeFileName(locationGroup.customerCode || 'KH');
  const safeLoc = sanitizeFileName(
    locationGroup.locationName || `Loc_${locationGroup.locationId ?? 0}`,
  );
  const fileName = `Cong_No_${safeCust}_${safeLoc}_${period.fromDate}_${period.toDate}.xls`;
  triggerExcelDownload(doc, fileName);
}

/**
 * Sinh file công nợ riêng biệt cho từng địa điểm giao hàng trong kỳ
 */
export function exportAllLocationsDebtFiles(
  locationGroups: DebtGroupView[],
  period: { fromDate: string; toDate: string },
  companyInfo: ReportCompanyInfo,
): number {
  if (locationGroups.length === 0) {
    return 0;
  }

  locationGroups.forEach((locGroup, index) => {
    setTimeout(() => {
      exportSingleLocationDebtToExcel(locGroup, period, companyInfo);
    }, index * 220);
  });

  return locationGroups.length;
}

// ============================================================================
// 3. IN BẢNG ĐỐI SOÁT CÔNG NỢ KHÁCH HÀNG CHUẨN A4 (TRANG 16)
// ============================================================================

export function printCustomerDebtStatement(
  report: CustomerDebtReportResponse,
  customGroups?: DebtGroupView[],
): void {
  const groupsToPrint = customGroups ?? report.groups;
  const { companyInfo, period } = report;

  let grandBeforeVat = 0;
  let grandVat = 0;
  let grandAmount = 0;
  let totalVoucherCount = 0;

  for (const grp of groupsToPrint) {
    grandBeforeVat += Number(grp.subtotalBeforeVat) || 0;
    grandVat += Number(grp.subtotalVat) || 0;
    grandAmount += Number(grp.subtotalAmount) || 0;
    totalVoucherCount += grp.voucherCount;
  }

  const groupSectionsHtml = groupsToPrint
    .map((group, groupIdx) => {
      const groupTitle =
        group.groupBy === 'location'
          ? `Địa điểm: ${escapeHtml(group.locationName)} — Khách hàng: ${escapeHtml(group.customerName)} (${escapeHtml(group.customerCode)})`
          : `Khách hàng: ${escapeHtml(group.customerName)} (${escapeHtml(group.customerCode)})`;

      const groupSubInfo =
        group.groupBy === 'location'
          ? `Địa chỉ giao: ${escapeHtml(group.locationAddress)} | Người nhận: ${escapeHtml(group.receiverName ?? '—')} ${group.receiverPhone ? `(${escapeHtml(group.receiverPhone)})` : ''}`
          : `MST: ${escapeHtml(group.customerTaxCode ?? '—')} | SĐT: ${escapeHtml(group.customerPhone ?? '—')}`;

      const rowsHtml = group.vouchers
        .map(
          (v, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td style="text-align:center;">${escapeHtml(formatDateTimeVi(v.deliveredAt))}</td>
            <td style="font-family:monospace;font-weight:bold;">${escapeHtml(v.deliveryCode)}</td>
            <td style="font-family:monospace;">
              ${escapeHtml(v.orderCode)}
              ${v.orderType === 'compensation' ? ' <span style="font-size:10px;color:#6b21a8;">(Đơn bù)</span>' : ''}
            </td>
            <td>${escapeHtml(group.groupBy === 'customer' ? v.locationName : v.customerName)}</td>
            <td style="text-align:right;">${formatCurrencyVnd(v.totalBeforeVat)}</td>
            <td style="text-align:right;">${formatCurrencyVnd(v.totalVat)}</td>
            <td style="text-align:right;font-weight:bold;">${formatCurrencyVnd(v.totalAmount)}</td>
          </tr>`,
        )
        .join('');

      return `
        <div class="group-block">
          <div class="group-header">
            <div><strong>${groupIdx + 1}. ${groupTitle}</strong></div>
            <div style="font-size:11px;color:#475569;margin-top:2px;">${groupSubInfo}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:38px;">STT</th>
                <th style="width:125px;">Ngày giao</th>
                <th style="width:120px;">Mã phiếu xuất</th>
                <th style="width:120px;">Mã đơn hàng</th>
                <th>${group.groupBy === 'customer' ? 'Địa điểm giao hàng' : 'Khách hàng'}</th>
                <th style="width:115px;text-align:right;">Tiền trước VAT</th>
                <th style="width:100px;text-align:right;">Tiền VAT</th>
                <th style="width:125px;text-align:right;">Tổng cộng</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="subtotal-row">
                <td colspan="5" style="text-align:right;">
                  CỘNG DỒN NHÓM (${group.voucherCount} phiếu xuất):
                </td>
                <td style="text-align:right;">${formatCurrencyVnd(group.subtotalBeforeVat)}</td>
                <td style="text-align:right;">${formatCurrencyVnd(group.subtotalVat)}</td>
                <td style="text-align:right;">${formatCurrencyVnd(group.subtotalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    })
    .join('');

  const printHtml = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Bảng Đối Chiếu Công Nợ Khách Hàng (${escapeHtml(period.fromDate)} - ${escapeHtml(period.toDate)})</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          body {
            font-family: "Times New Roman", Times, serif;
            font-size: 12.5px;
            color: #111827;
            line-height: 1.4;
          }
          .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111827;
            padding-bottom: 8px;
            margin-bottom: 14px;
          }
          .company-name { font-size: 14px; font-weight: bold; text-transform: uppercase; }
          .national-motto { text-align: center; font-weight: bold; font-size: 12.5px; }
          .doc-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 10px 0 4px 0;
          }
          .doc-period {
            text-align: center;
            font-style: italic;
            margin-bottom: 14px;
          }
          .group-block { margin-bottom: 16px; page-break-inside: avoid; }
          .group-header {
            background: #f1f5f9;
            border: 1px solid #94a3b8;
            border-bottom: none;
            padding: 6px 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #64748b;
            padding: 5px 7px;
            font-size: 12px;
          }
          th {
            background: #e2e8f0;
            font-weight: bold;
          }
          .subtotal-row {
            background: #fef9c3;
            font-weight: bold;
          }
          .grand-total-box {
            margin-top: 12px;
            padding: 10px 12px;
            border: 2px solid #0f172a;
            background: #f8fafc;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 28px;
            text-align: center;
            page-break-inside: avoid;
          }
          .sig-col { width: 45%; }
          .footer-note {
            margin-top: 70px;
            font-size: 11px;
            font-style: italic;
            color: #475569;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="top-bar">
          <div>
            <div class="company-name">${escapeHtml(companyInfo.companyName)}</div>
            <div>Địa chỉ: ${escapeHtml(companyInfo.companyAddress)}</div>
            <div>Điện thoại: ${escapeHtml(companyInfo.companyPhone)} — MST: ${escapeHtml(companyInfo.companyTaxCode)}</div>
          </div>
          <div class="national-motto">
            <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="text-decoration:underline;">Độc lập - Tự do - Hạnh phúc</div>
          </div>
        </div>

        <div class="doc-title">BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ KHÁCH HÀNG</div>
        <div class="doc-period">
          Kỳ đối soát: Từ ngày ${escapeHtml(period.fromDate)} đến ngày ${escapeHtml(period.toDate)}
          (Chế độ gom nhóm: ${report.groupBy === 'location' ? 'Theo Địa điểm giao hàng' : 'Theo Khách hàng'})
        </div>

        ${groupSectionsHtml}

        <div class="grand-total-box">
          <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13.5px;">
            <span>TỔNG CỘNG PHẢI THU TOÀN KỲ (${totalVoucherCount} phiếu xuất kho):</span>
            <span>${formatCurrencyVnd(grandAmount)}</span>
          </div>
          <div style="margin-top:4px;font-size:12px;">
            Trong đó — Tiền trước thuế VAT: <strong>${formatCurrencyVnd(grandBeforeVat)}</strong>
            | Tiền thuế VAT: <strong>${formatCurrencyVnd(grandVat)}</strong>
          </div>
          <div style="margin-top:4px;">
            <strong>Số tiền viết bằng chữ:</strong> <em>${escapeHtml(numberToVietnameseWords(grandAmount))}</em>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-col">
            <strong>ĐẠI DIỆN BÊN GIAO HÀNG (VIETTHANGFOOD)</strong>
            <div style="font-style:italic;font-size:11px;">(Ký, ghi rõ họ tên & đóng dấu)</div>
          </div>
          <div class="sig-col">
            <strong>ĐẠI DIỆN KHÁCH HÀNG ĐỐI SOÁT</strong>
            <div style="font-style:italic;font-size:11px;">(Ký, xác nhận công nợ thực giao)</div>
          </div>
        </div>

        <div class="footer-note">
          ${escapeHtml(companyInfo.invoiceFooter)}
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWin = window.open('', '_blank', 'width=960,height=800');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  }
}
