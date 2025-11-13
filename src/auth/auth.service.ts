import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
// import { User } from '@prisma/superadmin';
// Temporarily use any type
type User = any;
import { LoginDto, RegisterDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

// Helper function to convert null to undefined
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      return null;
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if user is locked
    if (user.isLocked) {
      throw new UnauthorizedException(`Account is locked: ${user.lockedReason}`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await this.usersService.incrementLoginAttempts(user.id);
      return null;
    }

    // Reset login attempts on successful login
    await this.usersService.resetLoginAttempts(user.id);
    
    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: nullToUndefined(user.tenantId),
      systemRole: user.systemRole,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      expiresIn: '7d',
    });

    // Store refresh token in database
    await this.usersService.createSession({
      userId: user.id,
      tokenHash: await bcrypt.hash(refreshToken, 10),
      deviceName: this.extractDeviceName(userAgent),
      deviceType: this.extractDeviceType(userAgent),
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: nullToUndefined(user.firstName),
        lastName: nullToUndefined(user.lastName),
        systemRole: user.systemRole,
        tenantId: nullToUndefined(user.tenantId),
        avatarUrl: nullToUndefined(user.avatarUrl),
        language: user.language,
        timezone: user.timezone,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      systemRole: 'tenant_admin', // Default role for new registrations
      language: registerDto.language || 'es',
      timezone: registerDto.timezone || 'America/Bogota',
    });

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: nullToUndefined(user.tenantId),
      systemRole: user.systemRole,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      expiresIn: '7d',
    });

    // Store refresh token
    await this.usersService.createSession({
      userId: user.id,
      tokenHash: await bcrypt.hash(refreshToken, 10),
      deviceType: 'web',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: nullToUndefined(user.firstName),
        lastName: nullToUndefined(user.lastName),
        systemRole: user.systemRole,
        tenantId: nullToUndefined(user.tenantId),
        avatarUrl: nullToUndefined(user.avatarUrl),
        language: user.language,
        timezone: user.timezone,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      // Find user and validate session
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Validate refresh token exists in database
      const session = await this.usersService.findValidSession(user.id, refreshTokenDto.refreshToken);
      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        tenantId: nullToUndefined(user.tenantId),
        systemRole: user.systemRole,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        expiresIn: '7d',
      });

      // Update session with new refresh token
      await this.usersService.updateSession(session.id, {
        tokenHash: await bcrypt.hash(newRefreshToken, 10),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: nullToUndefined(user.firstName),
          lastName: nullToUndefined(user.lastName),
          systemRole: user.systemRole,
          tenantId: nullToUndefined(user.tenantId),
          avatarUrl: nullToUndefined(user.avatarUrl),
          language: user.language,
          timezone: user.timezone,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Invalidate specific session
      await this.usersService.invalidateSession(userId, refreshToken);
    } else {
      // Invalidate all sessions
      await this.usersService.invalidateAllSessions(userId);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.usersService.invalidateAllSessions(userId);
  }

  async updateUserActivity(userId: string): Promise<void> {
    // Update lastActivityAt for all active sessions of the user
    // This keeps the session alive while the user is active
    await this.usersService.updateUserActivity(userId);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password_reset' },
      { expiresIn: '1h' }
    );

    // Hash the token before storing
    const tokenHash = await bcrypt.hash(resetToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.setPasswordResetToken(user.id, tokenHash, expiresAt);

    // TODO: Send email with reset link
    // For now, we'll just return the token (in production, this should be sent via email)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      // Verify the token
      const payload = this.jwtService.verify(token);
      
      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      // Hash the token to compare with stored hash
      const tokenHash = await bcrypt.hash(token, 10);
      
      // Find user by reset token
      const user = await this.usersService.findByPasswordResetToken(tokenHash);
      
      if (!user || user.id !== payload.sub) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await this.usersService.updatePassword(user.id, hashedPassword);

      // Invalidate all existing sessions for security
      await this.usersService.invalidateAllSessions(user.id);

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  private extractDeviceName(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    // Simple device name extraction
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Tablet')) return 'Tablet';
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    
    return 'Unknown Device';
  }

  private extractDeviceType(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    
    return 'web';
  }
}