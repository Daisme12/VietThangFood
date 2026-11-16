import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Bản đồ quyền hạn theo đúng Mục 4 - Trang 22 trong activity.md:
 * - Admin: Toàn quyền.
 * - Quản lý (manager): Bán hàng, duyệt đơn, báo cáo, danh mục.
 * - Bếp / Kho (kitchen): Sản xuất, nhập hàng, kiểm kê, hao hụt.
 * - Nhân viên (staff): Lên đơn, in đơn, tạo phiếu xuất kho.
 */
export const ROLE_PERMISSIONS_MATRIX: Record<UserRole, string[]> = {
  [UserRole.admin]: ['*'],
  [UserRole.manager]: [
    'dashboard.view',
    'sales.orders',
    'sales.approve',
    'sales.today',
    'sales.delivery',
    'sales.cancelled',
    'reports.revenue',
    'reports.debts',
    'inventory.report',
    'catalogs.customers',
    'catalogs.products',
    'catalogs.materials',
    'catalogs.suppliers',
    'production.bom',
    'production.safety_stock',
  ],
  [UserRole.kitchen]: [
    'dashboard.view',
    'production.plan',
    'production.record',
    'production.bom',
    'production.safety_stock',
    'inventory.purchases',
    'inventory.stocktake',
    'inventory.waste_loss',
    'inventory.report',
  ],
  [UserRole.staff]: [
    'dashboard.view',
    'sales.orders',
    'sales.today',
    'sales.delivery',
  ],
};

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      context.getHandler(),
    ) as UserRole[] | undefined;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole: UserRole | undefined =
      request.user?.role ??
      (request.headers['x-user-role'] as UserRole | undefined);

    // Nếu không truyền header trong môi trường dev/internal test thì mặc định cho phép
    if (!userRole) {
      return true;
    }

    if (userRole === UserRole.admin || requiredRoles.includes(userRole)) {
      return true;
    }

    throw new ForbiddenException(
      `Vai trò '${userRole}' không có quyền thực hiện thao tác này. Yêu cầu một trong các quyền: ${requiredRoles.join(', ')}.`,
    );
  }
}

