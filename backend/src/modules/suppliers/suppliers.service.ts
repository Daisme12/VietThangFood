import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSupplierDto,
  QuerySuppliersDto,
  UpdateSupplierDto,
} from './dto/suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trang 20: Danh sách nhà cung cấp kèm thống kê số mặt hàng nguyên liệu và tổng giá trị lịch sử cung ứng.
   * Hỗ trợ Soft Delete (isHidden).
   */
  async listSuppliers(query: QuerySuppliersDto) {
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        ...(query.includeHidden ? {} : { isHidden: false }),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search.trim() } },
                { name: { contains: query.search.trim() } },
                { phone: { contains: query.search.trim() } },
              ],
            }
          : {}),
      },
      include: {
        materials: {
          where: { isHidden: false },
          select: { id: true, code: true, name: true, unit: true },
        },
        purchaseItems: {
          where: { isHidden: false },
          orderBy: { receiptDate: 'desc' },
          take: 20,
          include: {
            material: {
              select: { code: true, name: true, unit: true },
            },
          },
        },
      },
      orderBy: [{ isHidden: 'asc' }, { id: 'asc' }],
    });

    return suppliers.map((s) => {
      const totalPurchaseAmount = s.purchaseItems.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      );

      return {
        id: s.id,
        code: s.code,
        name: s.name,
        phone: s.phone,
        address: s.address,
        isHidden: s.isHidden,
        materialsCount: s.materials.length,
        materials: s.materials,
        totalPurchaseAmount: totalPurchaseAmount.toFixed(2),
        supplyHistory: s.purchaseItems.map((pi) => ({
          id: pi.id.toString(),
          receiptCode: pi.receiptCode,
          receiptDate: pi.receiptDate.toISOString().slice(0, 10),
          materialCode: pi.material.code,
          materialName: pi.material.name,
          unit: pi.material.unit,
          qty: pi.qty.toFixed(3),
          unitPrice: pi.unitPrice.toFixed(2),
          lineTotal: pi.lineTotal.toFixed(2),
        })),
      };
    });
  }

  /**
   * Trang 20: Tạo mới nhà cung cấp.
   */
  async createSupplier(dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({
      where: { code: dto.code.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `Mã nhà cung cấp '${dto.code}' đã tồn tại trong hệ thống.`,
      );
    }

    return this.prisma.supplier.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        phone: dto.phone?.trim() ?? null,
        address: dto.address?.trim() ?? null,
        isHidden: false,
      },
    });
  }

  /**
   * Trang 20: Cập nhật thông tin nhà cung cấp hoặc Soft Delete (isHidden).
   */
  async updateSupplier(id: number, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy nhà cung cấp ID #${id}.`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.isHidden !== undefined ? { isHidden: dto.isHidden } : {}),
      },
    });
  }
}
