import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMaterialDto,
  QueryMaterialsDto,
  UpdateMaterialDto,
} from './dto/materials.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trang 19: Danh sách nguyên vật liệu kèm nhà cung cấp mặc định, min_stock và hỗ trợ Soft Delete.
   */
  async listMaterials(query: QueryMaterialsDto) {
    const materials = await this.prisma.material.findMany({
      where: {
        ...(query.includeHidden ? {} : { isHidden: false }),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search.trim() } },
                { name: { contains: query.search.trim() } },
              ],
            }
          : {}),
      },
      include: {
        supplier: true,
      },
      orderBy: [{ isHidden: 'asc' }, { id: 'asc' }],
    });

    return materials.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      unit: m.unit,
      minStock: m.minStock.toFixed(3),
      supplierId: m.supplierId,
      supplierName: m.supplier?.name ?? null,
      isHidden: m.isHidden,
    }));
  }

  /**
   * Trang 19: Tạo mới nguyên vật liệu (số lượng Decimal(15,3) cho min_stock).
   */
  async createMaterial(dto: CreateMaterialDto) {
    const existing = await this.prisma.material.findUnique({
      where: { code: dto.code.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `Mã nguyên vật liệu '${dto.code}' đã tồn tại trong hệ thống.`,
      );
    }

    const created = await this.prisma.material.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        unit: dto.unit.trim(),
        minStock: new Prisma.Decimal(dto.minStock).toDecimalPlaces(3),
        supplierId: dto.supplierId ?? null,
        isHidden: false,
      },
      include: {
        supplier: true,
      },
    });

    return {
      ...created,
      minStock: created.minStock.toFixed(3),
    };
  }

  /**
   * Trang 19: Cập nhật nguyên vật liệu hoặc Soft Delete (isHidden).
   */
  async updateMaterial(id: number, dto: UpdateMaterialDto) {
    const existing = await this.prisma.material.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy nguyên vật liệu ID #${id}.`);
    }

    const updated = await this.prisma.material.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
        ...(dto.minStock !== undefined
          ? { minStock: new Prisma.Decimal(dto.minStock).toDecimalPlaces(3) }
          : {}),
        ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
        ...(dto.isHidden !== undefined ? { isHidden: dto.isHidden } : {}),
      },
      include: {
        supplier: true,
      },
    });

    return {
      ...updated,
      minStock: updated.minStock.toFixed(3),
    };
  }
}
