import { CheckLevel, OrderStatus, ShortAction } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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

export class QueryOrdersDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(CheckLevel)
  checkLevel?: CheckLevel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeHidden?: boolean;
}

export class CreateOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsNumberString()
  qtyOrdered!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  customerId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  locationId!: number;

  @IsDateString()
  orderDate!: string;

  @IsDateString()
  deliveryAt!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class UpdateOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  locationId?: number;

  @IsOptional()
  @IsDateString()
  deliveryAt?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty({
    message: 'Bắt buộc nhập lý do hủy đơn hàng (cancelReason) theo Quy tắc 4.2.',
  })
  @MaxLength(500)
  cancelReason!: string;
}

export class DeliverOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  orderItemId!: number;

  @IsNumberString()
  qtyDelivered!: string;

  @IsOptional()
  @IsEnum(ShortAction)
  shortAction?: ShortAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortCloseReason?: string;
}

export class DeliverOrderDto {
  @IsOptional()
  @IsDateString()
  compensationDeliveryAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliverOrderItemDto)
  items!: DeliverOrderItemDto[];
}
