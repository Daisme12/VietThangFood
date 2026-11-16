import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BulkUpdateSafetyStockDto,
  CreateProductDto,
  QueryProductsDto,
  UpdateProductDto,
} from './dto/products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trang 18 & Trang 10: Danh sách thành phẩm kèm danh mục và định mức an toàn.
   * Hỗ trợ Soft Delete (isHidden).
   */
  async listProducts(query: QueryProductsDto) {
    const products = await this.prisma.product.findMany({
      where: {
        ...(query.includeHidden ? {} : { isHidden: false }),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
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
        category: true,
        recipeItems: {
          include: {
            material: true,
          },
        },
      },
      orderBy: [{ isHidden: 'asc' }, { id: 'asc' }],
    });

    return products.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      code: p.code,
      name: p.name,
      packageSpec: p.packageSpec,
      unit: p.unit,
      price: p.price.toFixed(2),
      vatRate: p.vatRate.toFixed(2),
      safetyStock: p.safetyStock.toFixed(3),
      isHidden: p.isHidden,
      createdAt: p.createdAt.toISOString(),
      recipeCount: p.recipeItems.length,
    }));
  }

  /**
   * Trang 18: Tạo mới sản phẩm (VAT mặc định 10%, Decimal(15,2) cho giá, Decimal(15,3) cho safetyStock).
   */
  async createProduct(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { code: dto.code.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `Mã SKU '${dto.code}' đã tồn tại trong hệ thống.`,
      );
    }

    const created = await this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        packageSpec: dto.packageSpec?.trim() ?? null,
        unit: dto.unit.trim(),
        price: new Prisma.Decimal(dto.price).toDecimalPlaces(2),
        vatRate: new Prisma.Decimal(dto.vatRate ?? 10).toDecimalPlaces(2),
        safetyStock: new Prisma.Decimal(dto.safetyStock ?? 0).toDecimalPlaces(3),
        isHidden: false,
      },
      include: {
        category: true,
      },
    });

    return {
      ...created,
      price: created.price.toFixed(2),
      vatRate: created.vatRate.toFixed(2),
      safetyStock: created.safetyStock.toFixed(3),
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Trang 18: Cập nhật sản phẩm hoặc Soft Delete (isHidden).
   */
  async updateProduct(id: number, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ID #${id}.`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.packageSpec !== undefined
          ? { packageSpec: dto.packageSpec }
          : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
        ...(dto.price !== undefined
          ? { price: new Prisma.Decimal(dto.price).toDecimalPlaces(2) }
          : {}),
        ...(dto.vatRate !== undefined
          ? { vatRate: new Prisma.Decimal(dto.vatRate).toDecimalPlaces(2) }
          : {}),
        ...(dto.safetyStock !== undefined
          ? {
              safetyStock: new Prisma.Decimal(dto.safetyStock).toDecimalPlaces(
                3,
              ),
            }
          : {}),
        ...(dto.isHidden !== undefined ? { isHidden: dto.isHidden } : {}),
      },
    });

    return {
      ...updated,
      price: updated.price.toFixed(2),
      vatRate: updated.vatRate.toFixed(2),
      safetyStock: updated.safetyStock.toFixed(3),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Trang 10: Cài đặt hàng loạt Định mức an toàn (safety_stock) cho từng thành phẩm.
   */
  async bulkUpdateSafetyStock(dto: BulkUpdateSafetyStockDto) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            safetyStock: new Prisma.Decimal(item.safetyStock).toDecimalPlaces(
              3,
            ),
          },
        });
      }

      return {
        updatedCount: dto.items.length,
        message: `Đã cập nhật định mức an toàn (safety_stock) cho ${dto.items.length} thành phẩm.`,
      };
    });
  }
}
