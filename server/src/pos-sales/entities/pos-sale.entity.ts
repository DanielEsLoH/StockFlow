import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class SalePaymentEntity {
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ description: 'Payment amount', example: 50000 })
  amount: number;

  @ApiPropertyOptional({ description: 'Reference' })
  reference?: string | null;

  @ApiPropertyOptional({ description: 'Last 4 digits of card' })
  cardLastFour?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class POSSaleEntity {
  @ApiProperty({ description: 'Sale ID', example: 'cmkcykam80004reya0hsdx337' })
  id: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Invoice ID' })
  invoiceId: string;

  @ApiProperty({ description: 'Sale number', example: 'POS-00001' })
  saleNumber: string;

  @ApiProperty({ description: 'Subtotal', example: 100000 })
  subtotal: number;

  @ApiProperty({ description: 'Tax amount', example: 19000 })
  tax: number;

  @ApiProperty({ description: 'Discount amount', example: 5000 })
  discount: number;

  @ApiProperty({ description: 'Total amount', example: 114000 })
  total: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class POSSaleWithDetailsEntity extends POSSaleEntity {
  @ApiProperty({
    description: 'Invoice information',
  })
  invoice: {
    id: string;
    invoiceNumber: string;
    customer: {
      id: string;
      name: string;
      documentNumber: string;
    } | null;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount: number;
      subtotal: number;
      tax: number;
      total: number;
    }>;
  };

  @ApiProperty({
    description: 'Payment breakdown',
    type: [SalePaymentEntity],
  })
  payments: SalePaymentEntity[];

  @ApiProperty({
    description: 'Session information',
  })
  session: {
    id: string;
    cashRegister: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export class PaginatedSalesEntity {
  @ApiProperty({ type: [POSSaleWithDetailsEntity] })
  data: POSSaleWithDetailsEntity[];

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
