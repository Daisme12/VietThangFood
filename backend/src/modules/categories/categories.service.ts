import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCategoryDto,
  QueryCategoriesDto,
  UpdateCategoryDto,
} from './dto/categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(query: QueryCategoriesDto) {
    return this.prisma.category.findMany({
      where: query.includeHidden ? {} : { isHidden: false },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ isHidden: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isHidden: false,
      },
    });
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy danh mục ID #${id}.`);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isHidden !== undefined ? { isHidden: dto.isHidden } : {}),
      },
    });
  }
}
