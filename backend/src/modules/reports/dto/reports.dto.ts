import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

// ============================================================================
// TRANG 15: BÁO CÁO DOANH THU (REVENUE REPORT)
// ============================================================================

export enum RevenueDimension {
  customer = 'customer',
  location = 'location',
  product = 'product',
  category = 'category',
}

export class RevenueReportQueryDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Từ ngày (fromDate) phải đúng định dạng YYYY-MM-DD' },
  )
  fromDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Đến ngày (toDate) phải đúng định dạng YYYY-MM-DD' },
  )
  toDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Tháng (month) phải đúng định dạng YYYY-MM (ví dụ: 2026-11)',
  })
  month?: string;

  @IsOptional()
  @IsEnum(RevenueDimension, {
    message:
      'Trục phân tích (dimension) phải thuộc: customer | location | product | category',
  })
  dimension?: RevenueDimension;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}

// ============================================================================
// TRANG 16: BÁO CÁO CÔNG NỢ KHÁCH HÀNG (CUSTOMER DEBTS RECONCILIATION)
// ============================================================================

export enum DebtGroupBy {
  customer = 'customer',
  location = 'location',
}

export class CustomerDebtQueryDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Từ ngày (fromDate) phải đúng định dạng YYYY-MM-DD' },
  )
  fromDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Đến ngày (toDate) phải đúng định dạng YYYY-MM-DD' },
  )
  toDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Tháng (month) phải đúng định dạng YYYY-MM',
  })
  month?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  locationId?: number;

  @IsOptional()
  @IsEnum(DebtGroupBy, {
    message: 'Chế độ gom nhóm (groupBy) phải là customer hoặc location',
  })
  groupBy?: DebtGroupBy;

  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'Thứ tự sắp xếp ngày giao (sortOrder) phải là asc hoặc desc',
  })
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  keyword?: string;
}
