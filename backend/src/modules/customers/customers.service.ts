import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCustomerDto,
  CreateCustomerLocationDto,
  QueryCustomersDto,
  UpdateCustomerDto,
  UpdateCustomerLocationDto,
} from './dto/customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trang 17: Danh sách khách hàng kèm các địa điểm giao hàng (1 - N).
   * Tuân thủ Quy tắc 6.1 (Soft Delete: hỗ trợ ẩn và hiện cả mục đã ẩn).
   */
  async listCustomers(query: QueryCustomersDto) {
    const customers = await this.prisma.customer.findMany({
      where: {
        ...(query.includeHidden ? {} : { isHidden: false }),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search.trim() } },
                { name: { contains: query.search.trim() } },
                { taxCode: { contains: query.search.trim() } },
              ],
            }
          : {}),
      },
      include: {
        locations: {
          where: query.includeHidden ? {} : { isHidden: false },
          orderBy: [{ isHidden: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ isHidden: 'asc' }, { id: 'desc' }],
    });

    return customers.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * Trang 17: Tạo mới khách hàng và danh sách địa điểm giao hàng ban đầu.
   */
  async createCustomer(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { code: dto.code.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `Mã khách hàng '${dto.code}' đã tồn tại trong hệ thống.`,
      );
    }

    const created = await this.prisma.customer.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        taxCode: dto.taxCode?.trim() ?? null,
        phone: dto.phone?.trim() ?? null,
        note: dto.note?.trim() ?? null,
        isHidden: false,
        ...(dto.locations && dto.locations.length > 0
          ? {
              locations: {
                create: dto.locations.map((loc) => ({
                  name: loc.name.trim(),
                  address: loc.address.trim(),
                  receiverName: loc.receiverName?.trim() ?? null,
                  receiverPhone: loc.receiverPhone?.trim() ?? null,
                  isHidden: false,
                })),
              },
            }
          : {}),
      },
      include: {
        locations: true,
      },
    });

    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Trang 17: Cập nhật khách hàng hoặc Soft Delete (isHidden = true / false).
   */
  async updateCustomer(customerId: number, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Không tìm thấy khách hàng ID #${customerId}.`,
      );
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.taxCode !== undefined ? { taxCode: dto.taxCode } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.isHidden !== undefined ? { isHidden: dto.isHidden } : {}),
      },
      include: {
        locations: true,
      },
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Trang 17: Thêm địa điểm giao hàng mới cho khách hàng (Quan hệ 1 - N).
   */
  async addCustomerLocation(
    customerId: number,
    dto: CreateCustomerLocationDto,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Không tìm thấy khách hàng ID #${customerId}.`,
      );
    }

    return this.prisma.customerLocation.create({
      data: {
        customerId,
        name: dto.name.trim(),
        address: dto.address.trim(),
        receiverName: dto.receiverName?.trim() ?? null,
        receiverPhone: dto.receiverPhone?.trim() ?? null,
        isHidden: false,
      },
    });
  }

  /**
   * Trang 17: Cập nhật hoặc Ẩn/Hiện (Soft Delete) địa điểm giao hàng.
   */
  async updateCustomerLocation(
    locationId: number,
    dto: UpdateCustomerLocationDto,
  ) {
    const location = await this.prisma.customerLocation.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundException(
        `Không tìm thấy địa điểm giao hàng ID #${locationId}.`,
      );
    }

    return this.prisma.customerLocation.update({
      where: { id: locationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
        ...(dto.receiverName !== undefined
          ? { receiverName: dto.receiverName }
          : {}),
        ...(dto.receiverPhone !== undefined
          ? { receiverPhone: dto.receiverPhone }
          : {}),
        ...(dto.isHidden !== undefined ? { isHidden: dto.isHidden } : {}),
      },
    });
  }
}

