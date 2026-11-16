import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class QueryCustomersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeHidden?: boolean;
}

export class CreateCustomerLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên địa điểm nhận hàng không được để trống.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống.' })
  address!: string;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  receiverPhone?: string;
}

export class UpdateCustomerLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  receiverPhone?: string;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã khách hàng không được để trống.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên khách hàng không được để trống.' })
  name!: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerLocationDto)
  locations?: CreateCustomerLocationDto[];
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

