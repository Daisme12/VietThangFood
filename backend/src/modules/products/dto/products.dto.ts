import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class QueryProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeHidden?: boolean;
}

export class CreateProductDto {
  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @IsString()
  @IsNotEmpty({ message: 'Mã SKU thành phẩm không được để trống.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên thành phẩm không được để trống.' })
  name!: string;

  @IsOptional()
  @IsString()
  packageSpec?: string;

  @IsString()
  @IsNotEmpty({ message: 'Đơn vị tính không được để trống.' })
  unit!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  safetyStock?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  packageSpec?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  safetyStock?: number;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

export class SafetyStockEntryDto {
  @Type(() => Number)
  @IsInt()
  productId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  safetyStock!: number;
}

export class BulkUpdateSafetyStockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyStockEntryDto)
  items!: SafetyStockEntryDto[];
}

