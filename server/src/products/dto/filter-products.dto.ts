import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ProductStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

/**
 * Data transfer object for filtering and paginating products.
 * Extends PaginationDto for page-based pagination support.
 */
export class FilterProductsDto extends PaginationDto {
  /**
   * Search term for name, SKU, or barcode (case-insensitive)
   * @example "headphones"
   */
  @ApiPropertyOptional({
    description: 'Search term for name, SKU, or barcode (case-insensitive)',
    example: 'headphones',
  })
  @IsString({ message: 'Search must be a string' })
  @IsOptional()
  search?: string;

  /**
   * Filter by category ID
   * @example "clx1234567890abcdef"
   */
  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: 'clx1234567890abcdef',
  })
  @IsString({ message: 'Category ID must be a string' })
  @IsOptional()
  categoryId?: string;

  /**
   * Filter by product status
   * @example "ACTIVE"
   */
  @ApiPropertyOptional({
    description: 'Filter by product status',
    enum: ProductStatus,
    example: 'ACTIVE',
  })
  @IsEnum(ProductStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or OUT_OF_STOCK',
  })
  @IsOptional()
  status?: ProductStatus;

  /**
   * Filter to show only products with low stock (stock < minStock)
   * @example true
   */
  @ApiPropertyOptional({
    description:
      'Filter to show only products with low stock (stock < minStock)',
    example: true,
    type: Boolean,
  })
  @IsBoolean({ message: 'lowStock must be a boolean' })
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsOptional()
  lowStock?: boolean;
}
