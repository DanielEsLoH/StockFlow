import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for creating a new product.
 * Used by ADMIN and MANAGER users to create products within their tenant.
 */
export class CreateProductDto {
  /**
   * Stock Keeping Unit - unique identifier within the tenant
   * @example "SKU-001"
   */
  @ApiProperty({
    description: 'Stock Keeping Unit - unique identifier within the tenant',
    example: 'SKU-001',
  })
  @IsString({ message: 'SKU must be a string' })
  sku: string;

  /**
   * Product name (minimum 2 characters)
   * @example "Wireless Bluetooth Headphones"
   */
  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Bluetooth Headphones',
    minLength: 2,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  /**
   * Product description (optional)
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
   * Category ID (optional, must be valid UUID)
   * @example "clx1234567890abcdef"
   */
  @ApiPropertyOptional({
    description: 'Category ID for the product',
    example: 'clx1234567890abcdef',
  })
  @IsString({ message: 'Category ID must be a string' })
  @IsOptional()
  categoryId?: string;

  /**
   * Cost price (purchase price)
   * @example 50.00
   */
  @ApiProperty({
    description: 'Cost price (purchase price)',
    example: 50.0,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Cost price must be a number' })
  @Min(0, { message: 'Cost price must be at least 0' })
  costPrice: number;

  /**
   * Sale price (selling price)
   * @example 79.99
   */
  @ApiProperty({
    description: 'Sale price (selling price)',
    example: 79.99,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Sale price must be a number' })
  @Min(0, { message: 'Sale price must be at least 0' })
  salePrice: number;

  /**
   * Tax rate percentage (default: 19%)
   * @example 19
   */
  @ApiPropertyOptional({
    description: 'Tax rate percentage',
    example: 19,
    minimum: 0,
    maximum: 100,
    default: 19,
  })
  @IsNumber({}, { message: 'Tax rate must be a number' })
  @Min(0, { message: 'Tax rate must be at least 0' })
  @Max(100, { message: 'Tax rate cannot exceed 100' })
  @IsOptional()
  taxRate?: number = 19;

  /**
   * Current stock quantity (default: 0)
   * @example 100
   */
  @ApiPropertyOptional({
    description: 'Current stock quantity',
    example: 100,
    minimum: 0,
    default: 0,
  })
  @IsInt({ message: 'Stock must be an integer' })
  @Min(0, { message: 'Stock must be at least 0' })
  @IsOptional()
  stock?: number = 0;

  /**
   * Minimum stock level for low stock alerts (default: 0)
   * @example 10
   */
  @ApiPropertyOptional({
    description: 'Minimum stock level for low stock alerts',
    example: 10,
    minimum: 0,
    default: 0,
  })
  @IsInt({ message: 'Minimum stock must be an integer' })
  @Min(0, { message: 'Minimum stock must be at least 0' })
  @IsOptional()
  minStock?: number = 0;

  /**
   * Maximum stock level (optional)
   * @example 100
   */
  @ApiPropertyOptional({
    description: 'Maximum stock level',
    example: 100,
    minimum: 0,
  })
  @IsInt({ message: 'Maximum stock must be an integer' })
  @Min(0, { message: 'Maximum stock must be at least 0' })
  @IsOptional()
  maxStock?: number;

  /**
   * Product image URL (optional)
   * @example "https://example.com/images/product.jpg"
   */
  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://example.com/images/product.jpg',
  })
  @IsString({ message: 'Image URL must be a string' })
  @IsOptional()
  imageUrl?: string;

  /**
   * Barcode (optional, must be unique within tenant if provided)
   * @example "7501234567890"
   */
  @ApiPropertyOptional({
    description: 'Barcode (unique within tenant)',
    example: '7501234567890',
  })
  @IsString({ message: 'Barcode must be a string' })
  @IsOptional()
  barcode?: string;

  /**
   * Brand name (optional)
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
   * Unit of measurement (default: "UND")
   * @example "UND"
   */
  @ApiPropertyOptional({
    description: 'Unit of measurement',
    example: 'UND',
    default: 'UND',
  })
  @IsString({ message: 'Unit must be a string' })
  @IsOptional()
  unit?: string = 'UND';
}
