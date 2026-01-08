import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for marking routes as public (no authentication required)
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public, bypassing JWT authentication.
 * Used in conjunction with JwtAuthGuard when the guard is applied globally
 * or at the controller level.
 *
 * When applied, the JwtAuthGuard will skip authentication for that route.
 *
 * @returns A decorator function that sets the public route metadata
 *
 * @example
 * // Public health check endpoint
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 *
 * @example
 * // Public authentication endpoints in a protected controller
 * @Controller('auth')
 * @UseGuards(JwtAuthGuard)
 * export class AuthController {
 *   @Public()
 *   @Post('login')
 *   login() {}
 *
 *   @Public()
 *   @Post('register')
 *   register() {}
 *
 *   // This route requires authentication (guard is active)
 *   @Get('profile')
 *   getProfile() {}
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
