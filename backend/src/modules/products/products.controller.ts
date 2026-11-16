import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  BulkUpdateSafetyStockDto,
  CreateProductDto,
  QueryProductsDto,
  UpdateProductDto,
} from './dto/products.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async listProducts(@Query() query: QueryProductsDto) {
    return this.productsService.listProducts(query);
  }

  @Post()
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @Put('safety-stock')
  async bulkUpdateSafetyStock(@Body() dto: BulkUpdateSafetyStockDto) {
    return this.productsService.bulkUpdateSafetyStock(dto);
  }

  @Patch(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, dto);
  }
}

