import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryMaterialsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeHidden?: boolean;
}

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã nguyên vật liệu không được để trống.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên nguyên vật liệu không được để trống.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Đơn vị tính không được để trống.' })
  unit!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number;
}

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number | null;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

