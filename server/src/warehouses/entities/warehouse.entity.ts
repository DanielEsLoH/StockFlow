import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Warehouse entity for Swagger documentation
 */
export class WarehouseEntity {
  @ApiProperty({
    description: 'Unique identifier for the warehouse',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID this warehouse belongs to',
    example: 'cmkcykam80001reya0hsdx334',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Warehouse name',
    example: 'Main Warehouse',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Unique warehouse code',
    example: 'WH-001',
    nullable: true,
  })
  code: string | null;

  @ApiPropertyOptional({
    description: 'Warehouse address',
    example: '123 Industrial Ave, Suite 100',
    nullable: true,
  })
  address: string | null;

  @ApiProperty({
    description: 'Whether this is the default warehouse for the tenant',
    example: true,
  })
  isDefault: boolean;

  @ApiProperty({
    description: 'Warehouse creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Warehouse last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Stock summary for a warehouse
 */
export class StockSummaryEntity {
  @ApiProperty({
    description: 'Total number of products in the warehouse',
    example: 150,
  })
  totalProducts: number;

  @ApiProperty({
    description: 'Total quantity of all items in the warehouse',
    example: 5000,
  })
  totalQuantity: number;

  @ApiProperty({
    description: 'Total value of all stock in the warehouse',
    example: 125000.5,
  })
  totalValue: number;
}

/**
 * Warehouse with stock summary for Swagger documentation
 */
export class WarehouseWithStockSummaryEntity extends WarehouseEntity {
  @ApiProperty({
    description: 'Stock summary for the warehouse',
    type: StockSummaryEntity,
  })
  stockSummary: StockSummaryEntity;
}

/**
 * Warehouse stock item for Swagger documentation
 */
export class WarehouseStockItemEntity {
  @ApiProperty({
    description: 'Product ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Laptop Dell XPS 15',
  })
  productName: string;

  @ApiProperty({
    description: 'Product SKU',
    example: 'DELL-XPS-15-001',
  })
  sku: string;

  @ApiProperty({
    description: 'Quantity in this warehouse',
    example: 25,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit price',
    example: 1299.99,
  })
  unitPrice: number;
}

/**
 * Paginated warehouses response for Swagger documentation
 */
export class PaginatedWarehousesEntity {
  @ApiProperty({
    description: 'Array of warehouses',
    type: [WarehouseEntity],
  })
  data: WarehouseEntity[];

  @ApiProperty({
    description: 'Total number of warehouses matching the query',
    example: 10,
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
    example: 1,
  })
  totalPages: number;
}

/**
 * Paginated warehouse stock response for Swagger documentation
 */
export class PaginatedWarehouseStockEntity {
  @ApiProperty({
    description: 'Array of stock items',
    type: [WarehouseStockItemEntity],
  })
  data: WarehouseStockItemEntity[];

  @ApiProperty({
    description: 'Total number of items matching the query',
    example: 150,
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
    example: 15,
  })
  totalPages: number;
}
