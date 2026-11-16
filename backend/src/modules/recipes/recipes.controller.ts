import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { UpsertProductRecipeDto } from './dto/recipes.dto';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  /**
   * Trang 9: Lấy toàn bộ BOM và số sản phẩm tối đa làm được theo tồn hiện tại.
   * GET /api/v1/recipes
   */
  @Get()
  async listRecipes() {
    return this.recipesService.listAllProductRecipesWithMaxProducable();
  }

  /**
   * Trang 9: Cập nhật công thức BOM cho 1 thành phẩm.
   * PUT /api/v1/recipes/products/:productId
   */
  @Put('products/:productId')
  async upsertProductRecipe(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpsertProductRecipeDto,
  ) {
    return this.recipesService.upsertProductRecipe(productId, dto);
  }
}

