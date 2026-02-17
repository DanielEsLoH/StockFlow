import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, TaxCategory } from '@prisma/client';

/**
 * Data transfer object for updating an existing product.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateProductDto {
  /**
   * Stock Keeping Unit (must be unique within tenant)
   * @example "SKU-001"
   */
  @ApiPropertyOptional({
    description: 'Stock Keeping Unit (unique within tenant)',
    example: 'SKU-001',
  })
  @IsString({ message: 'SKU must be a string' })
  @IsOptional()
  sku?: string;

  /**
   * Product name (minimum 2 characters)
   * @example "Wireless Bluetooth Headphones"
   */
  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Wireless Bluetooth Headphones',
    minLength: 2,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @IsOptional()
  name?: string;

  /**
   * Product description
   * @example "High-quality wireless headphones with noise cancellation"
   */
  @ApiPropertyOptional({
    description: 'Product description',
    example: 'High-quality wireless headphones with noise cancellation',
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  /**
   * Category ID (must be valid UUID)
   * @example "clx1234567890abcdef"
   */
  @ApiPropertyOptional({
    description: 'Category ID (can be null to remove category)',
    example: 'clx1234567890abcdef',
    nullable: true,
  })
  @IsString({ message: 'Category ID must be a string' })
  @IsOptional()
  categoryId?: string | null;

  /**
   * Cost price (purchase price)
   * @example 50.00
   */
  @ApiPropertyOptional({
    description: 'Cost price (purchase price)',
    example: 50.0,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Cost price must be a number' })
  @Min(0, { message: 'Cost price must be at least 0' })
  @IsOptional()
  costPrice?: number;

  /**
   * Sale price (selling price)
   * @example 79.99
   */
  @ApiPropertyOptional({
    description: 'Sale price (selling price)',
    example: 79.99,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Sale price must be a number' })
  @Min(0, { message: 'Sale price must be at least 0' })
  @IsOptional()
  salePrice?: number;

  /**
   * Tax category for DIAN compliance
   * @example "GRAVADO_19"
   */
  @ApiPropertyOptional({
    description:
      'Tax category: GRAVADO_19 (19%), GRAVADO_5 (5%), EXENTO (0%), EXCLUIDO (0%)',
    enum: TaxCategory,
    example: 'GRAVADO_19',
  })
  @IsEnum(TaxCategory, {
    message:
      'Tax category must be GRAVADO_19, GRAVADO_5, EXENTO, or EXCLUIDO',
  })
  @IsOptional()
  taxCategory?: TaxCategory;

  /**
   * Minimum stock level for low stock alerts
   * @example 10
   */
  @ApiPropertyOptional({
    description: 'Minimum stock level for low stock alerts',
    example: 10,
    minimum: 0,
  })
  @IsInt({ message: 'Minimum stock must be an integer' })
  @Min(0, { message: 'Minimum stock must be at least 0' })
  @IsOptional()
  minStock?: number;

  /**
   * Maximum stock level
   * @example 100
   */
  @ApiPropertyOptional({
    description: 'Maximum stock level',
    example: 100,
    minimum: 0,
    nullable: true,
  })
  @IsInt({ message: 'Maximum stock must be an integer' })
  @Min(0, { message: 'Maximum stock must be at least 0' })
  @IsOptional()
  maxStock?: number | null;

  /**
   * Product image URL
   * @example "https://example.com/images/product.jpg"
   */
  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://example.com/images/product.jpg',
    nullable: true,
  })
  @IsString({ message: 'Image URL must be a string' })
  @IsOptional()
  imageUrl?: string | null;

  /**
   * Barcode (must be unique within tenant if provided)
   * @example "7501234567890"
   */
  @ApiPropertyOptional({
    description: 'Barcode (can be null to remove)',
    example: '7501234567890',
    nullable: true,
  })
  @IsString({ message: 'Barcode must be a string' })
  @IsOptional()
  barcode?: string | null;

  /**
   * Brand name
   * @example "Sony"
   */
  @ApiPropertyOptional({
    description: 'Brand name',
    example: 'Sony',
  })
  @IsString({ message: 'Brand must be a string' })
  @IsOptional()
  brand?: string;

  /**
   * Unit of measurement
   * @example "UND"
   */
  @ApiPropertyOptional({
    description: 'Unit of measurement',
    example: 'UND',
  })
  @IsString({ message: 'Unit must be a string' })
  @IsOptional()
  unit?: string;

  /**
   * Product status
   * @example "ACTIVE"
   */
  @ApiPropertyOptional({
    description: 'Product status',
    enum: ProductStatus,
    example: 'ACTIVE',
  })
  @IsEnum(ProductStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or OUT_OF_STOCK',
  })
  @IsOptional()
  status?: ProductStatus;
}
