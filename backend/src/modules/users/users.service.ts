import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ROLE_PERMISSIONS_MATRIX } from '../auth/roles.guard';
import {
  CreateUserDto,
  QueryUsersDto,
  UpdateUserDto,
} from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Trang 22: Lấy danh sách người dùng kèm quyền hạn (hỗ trợ Soft Delete: ẩn/hiện mục đã ẩn).
   */
  async listUsers(query: QueryUsersDto) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(query.role ? { role: query.role } : {}),
        ...(query.includeHidden ? {} : { isHidden: false }),
      },
      orderBy: [{ isHidden: 'asc' }, { id: 'asc' }],
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      isHidden: u.isHidden,
      createdAt: u.createdAt.toISOString(),
      permissions: ROLE_PERMISSIONS_MATRIX[u.role],
    }));
  }

  /**
   * Trang 22: Tạo tài khoản người dùng mới.
   */
  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `Tên đăng nhập '${dto.username}' đã tồn tại trong hệ thống.`,
      );
    }

    const passwordHash = this.authService.hashPassword(dto.password);
    const created = await this.prisma.user.create({
      data: {
        username: dto.username.trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        role: dto.role,
        isHidden: false,
      },
    });

    return {
      id: created.id,
      username: created.username,
      fullName: created.fullName,
      role: created.role,
      isHidden: created.isHidden,
      createdAt: created.createdAt.toISOString(),
      permissions: ROLE_PERMISSIONS_MATRIX[created.role],
    };
  }

  /**
   * Trang 22: Cập nhật thông tin người dùng / Phân quyền / Soft Delete (isHidden).
   */
  async updateUser(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng ID #${id}.`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isHidden !== undefined ? { isHidden: dto.isHidden } : {}),
      },
    });

    return {
      id: updated.id,
      username: updated.username,
      fullName: updated.fullName,
      role: updated.role,
      isHidden: updated.isHidden,
      permissions: ROLE_PERMISSIONS_MATRIX[updated.role],
      message: updated.isHidden
        ? `Đã ẩn (Soft Delete) tài khoản '${updated.username}'.`
        : `Đã cập nhật tài khoản '${updated.username}'.`,
    };
  }
}

