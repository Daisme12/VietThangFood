import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// ============================================================================
// TRANG 11: DANH SÁCH HÀNG NHẬP & TẠO PHIẾU NHẬP (purchase_items)
// ============================================================================

export class PurchaseReceiptLineDto {
  @Type(() => Number)
  @IsInt({ message: 'materialId phải là số nguyên' })
  @IsPositive({ message: 'materialId phải lớn hơn 0' })
  materialId!: number;

  @IsNumberString({}, { message: 'Số lượng nhập (qty) phải là chuỗi số hợp lệ' })
  qty!: string;

  @IsNumberString({}, { message: 'Đơn giá (unitPrice) phải là chuỗi số hợp lệ' })
  unitPrice!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class CreatePurchaseReceiptDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  receiptCode?: string;

  @IsDateString({}, { message: 'Ngày nhập (receiptDate) phải đúng chuẩn YYYY-MM-DD' })
  receiptDate!: string;

  @Type(() => Number)
  @IsInt({ message: 'supplierId phải là số nguyên' })
  @IsPositive({ message: 'Vui lòng chọn nhà cung cấp hợp lệ' })
  supplierId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @IsArray({ message: 'Danh sách nguyên liệu nhập phải là mảng' })
  @ArrayMinSize(1, { message: 'Phiếu nhập phải có ít nhất 1 dòng nguyên liệu' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceiptLineDto)
  items!: PurchaseReceiptLineDto[];
}

export class PurchaseFilterQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  supplierId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  materialId?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}

// ============================================================================
// TRANG 12: KIỂM KÊ CUỐI NGÀY (stock_movements: adjustment)
// ============================================================================

export enum InventoryTargetType {
  product = 'product',
  material = 'material',
}

export class StocktakeItemInputDto {
  @IsEnum(InventoryTargetType, {
    message: 'targetType phải là product hoặc material',
  })
  targetType!: InventoryTargetType;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  targetId!: number;

  @IsNumberString(
    {},
    { message: 'Tồn thực tế (actualStock) phải là chuỗi số hợp lệ' },
  )
  actualStock!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class SubmitDailyStocktakeDto {
  @IsDateString(
    {},
    { message: 'Ngày kiểm kê (stocktakeDate) phải đúng chuẩn YYYY-MM-DD' },
  )
  stocktakeDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  generalNote?: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'Danh sách kiểm kê phải có ít nhất 1 mặt hàng',
  })
  @ValidateNested({ each: true })
  @Type(() => StocktakeItemInputDto)
  items!: StocktakeItemInputDto[];
}

// ============================================================================
// TRANG 13: HỦY VÀ HAO HỤT (stock_movements: waste_loss)
// ============================================================================

export class RecordWasteLossDto {
  @IsDateString(
    {},
    { message: 'Ngày hủy (movementDate) phải đúng chuẩn YYYY-MM-DD' },
  )
  movementDate!: string;

  @IsEnum(InventoryTargetType, {
    message: 'Loại mặt hàng hủy phải là product hoặc material',
  })
  targetType!: InventoryTargetType;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  targetId!: number;

  @IsNumberString({}, { message: 'Số lượng hủy (qty) phải là chuỗi số dương' })
  qty!: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập lý do hủy / hao hụt' })
  @MaxLength(255)
  reason!: string;
}

// ============================================================================
// TRANG 14: BÁO CÁO TỒN KHO (Tổng hợp biến động theo kỳ)
// ============================================================================

export class InventoryReportQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
