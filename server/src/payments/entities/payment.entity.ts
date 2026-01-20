import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

/**
 * Payment entity for Swagger documentation
 */
export class PaymentEntity {
  @ApiProperty({
    description: 'Unique identifier for the payment',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID this payment belongs to',
    example: 'cmkcykam80001reya0hsdx334',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Invoice ID this payment is for',
    example: 'cmkcykam80002reya0hsdx335',
  })
  invoiceId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 150.5,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'CASH',
  })
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference (receipt number, transaction ID, etc.)',
    example: 'REC-001',
    nullable: true,
  })
  reference: string | null;

  @ApiPropertyOptional({
    description: 'Additional notes for the payment',
    example: 'Partial payment',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}

/**
 * Paginated payments response for Swagger documentation
 */
export class PaginatedPaymentsEntity {
  @ApiProperty({
    description: 'Array of payments',
    type: [PaymentEntity],
  })
  data: PaymentEntity[];

  @ApiProperty({
    description: 'Total number of payments matching the query',
    example: 500,
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
    example: 50,
  })
  totalPages: number;
}
