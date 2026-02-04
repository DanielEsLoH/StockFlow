import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashRegisterStatus } from '@prisma/client';

export class CashRegisterEntity {
  @ApiProperty({ description: 'Cash register ID', example: 'cmkcykam80004reya0hsdx337' })
  id: string;

  @ApiProperty({ description: 'Tenant ID', example: 'cmkcykam80003reya0hsdx336' })
  tenantId: string;

  @ApiProperty({ description: 'Warehouse ID', example: 'cmkcykam80005reya0hsdx338' })
  warehouseId: string;

  @ApiProperty({ description: 'Cash register name', example: 'Caja Principal' })
  name: string;

  @ApiProperty({ description: 'Cash register code', example: 'CAJA-001' })
  code: string;

  @ApiProperty({
    description: 'Cash register status',
    enum: CashRegisterStatus,
    example: CashRegisterStatus.CLOSED,
  })
  status: CashRegisterStatus;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class CashRegisterWithWarehouseEntity extends CashRegisterEntity {
  @ApiProperty({
    description: 'Warehouse information',
    example: { id: 'cmkcykam80005reya0hsdx338', name: 'Almacén Principal', code: 'WH-001' },
  })
  warehouse: {
    id: string;
    name: string;
    code: string;
  };

  @ApiPropertyOptional({
    description: 'Active session information if exists',
    example: { id: 'cmkcykam80006reya0hsdx339', openedAt: '2024-01-15T08:00:00Z' },
  })
  activeSession?: {
    id: string;
    openedAt: Date;
    userId: string;
  } | null;
}

export class PaginatedCashRegistersEntity {
  @ApiProperty({ type: [CashRegisterWithWarehouseEntity] })
  data: CashRegisterWithWarehouseEntity[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: { total: 50, page: 1, limit: 10, totalPages: 5 },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
