import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { TenantGuard } from '../tenant/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantModulesService } from '../tenant/services/modules.service';
import { Inject, forwardRef } from '@nestjs/common';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(forwardRef(() => TenantModulesService))
    private tenantModulesService: TenantModulesService,
  ) {}

  @Post('login')
  @UseGuards(RateLimitGuard) // Rate limiting: 5 attempts per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User login with multi-tenant support',
    description: 'Authenticate user and return JWT tokens. Supports both SuperAdmin and tenant users.'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            systemRole: { type: 'string', example: 'tenant_admin' },
            tenantId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked/deactivated',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts - IP blocked for 15 minutes',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponse> {
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'User registration',
    description: 'Register a new user account. Creates a tenant_admin role by default.'
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful - returns JWT tokens',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            systemRole: { type: 'string', example: 'tenant_admin' },
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'User already exists or validation error',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() body?: { refreshToken?: string },
  ): Promise<{ message: string }> {
    await this.authService.logout(userId, body?.refreshToken);
    return { message: 'Logout successful' };
  }

  @Post('logout-all')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({
    status: 200,
    description: 'Logged out from all devices',
  })
  async logoutAllDevices(@CurrentUser('id') userId: string): Promise<{ message: string }> {
    await this.authService.logoutAllDevices(userId);
    return { message: 'Logged out from all devices' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile with modules and limits' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getProfile(@CurrentUser() user: any) {
    // Update last activity for user's active sessions to keep session alive
    // This ensures the session doesn't expire while user is active
    try {
      await this.authService.updateUserActivity(user.id);
    } catch (error) {
      // Don't fail the request if activity update fails
      console.error('Error updating user activity:', error);
    }
    
    // For super admins, return user as is
    if (user.systemRole === 'super_admin') {
      return {
        ...user,
        modules: [],
        limits: null,
      };
    }

    // For tenant users, include modules and limits
    try {
      const modules = await this.tenantModulesService.getTenantModules(user.tenantId);
      const limits = await this.tenantModulesService.getTenantLimits(user.tenantId);

      return {
        ...user,
        modules,
        limits,
      };
    } catch (error) {
      // If modules service fails, return user without modules
      console.error('Error fetching modules and limits:', error);
      return {
        ...user,
        modules: [],
        limits: null,
      };
    }
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
  })
  async getSessions(@Request() req) {
    // This would be implemented in UsersService
    return { message: 'Feature coming soon' };
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard) // Rate limiting for password reset requests
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send password reset email. Returns success message regardless of whether email exists (security).'
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if user exists',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'If the email exists, a password reset link has been sent.' 
        }
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset requests - rate limited',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reset password with token',
    description: 'Reset user password using the token received via email. Invalidates all existing sessions.'
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Password has been reset successfully' 
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired reset token',
  })
  @ApiResponse({
    status: 400,
    description: 'Password validation error - must meet security requirements',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }
}