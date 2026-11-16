import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SettingEntryDto {
  @IsString()
  @IsNotEmpty()
  settingKey!: string;

  @IsString()
  settingValue!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkUpdateSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingEntryDto)
  settings!: SettingEntryDto[];
}

