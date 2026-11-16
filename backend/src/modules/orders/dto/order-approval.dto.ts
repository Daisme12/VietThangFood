import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class ApproveOrderParamDto {
  @Type(() => Number)
  @IsInt({ message: 'orderId phải là số nguyên hợp lệ' })
  @IsPositive({ message: 'orderId phải lớn hơn 0' })
  orderId!: number;
}

export class ApproveOrderBodyDto {
  @IsOptional()
  @IsString({ message: 'Ghi chú duyệt đơn phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
  note?: string;
}

export class BulkApproveGreenYellowDto {
  @IsArray({ message: 'orderIds phải là mảng số nguyên' })
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 đơn hàng để duyệt hàng loạt' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Mỗi orderId phải là số nguyên' })
  @IsPositive({ each: true, message: 'Mỗi orderId phải lớn hơn 0' })
  orderIds!: number[];
}

export interface MaterialShortageDetail {
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string;
  requiredQty: string;
  availableQty: string;
  shortageQty: string;
  affectedProducts: Array<{
    productId: number;
    productCode: string;
    productName: string;
    qtyToProduce: string;
    bomQtyPerUnit: string;
    materialRequiredForProduct: string;
  }>;
}

export interface OrderItemAllocationSummary {
  orderItemId: string;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  qtyOrdered: string;
  availableProductStockBefore: string;
  qtyFromStock: string;
  qtyToProduce: string;
}

export interface ApproveOrderResultDto {
  orderId: string;
  orderCode: string;
  previousStatus: string;
  status: 'approved' | 'blocked';
  checkLevel: 'green' | 'yellow' | 'red';
  approvedBy: number;
  evaluatedAt: string;
  itemAllocations: OrderItemAllocationSummary[];
  materialShortages: MaterialShortageDetail[];
  message: string;
}

