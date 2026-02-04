import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  POSSessionStatus,
  CashMovementType,
  PaymentMethod,
} from '@prisma/client';

export class POSSessionEntity {
  @ApiProperty({
    description: 'Session ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Cash register ID' })
  cashRegisterId: string;

  @ApiProperty({ description: 'User ID who opened the session' })
  userId: string;

  @ApiProperty({
    description: 'Session status',
    enum: POSSessionStatus,
    example: POSSessionStatus.ACTIVE,
  })
  status: POSSessionStatus;

  @ApiProperty({ description: 'Opening amount', example: 100000 })
  openingAmount: number;

  @ApiPropertyOptional({
    description: 'Closing amount (after arqueo)',
    example: 250000,
  })
  closingAmount?: number | null;

  @ApiPropertyOptional({
    description: 'Expected amount based on movements',
    example: 245000,
  })
  expectedAmount?: number | null;

  @ApiPropertyOptional({
    description: 'Difference (closing - expected)',
    example: 5000,
  })
  difference?: number | null;

  @ApiProperty({ description: 'Session opened at' })
  openedAt: Date;

  @ApiPropertyOptional({ description: 'Session closed at' })
  closedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Notes', example: 'Turno matutino' })
  notes?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class POSSessionWithDetailsEntity extends POSSessionEntity {
  @ApiProperty({
    description: 'Cash register information',
    example: { id: 'xxx', name: 'Caja Principal', code: 'CAJA-001' },
  })
  cashRegister: {
    id: string;
    name: string;
    code: string;
  };

  @ApiProperty({
    description: 'User who opened the session',
    example: {
      id: 'xxx',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@example.com',
    },
  })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Session summary statistics',
  })
  summary: {
    totalSales: number;
    totalSalesAmount: number;
    totalCashIn: number;
    totalCashOut: number;
    salesByMethod: Record<PaymentMethod, number>;
  };
}

export class CashRegisterMovementEntity {
  @ApiProperty({ description: 'Movement ID' })
  id: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({
    description: 'Movement type',
    enum: CashMovementType,
    example: CashMovementType.SALE,
  })
  type: CashMovementType;

  @ApiProperty({ description: 'Amount', example: 50000 })
  amount: number;

  @ApiPropertyOptional({
    description: 'Payment method (for SALE movements)',
    enum: PaymentMethod,
  })
  method?: PaymentMethod | null;

  @ApiPropertyOptional({ description: 'Reference' })
  reference?: string | null;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class XZReportEntity {
  @ApiProperty({ description: 'Report type', enum: ['X', 'Z'] })
  type: 'X' | 'Z';

  @ApiProperty({ description: 'Session information' })
  session: {
    id: string;
    cashRegisterName: string;
    cashRegisterCode: string;
    userName: string;
    openedAt: Date;
    closedAt?: Date | null;
  };

  @ApiProperty({ description: 'Opening amount' })
  openingAmount: number;

  @ApiProperty({ description: 'Total cash sales' })
  totalCashSales: number;

  @ApiProperty({ description: 'Total card sales' })
  totalCardSales: number;

  @ApiProperty({ description: 'Total other sales (transfers, PSE, etc.)' })
  totalOtherSales: number;

  @ApiProperty({ description: 'Total sales amount' })
  totalSalesAmount: number;

  @ApiProperty({ description: 'Total cash in (ingresos)' })
  totalCashIn: number;

  @ApiProperty({ description: 'Total cash out (retiros)' })
  totalCashOut: number;

  @ApiProperty({ description: 'Expected cash in drawer' })
  expectedCashAmount: number;

  @ApiPropertyOptional({
    description: 'Declared cash amount (only for Z report)',
  })
  declaredCashAmount?: number | null;

  @ApiPropertyOptional({ description: 'Difference (only for Z report)' })
  difference?: number | null;

  @ApiProperty({ description: 'Number of transactions' })
  transactionCount: number;

  @ApiProperty({ description: 'Sales breakdown by payment method' })
  salesByMethod: Array<{
    method: PaymentMethod;
    count: number;
    total: number;
  }>;

  @ApiProperty({ description: 'Report generated at' })
  generatedAt: Date;
}

export class PaginatedSessionsEntity {
  @ApiProperty({ type: [POSSessionWithDetailsEntity] })
  data: POSSessionWithDetailsEntity[];

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
