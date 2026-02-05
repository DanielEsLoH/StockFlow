import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';

/**
 * Stock movement entity for Swagger documentation
 */
export class StockMovementEntity {
  @ApiProperty({
    description: 'Unique identifier for the stock movement',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID this movement belongs to',
    example: 'cmkcykam80001reya0hsdx334',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Product ID',
    example: 'cmkcykam80002reya0hsdx335',
  })
  productId: string;

  @ApiPropertyOptional({
    description: 'Warehouse ID (if movement is warehouse-specific)',
    example: 'cmkcykam80003reya0hsdx336',
    nullable: true,
  })
  warehouseId: string | null;

  @ApiPropertyOptional({
    description: 'Invoice ID (if movement is from a sale)',
    example: 'cmkcykam80004reya0hsdx337',
    nullable: true,
  })
  invoiceId: string | null;

  @ApiPropertyOptional({
    description: 'User ID who created the movement',
    example: 'cmkcykam80005reya0hsdx338',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: 'Movement type',
    enum: MovementType,
    example: 'ADJUSTMENT',
  })
  type: MovementType;

  @ApiProperty({
    description: 'Quantity (positive for additions, negative for subtractions)',
    example: 10,
  })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reason for the movement',
    example: 'Inventory count correction',
    nullable: true,
  })
  reason: string | null;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Found extra units during audit',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: 'Movement creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}

/**
 * Paginated stock movements response for Swagger documentation
 */
export class PaginatedStockMovementsEntity {
  @ApiProperty({
    description: 'Array of stock movements',
    type: [StockMovementEntity],
  })
  data: StockMovementEntity[];

  @ApiProperty({
    description: 'Total number of movements matching the query',
    example: 1000,
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
    example: 100,
  })
  totalPages: number;
}

/**
 * Transfer response entity for Swagger documentation
 */
export class TransferResponseEntity {
  @ApiProperty({
    description: 'Outbound movement from source warehouse',
    type: StockMovementEntity,
  })
  outMovement: StockMovementEntity;

  @ApiProperty({
    description: 'Inbound movement to destination warehouse',
    type: StockMovementEntity,
  })
  inMovement: StockMovementEntity;
}
