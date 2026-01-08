/**
 * Common DTOs
 *
 * This module exports all shared Data Transfer Objects used across the application.
 *
 * @example
 * ```typescript
 * import { PaginationDto } from './common/dto';
 *
 * @Get()
 * async findAll(@Query() pagination: PaginationDto) {
 *   return this.service.findAll(pagination.page, pagination.limit);
 * }
 * ```
 */

export { PaginationDto } from './pagination.dto';
export { TestValidationDto, AddressDto } from './test-validation.dto';
