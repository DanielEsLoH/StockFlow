import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsUUID,
  IsEnum,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';

/**
 * Data transfer object for updating an existing product.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateProductDto {
  /**
   * Stock Keeping Unit (must be unique within tenant)
   * @example "SKU-001"
   */
  @IsString({ message: 'SKU must be a string' })
  @IsOptional()
  sku?: string;

  /**
   * Product name (minimum 2 characters)
   * @example "Wireless Bluetooth Headphones"
   */
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @IsOptional()
  name?: string;

  /**
   * Product description
   * @example "High-quality wireless headphones with noise cancellation"
   */
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  /**
   * Category ID (must be valid UUID)
   * @example "clx1234567890abcdef"
   */
  @IsUUID('all', { message: 'Category ID must be a valid UUID' })
  @IsOptional()
  categoryId?: string | null;

  /**
   * Cost price (purchase price)
   * @example 50.00
   */
  @IsNumber({}, { message: 'Cost price must be a number' })
  @Min(0, { message: 'Cost price must be at least 0' })
  @IsOptional()
  costPrice?: number;

  /**
   * Sale price (selling price)
   * @example 79.99
   */
  @IsNumber({}, { message: 'Sale price must be a number' })
  @Min(0, { message: 'Sale price must be at least 0' })
  @IsOptional()
  salePrice?: number;

  /**
   * Tax rate percentage
   * @example 19
   */
  @IsNumber({}, { message: 'Tax rate must be a number' })
  @Min(0, { message: 'Tax rate must be at least 0' })
  @Max(100, { message: 'Tax rate cannot exceed 100' })
  @IsOptional()
  taxRate?: number;

  /**
   * Minimum stock level for low stock alerts
   * @example 10
   */
  @IsInt({ message: 'Minimum stock must be an integer' })
  @Min(0, { message: 'Minimum stock must be at least 0' })
  @IsOptional()
  minStock?: number;

  /**
   * Barcode (must be unique within tenant if provided)
   * @example "7501234567890"
   */
  @IsString({ message: 'Barcode must be a string' })
  @IsOptional()
  barcode?: string | null;

  /**
   * Brand name
   * @example "Sony"
   */
  @IsString({ message: 'Brand must be a string' })
  @IsOptional()
  brand?: string;

  /**
   * Unit of measurement
   * @example "UND"
   */
  @IsString({ message: 'Unit must be a string' })
  @IsOptional()
  unit?: string;

  /**
   * Product status
   * @example "ACTIVE"
   */
  @IsEnum(ProductStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or OUT_OF_STOCK',
  })
  @IsOptional()
  status?: ProductStatus;
}
