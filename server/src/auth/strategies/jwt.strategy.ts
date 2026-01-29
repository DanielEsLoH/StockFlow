import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, RequestUser } from '../types';

/**
 * JWT Strategy for validating access tokens.
 *
 * This strategy:
 * - Extracts JWT from Authorization header as Bearer token
 * - Validates the token signature using the configured secret
 * - Verifies the user exists and is active (only ACTIVE status allowed)
 * - Verifies the tenant is active
 * - Returns user data to be attached to the request object
 *
 * Note: PENDING users are blocked with specific messages:
 * - If email not verified: asks to verify email
 * - If email verified but not approved: informs about pending approval
 *
 * @example
 * // Use with @UseGuards(AuthGuard('jwt'))
 * @UseGuards(AuthGuard('jwt'))
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user; // RequestUser
 * }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secret = configService.get<string>('jwt.secret');

    if (!secret) {
      throw new Error('JWT secret is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  /**
   * Validates the JWT payload and returns user data for the request.
   *
   * @param payload - The decoded JWT payload
   * @returns User data to be attached to request.user
   * @throws UnauthorizedException if validation fails
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    this.logger.debug(`Validating JWT for user: ${payload.email}`);

    // Verify the token type is 'access'
    if (payload.type !== 'access') {
      this.logger.warn(`Invalid token type: ${payload.type} for access`);
      throw new UnauthorizedException('Invalid token type');
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

    // Verify user is active (only ACTIVE status allowed)
    if (user.status !== UserStatus.ACTIVE) {
      if (user.status === UserStatus.PENDING) {
        // Check if email is verified
        if (!user.emailVerified) {
          this.logger.warn(
            `User email not verified: ${user.email}`,
          );
          throw new UnauthorizedException(
            'Por favor verifica tu correo electrónico antes de acceder a la aplicación.',
          );
        }
        // Email verified but not approved by admin
        this.logger.warn(
          `User pending approval: ${user.email}`,
        );
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

    this.logger.debug(`JWT validated successfully for user: ${user.email}`);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
  }
}
