import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';

export class InvoicesByStatusDto {
  @ApiProperty({ description: 'Number of draft invoices', example: 5 })
  DRAFT: number;

  @ApiProperty({ description: 'Number of sent invoices', example: 10 })
  SENT: number;

  @ApiProperty({ description: 'Number of paid invoices', example: 25 })
  PAID: number;

  @ApiProperty({ description: 'Number of overdue invoices', example: 3 })
  OVERDUE: number;

  @ApiProperty({ description: 'Number of cancelled invoices', example: 2 })
  CANCELLED: number;

  @ApiProperty({ description: 'Number of voided invoices', example: 1 })
  VOID: number;
}

export class InvoiceStatsDto {
  @ApiProperty({ description: 'Total number of invoices', example: 46 })
  totalInvoices: number;

  @ApiProperty({ description: 'Total revenue from paid invoices', example: 125000.5 })
  totalRevenue: number;

  @ApiProperty({ description: 'Total amount pending payment', example: 35000.0 })
  pendingAmount: number;

  @ApiProperty({ description: 'Total amount overdue', example: 8500.0 })
  overdueAmount: number;

  @ApiProperty({ description: 'Average invoice value', example: 2717.4 })
  averageInvoiceValue: number;

  @ApiProperty({
    description: 'Count of invoices by status',
    type: InvoicesByStatusDto,
  })
  invoicesByStatus: Record<InvoiceStatus, number>;
}
