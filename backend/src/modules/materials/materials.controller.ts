import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateMaterialDto,
  QueryMaterialsDto,
  UpdateMaterialDto,
} from './dto/materials.dto';
import { MaterialsService } from './materials.service';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async listMaterials(@Query() query: QueryMaterialsDto) {
    return this.materialsService.listMaterials(query);
  }

  @Post()
  async createMaterial(@Body() dto: CreateMaterialDto) {
    return this.materialsService.createMaterial(dto);
  }

  @Patch(':id')
  async updateMaterial(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.materialsService.updateMaterial(id, dto);
  }
}

