import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecurringInterval } from '@prisma/client';

export class RecurringInvoiceItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Tax rate (0-100)', default: 0 })
  @IsNumber()
  @Min(0)
  taxRate: number;

  @ApiPropertyOptional({ description: 'Discount (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'Tax category' })
  @IsOptional()
  @IsString()
  taxCategory?: string;
}

export class CreateRecurringInvoiceDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Warehouse ID' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Invoice items',
    type: [RecurringInvoiceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringInvoiceItemDto)
  items: RecurringInvoiceItemDto[];

  @ApiProperty({ description: 'Recurrence interval', enum: RecurringInterval })
  @IsEnum(RecurringInterval)
  interval: RecurringInterval;

  @ApiProperty({ description: 'Date of first invoice generation' })
  @IsDateString()
  nextIssueDate: string;

  @ApiPropertyOptional({ description: 'End date for recurrence (optional)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Auto-send invoice (change status to SENT)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoSend?: boolean;

  @ApiPropertyOptional({
    description: 'Auto-send invoice by email to customer',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoEmail?: boolean;
}
