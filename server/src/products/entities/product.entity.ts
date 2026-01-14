import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Product entity for Swagger documentation
 */
export class ProductEntity {
  @ApiProperty({
    description: 'Unique product identifier',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Stock Keeping Unit',
    example: 'SKU-001',
  })
  sku: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Bluetooth Headphones',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'High-quality wireless headphones with noise cancellation',
    nullable: true,
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: 'clx1234567890category',
    nullable: true,
  })
  categoryId: string | null;

  @ApiProperty({
    description: 'Cost price (purchase price)',
    example: 50.0,
  })
  costPrice: number;

  @ApiProperty({
    description: 'Sale price (selling price)',
    example: 79.99,
  })
  salePrice: number;

  @ApiProperty({
    description: 'Tax rate percentage',
    example: 19,
  })
  taxRate: number;

  @ApiProperty({
    description: 'Current stock quantity',
    example: 100,
  })
  stock: number;

  @ApiProperty({
    description: 'Minimum stock level for alerts',
    example: 10,
  })
  minStock: number;

  @ApiPropertyOptional({
    description: 'Product barcode',
    example: '7501234567890',
    nullable: true,
  })
  barcode: string | null;

  @ApiPropertyOptional({
    description: 'Brand name',
    example: 'Sony',
    nullable: true,
  })
  brand: string | null;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'UND',
  })
  unit: string;

  @ApiProperty({
    description: 'Product status',
    enum: ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'],
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: 'clx1234567890tenant',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Paginated products response for Swagger documentation
 */
export class PaginatedProductsEntity {
  @ApiProperty({
    description: 'Array of product objects',
    type: [ProductEntity],
  })
  data: ProductEntity[];

  @ApiProperty({
    description: 'Total number of products',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;
}