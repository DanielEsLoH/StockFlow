import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SystemAdminRequestUser } from '../types';

/**
 * Parameter decorator to extract the current system admin from the request.
 *
 * @example
 * // Get the full admin object
 * @Get('me')
 * getMe(@CurrentAdmin() admin: SystemAdminRequestUser) {
 *   return admin; // { adminId, email, role }
 * }
 *
 * @example
 * // Get a specific property
 * @Get('profile')
 * getProfile(@CurrentAdmin('adminId') adminId: string) {
 *   return this.service.getAdminById(adminId);
 * }
 */
export const CurrentAdmin = createParamDecorator(
  (data: keyof SystemAdminRequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const admin: SystemAdminRequestUser = request.user;

    if (!admin) {
      return null;
    }

    return data ? admin[data] : admin;
  },
);
