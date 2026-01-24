import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SystemAdminJwtPayload,
  SystemAdminRequestUser,
  SystemAdminRole,
  SystemAdminStatus,
} from '../types';

/**
 * JWT Refresh Strategy for validating system admin refresh tokens.
 *
 * This strategy uses a SEPARATE JWT refresh secret from the regular user tokens
 * to ensure complete security isolation between tenant users and system admins.
 *
 * This strategy:
 * - Extracts JWT from Authorization header as Bearer token
 * - Validates the token signature using SYSTEM_ADMIN_JWT_REFRESH_SECRET
 * - Verifies the system admin exists and is active
 * - Verifies the token type is 'refresh'
 * - Returns admin data to be attached to the request object
 */
@Injectable()
export class SystemAdminJwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'system-admin-jwt-refresh',
) {
  private readonly logger = new Logger(SystemAdminJwtRefreshStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Use a separate refresh secret for system admin tokens
    const secret = configService.get<string>('SYSTEM_ADMIN_JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error(
        'SYSTEM_ADMIN_JWT_REFRESH_SECRET is not configured. This is required for system admin token refresh.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  /**
   * Validates the refresh JWT payload and returns system admin data.
   *
   * @param payload - The decoded JWT payload
   * @returns System admin data to be attached to request.user
   * @throws UnauthorizedException if validation fails
   */
  async validate(
    payload: SystemAdminJwtPayload,
  ): Promise<SystemAdminRequestUser> {
    this.logger.debug(
      `Validating system admin refresh JWT for: ${payload.email}`,
    );

    // Verify the token type is 'refresh'
    if (payload.type !== 'refresh') {
      this.logger.warn(
        `Invalid token type: ${payload.type} for system admin refresh`,
      );
      throw new UnauthorizedException('Invalid refresh token type');
    }

    // Verify this is specifically a system admin token
    if (!payload.isSystemAdmin) {
      this.logger.warn('Token is not a system admin token');
      throw new UnauthorizedException('Invalid system admin token');
    }

    // Find the system admin
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin) {
      this.logger.warn(`System admin not found: ${payload.sub}`);
      throw new UnauthorizedException('System admin not found');
    }

    // Verify admin is active
    if ((admin.status as SystemAdminStatus) !== SystemAdminStatus.ACTIVE) {
      this.logger.warn(
        `System admin is not active: ${admin.email}, status: ${admin.status}`,
      );
      throw new UnauthorizedException('System admin account is not active');
    }

    this.logger.debug(
      `System admin refresh JWT validated successfully for: ${admin.email}`,
    );

    return {
      adminId: admin.id,
      email: admin.email,
      role: admin.role as SystemAdminRole,
    };
  }
}
