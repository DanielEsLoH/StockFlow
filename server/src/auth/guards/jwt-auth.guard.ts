import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators';

/**
 * JWT Authentication Guard.
 *
 * Extends Passport's AuthGuard to provide JWT-based authentication with
 * support for public routes via the @Public() decorator.
 *
 * This guard:
 * - Validates JWT tokens from the Authorization header
 * - Skips authentication for routes marked with @Public()
 * - Provides consistent error messages for authentication failures
 * - Attaches the validated user to the request object
 *
 * @example
 * // Apply to a single route
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user;
 * }
 *
 * @example
 * // Apply to entire controller
 * @Controller('users')
 * @UseGuards(JwtAuthGuard)
 * export class UsersController {}
 *
 * @example
 * // Apply globally in main.ts or app.module.ts
 * app.useGlobalGuards(new JwtAuthGuard(reflector));
 *
 * // Then use @Public() to skip auth for specific routes
 * @Public()
 * @Get('health')
 * healthCheck() {}
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Determines if the current request can proceed.
   *
   * Checks for @Public() decorator first - if present, allows the request
   * without authentication. Otherwise, delegates to Passport's JWT strategy.
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

    // Delegate to Passport's JWT strategy
    return super.canActivate(context);
  }

  /**
   * Handles the result of Passport authentication.
   *
   * Provides consistent error handling and messaging for authentication failures.
   *
   * @param err - Error from the authentication process (if any)
   * @param user - The authenticated user (if successful)
   * @param info - Additional information from Passport (e.g., JWT errors)
   * @returns The authenticated user
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
        throw new UnauthorizedException('Token has expired');
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }

      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('Authentication token is required');
      }

      throw new UnauthorizedException('Invalid or expired token');
    }

    return user;
  }
}
