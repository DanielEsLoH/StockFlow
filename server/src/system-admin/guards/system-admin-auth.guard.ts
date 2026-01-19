import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators';

/**
 * System Admin Authentication Guard.
 *
 * Extends Passport's AuthGuard to provide JWT-based authentication specifically
 * for system admins using the 'system-admin-jwt' strategy.
 *
 * This guard:
 * - Uses a separate JWT strategy from regular tenant users
 * - Validates JWT tokens from the Authorization header
 * - Skips authentication for routes marked with @Public()
 * - Provides consistent error messages for authentication failures
 * - Attaches the validated system admin to the request object
 *
 * @example
 * // Apply to a single route
 * @UseGuards(SystemAdminAuthGuard)
 * @Get('users')
 * getUsers(@Request() req) {
 *   return req.user; // SystemAdminRequestUser
 * }
 *
 * @example
 * // Apply to entire controller
 * @Controller('system-admin')
 * @UseGuards(SystemAdminAuthGuard)
 * export class SystemAdminController {}
 */
@Injectable()
export class SystemAdminAuthGuard extends AuthGuard('system-admin-jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Determines if the current request can proceed.
   *
   * Checks for @Public() decorator first - if present, allows the request
   * without authentication. Otherwise, delegates to Passport's system-admin-jwt strategy.
   *
   * @param context - The execution context containing the request
   * @returns Promise<boolean> or Observable<boolean> indicating if request is allowed
   */
  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Allow access to public routes without authentication
    if (isPublic) {
      return true;
    }

    // Delegate to Passport's system-admin-jwt strategy
    return super.canActivate(context);
  }

  /**
   * Handles the result of Passport authentication.
   *
   * Provides consistent error handling and messaging for authentication failures.
   *
   * @param err - Error from the authentication process (if any)
   * @param user - The authenticated system admin (if successful)
   * @param info - Additional information from Passport (e.g., JWT errors)
   * @returns The authenticated system admin
   * @throws UnauthorizedException if authentication fails
   */
  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: Error | undefined,
  ): TUser {
    // Handle authentication errors
    if (err) {
      throw err;
    }

    // Handle missing or invalid user
    if (!user) {
      // Provide specific error messages based on the failure reason
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('System admin token has expired');
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid system admin token');
      }

      if (info?.message === 'No auth token') {
        throw new UnauthorizedException(
          'System admin authentication token is required',
        );
      }

      throw new UnauthorizedException('Invalid or expired system admin token');
    }

    return user;
  }
}
