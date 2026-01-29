import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UserStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, RequestUser } from '../types';

/**
 * Extracts the refresh token from the request body.
 * Defined as a standalone function to avoid ESLint unbound-method issues
 * when passed to passport-jwt configuration.
 *
 * @param req - The Express request object
 * @returns The refresh token or null if not found
 */
function extractTokenFromBody(req: Request): string | null {
  const body = req.body as { refreshToken?: string } | undefined;
  if (body && typeof body.refreshToken === 'string') {
    return body.refreshToken;
  }
  return null;
}

/**
 * JWT Refresh Strategy for validating refresh tokens.
 *
 * This strategy:
 * - Extracts JWT from the request body (refreshToken field)
 * - Validates the token signature using the refresh secret
 * - Verifies the token type is 'refresh'
 * - Verifies the user exists and is active
 * - Verifies the tenant is active
 * - Verifies the refresh token matches what's stored in the database
 * - Returns user data to be attached to the request object
 *
 * @example
 * // Use with @UseGuards(AuthGuard('jwt-refresh'))
 * @UseGuards(AuthGuard('jwt-refresh'))
 * @Post('refresh')
 * refresh(@Request() req) {
 *   return this.authService.refreshTokens(req.user.userId);
 * }
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  private readonly logger = new Logger(JwtRefreshStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const refreshSecret = configService.get<string>('jwt.refreshSecret');

    if (!refreshSecret) {
      throw new Error('JWT refresh secret is not configured');
    }

    super({
      jwtFromRequest: extractTokenFromBody,
      secretOrKey: refreshSecret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  /**
   * Validates the refresh token payload and returns user data for the request.
   *
   * @param req - The Express request object (passed because passReqToCallback is true)
   * @param payload - The decoded JWT payload
   * @returns User data to be attached to request.user
   * @throws UnauthorizedException if validation fails
   */
  async validate(req: Request, payload: JwtPayload): Promise<RequestUser> {
    this.logger.debug(`Validating refresh token for user: ${payload.email}`);

    // Verify the token type is 'refresh'
    if (payload.type !== 'refresh') {
      this.logger.warn(`Invalid token type: ${payload.type} for refresh`);
      throw new UnauthorizedException('Invalid token type');
    }

    // Extract the refresh token from the request body
    const body = req.body as { refreshToken?: string } | undefined;
    const refreshToken = body?.refreshToken;

    if (!refreshToken) {
      this.logger.warn('Refresh token not provided in request body');
      throw new UnauthorizedException('Refresh token not provided');
    }

    // Find the user with their tenant
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn(`User not found: ${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }

    // Verify the refresh token matches what's stored in the database
    if (user.refreshToken !== refreshToken) {
      this.logger.warn(`Refresh token mismatch for user: ${user.email}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify user is active (only ACTIVE status allowed)
    if (user.status !== UserStatus.ACTIVE) {
      if (user.status === UserStatus.PENDING) {
        if (!user.emailVerified) {
          this.logger.warn(`User email not verified: ${user.email}`);
          throw new UnauthorizedException(
            'Por favor verifica tu correo electrónico antes de acceder a la aplicación.',
          );
        }
        this.logger.warn(`User pending approval: ${user.email}`);
        throw new UnauthorizedException(
          'Tu cuenta está pendiente de aprobación. Por favor espera la confirmación del administrador.',
        );
      }
      this.logger.warn(
        `User is not active: ${user.email}, status: ${user.status}`,
      );
      throw new UnauthorizedException('Tu cuenta no está activa.');
    }

    // Verify tenant is active
    if (
      user.tenant.status !== TenantStatus.ACTIVE &&
      user.tenant.status !== TenantStatus.TRIAL
    ) {
      this.logger.warn(
        `Tenant is not active: ${user.tenant.id}, status: ${user.tenant.status}`,
      );
      throw new UnauthorizedException('Tenant account is not active');
    }

    this.logger.debug(
      `Refresh token validated successfully for user: ${user.email}`,
    );

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
  }
}
