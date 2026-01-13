import { SetMetadata } from '@nestjs/common';
import { LimitType } from '../services';

/**
 * Metadata key for storing the limit type to check.
 */
export const CHECK_LIMIT_KEY = 'checkLimit';

/**
 * Decorator to specify which resource limit should be checked before allowing
 * the request to proceed. Used in conjunction with LimitCheckInterceptor.
 *
 * The interceptor will:
 * 1. Get the tenant from the authenticated user
 * 2. Count current resources of the specified type
 * 3. Compare against the tenant's plan limit
 * 4. Throw ForbiddenException if limit is reached
 *
 * Limit values:
 * - -1 means unlimited
 * - For invoices, the count is monthly (resets each month)
 *
 * @param limitType - The type of resource limit to check ('users' | 'products' | 'invoices' | 'warehouses')
 * @returns A decorator function that sets the limit check metadata
 *
 * @example
 * // Check product limit before creating a new product
 * @Post()
 * @CheckLimit('products')
 * @UseInterceptors(LimitCheckInterceptor)
 * create(@Body() dto: CreateProductDto) {
 *   return this.productsService.create(dto);
 * }
 *
 * @example
 * // Check user limit before inviting a new user
 * @Post('invite')
 * @CheckLimit('users')
 * @UseInterceptors(LimitCheckInterceptor)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * inviteUser(@Body() dto: InviteUserDto) {
 *   return this.usersService.invite(dto);
 * }
 *
 * @example
 * // Check monthly invoice limit before creating an invoice
 * @Post()
 * @CheckLimit('invoices')
 * @UseInterceptors(LimitCheckInterceptor)
 * createInvoice(@Body() dto: CreateInvoiceDto) {
 *   return this.invoicesService.create(dto);
 * }
 */
export const CheckLimit = (limitType: LimitType) =>
  SetMetadata(CHECK_LIMIT_KEY, limitType);
