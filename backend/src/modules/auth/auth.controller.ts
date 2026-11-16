import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';
import { ROLE_PERMISSIONS_MATRIX } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Trang 23: Đăng nhập nhận JWT Access Token & danh sách phân quyền theo Role.
   * POST /api/v1/auth/login
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Trang 23: Đổi mật khẩu tài khoản.
   * POST /api/v1/auth/:userId/change-password
   */
  @Post(':userId/change-password')
  async changePassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  /**
   * Kiểm tra thông tin phiên đăng nhập hiện tại & Ma trận phân quyền (Trang 22, 23).
   * GET /api/v1/auth/me
   */
  @Get('me')
  async getProfile(@Headers('authorization') authHeader?: string) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = this.authService.verifyJwt(token);
      return {
        authenticated: true,
        user: payload,
        rolePermissionsMatrix: ROLE_PERMISSIONS_MATRIX,
      };
    }

    return {
      authenticated: false,
      rolePermissionsMatrix: ROLE_PERMISSIONS_MATRIX,
    };
  }
}

