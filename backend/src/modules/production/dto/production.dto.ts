import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class RecordActualProductionDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001, { message: 'Số lượng thực tế đã làm phải lớn hơn 0.' })
  actualQty!: number;

  @IsOptional()
  @IsString()
  productionDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

