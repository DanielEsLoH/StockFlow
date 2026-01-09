import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
} from 'class-validator';
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
  @IsString({ message: 'Search must be a string' })
  @IsOptional()
  search?: string;

  /**
   * Filter by category ID
   * @example "clx1234567890abcdef"
   */
  @IsUUID('all', { message: 'Category ID must be a valid UUID' })
  @IsOptional()
  categoryId?: string;

  /**
   * Filter by product status
   * @example "ACTIVE"
   */
  @IsEnum(ProductStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or OUT_OF_STOCK',
  })
  @IsOptional()
  status?: ProductStatus;

  /**
   * Filter to show only products with low stock (stock < minStock)
   * @example true
   */
  @IsBoolean({ message: 'lowStock must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsOptional()
  lowStock?: boolean;
}
