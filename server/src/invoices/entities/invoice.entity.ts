import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';

/**
 * Invoice item entity for Swagger documentation
 */
export class InvoiceItemEntity {
  @ApiProperty({
    description: 'Unique identifier for the invoice item',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Invoice ID this item belongs to',
    example: 'cmkcykam80003reya0hsdx336',
  })
  invoiceId: string;

  @ApiProperty({
    description: 'Product ID',
    example: 'cmkcykam80002reya0hsdx335',
  })
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 5,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit price for the product',
    example: 99.99,
  })
  unitPrice: number;

  @ApiProperty({
    description: 'Tax rate percentage',
    example: 19,
  })
  taxRate: number;

  @ApiProperty({
    description: 'Discount amount',
    example: 10.0,
  })
  discount: number;

  @ApiProperty({
    description: 'Subtotal (quantity * unitPrice)',
    example: 499.95,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 94.99,
  })
  taxAmount: number;

  @ApiProperty({
    description: 'Total for this item (subtotal + taxAmount - discount)',
    example: 584.94,
  })
  total: number;
}

/**
 * Invoice entity for Swagger documentation
 */
export class InvoiceEntity {
  @ApiProperty({
    description: 'Unique identifier for the invoice',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID this invoice belongs to',
    example: 'cmkcykam80001reya0hsdx334',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Invoice number (auto-generated)',
    example: 'INV-2024-000001',
  })
  invoiceNumber: string;

  @ApiPropertyOptional({
    description: 'Customer ID (optional for quick sales)',
    example: 'cmkcykam80002reya0hsdx335',
    nullable: true,
  })
  customerId: string | null;

  @ApiProperty({
    description: 'User ID who created the invoice',
    example: 'cmkcykam80003reya0hsdx336',
  })
  userId: string;

  @ApiProperty({
    description: 'Invoice status',
    enum: InvoiceStatus,
    example: 'SENT',
  })
  status: InvoiceStatus;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: 'UNPAID',
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    description: 'Subtotal amount before tax',
    example: 499.95,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Total tax amount',
    example: 94.99,
  })
  taxTotal: number;

  @ApiProperty({
    description: 'Total discount amount',
    example: 10.0,
  })
  discountTotal: number;

  @ApiProperty({
    description: 'Total amount (subtotal + taxTotal - discountTotal)',
    example: 584.94,
  })
  total: number;

  @ApiProperty({
    description: 'Amount already paid',
    example: 0,
  })
  paidAmount: number;

  @ApiPropertyOptional({
    description: 'Due date for the invoice',
    example: '2024-12-31T23:59:59.000Z',
    nullable: true,
  })
  dueDate: Date | null;

  @ApiPropertyOptional({
    description: 'Additional notes for the invoice',
    example: 'Payment due within 30 days',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: 'Invoice creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Invoice last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Invoice items',
    type: [InvoiceItemEntity],
  })
  items?: InvoiceItemEntity[];
}

/**
 * Paginated invoices response for Swagger documentation
 */
export class PaginatedInvoicesEntity {
  @ApiProperty({
    description: 'Array of invoices',
    type: [InvoiceEntity],
  })
  data: InvoiceEntity[];

  @ApiProperty({
    description: 'Total number of invoices matching the query',
    example: 200,
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
    example: 20,
  })
  totalPages: number;
}
