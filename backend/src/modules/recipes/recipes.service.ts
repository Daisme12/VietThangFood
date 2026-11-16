import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertProductRecipeDto } from './dto/recipes.dto';

const ZERO_DEC = new Prisma.Decimal(0);

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trang 9: Lấy danh sách Định mức nguyên liệu (BOM) của toàn bộ thành phẩm
   * kèm phép tính: "Số sản phẩm tối đa làm được theo tồn nguyên liệu hiện tại".
   */
  async listAllProductRecipesWithMaxProducable() {
    const [products, materialMovements] = await Promise.all([
      this.prisma.product.findMany({
        where: { isHidden: false },
        include: {
          category: true,
          recipeItems: {
            include: {
              material: true,
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.stockMovement.groupBy({
        by: ['materialId', 'movementType'],
        where: {
          materialId: { not: null },
        },
        _sum: {
          qty: true,
        },
      }),
    ]);

    const materialStockMap = new Map<number, Prisma.Decimal>();
    for (const row of materialMovements) {
      if (row.materialId === null) continue;
      const sumQty = row._sum.qty ?? ZERO_DEC;
      const current = materialStockMap.get(row.materialId) ?? ZERO_DEC;
      const signed = this.resolveSignedMovement(row.movementType, sumQty);
      materialStockMap.set(row.materialId, current.add(signed));
    }

    return products.map((product) => {
      const ingredients = product.recipeItems.map((ri) => {
        const currentMaterialStock = Prisma.Decimal.max(
          ZERO_DEC,
          materialStockMap.get(ri.materialId) ?? ZERO_DEC,
        );
        const maxUnitsByThisMaterial = ri.qty.gt(ZERO_DEC)
          ? Math.floor(
              Number(currentMaterialStock.div(ri.qty).toFixed(6)),
            )
          : 0;

        return {
          recipeItemId: ri.id,
          materialId: ri.materialId,
          materialCode: ri.material.code,
          materialName: ri.material.name,
          materialUnit: ri.material.unit,
          bomQtyPerProductUnit: ri.qty.toFixed(4),
          currentMaterialStock: currentMaterialStock.toFixed(3),
          maxProducableUnitsByMaterial: maxUnitsByThisMaterial,
        };
      });

      const maxProducableUnits =
        ingredients.length > 0
          ? Math.min(
              ...ingredients.map((i) => i.maxProducableUnitsByMaterial),
            )
          : 0;

      const limitingIngredient =
        ingredients.find(
          (i) => i.maxProducableUnitsByMaterial === maxProducableUnits,
        ) ?? null;

      return {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        categoryName: product.category.name,
        unit: product.unit,
        packageSpec: product.packageSpec,
        maxProducableUnits,
        limitingMaterialCode: limitingIngredient?.materialCode ?? null,
        limitingMaterialName: limitingIngredient?.materialName ?? null,
        ingredients,
      };
    });
  }

  /**
   * Trang 9: Cập nhật công thức BOM (recipe_items) cho 1 thành phẩm trong Database Transaction.
   */
  async upsertProductRecipe(productId: number, dto: UpsertProductRecipeDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(
          `Không tìm thấy thành phẩm ID #${productId}.`,
        );
      }

      const uniqueMaterialIds = new Set(
        dto.ingredients.map((i) => i.materialId),
      );
      if (uniqueMaterialIds.size !== dto.ingredients.length) {
        throw new BadRequestException(
          'Không được khai báo trùng lặp cùng một nguyên vật liệu trong một công thức BOM.',
        );
      }

      await tx.recipeItem.deleteMany({
        where: { productId },
      });

      if (dto.ingredients.length > 0) {
        await tx.recipeItem.createMany({
          data: dto.ingredients.map((item) => ({
            productId,
            materialId: item.materialId,
            qty: new Prisma.Decimal(item.qty).toDecimalPlaces(4),
          })),
        });
      }

      return {
        productId,
        productCode: product.code,
        productName: product.name,
        ingredientsCount: dto.ingredients.length,
        message: `Đã lưu công thức định mức nguyên liệu (BOM) cho sản phẩm ${product.name}.`,
      };
    });
  }

  private resolveSignedMovement(
    movementType: StockMovementType,
    rawQty: Prisma.Decimal,
  ): Prisma.Decimal {
    switch (movementType) {
      case StockMovementType.import:
      case StockMovementType.production_in:
        return rawQty.abs();
      case StockMovementType.production_out:
      case StockMovementType.export_delivery:
      case StockMovementType.waste_loss:
        return rawQty.abs().neg();
      case StockMovementType.adjustment:
        return rawQty;
    }
  }
}
