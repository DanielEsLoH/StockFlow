import { IsDate, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Data transfer object for updating an existing invoice.
 * Only DRAFT invoices can be updated.
 * Limited to notes and due date modifications.
 */
export class UpdateInvoiceDto {
  /**
   * Due date for the invoice
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'Due date for the invoice',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de vencimiento debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  /**
   * Additional notes for the invoice
   * @example "Payment due within 30 days"
   */
  @ApiPropertyOptional({
    description: 'Additional notes for the invoice',
    example: 'Payment due within 30 days',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}
