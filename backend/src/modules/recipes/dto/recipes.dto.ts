import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecipeItemInputDto {
  @Type(() => Number)
  @IsInt()
  materialId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001, { message: 'Định lượng nguyên liệu BOM phải lớn hơn 0.' })
  qty!: number;
}

export class UpsertProductRecipeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemInputDto)
  ingredients!: RecipeItemInputDto[];
}

