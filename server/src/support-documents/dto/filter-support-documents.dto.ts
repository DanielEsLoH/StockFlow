import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SupportDocumentStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

/**
 * Data transfer object for filtering and paginating support documents.
 * Extends PaginationDto for page-based pagination support.
 */
export class FilterSupportDocumentsDto extends PaginationDto {
  /**
   * Filter by support document status
   * @example "DRAFT"
   */
  @ApiPropertyOptional({
    description: 'Filter by support document status',
    enum: SupportDocumentStatus,
    example: 'DRAFT',
  })
  @IsEnum(SupportDocumentStatus, {
    message:
      'El estado debe ser DRAFT, GENERATED, SENT, ACCEPTED o REJECTED',
  })
  @IsOptional()
  status?: SupportDocumentStatus;

  /**
   * Filter by supplier name (partial match)
   * @example "Juan"
   */
  @ApiPropertyOptional({
    description: 'Filter by supplier name (partial match)',
    example: 'Juan',
  })
  @IsString({ message: 'El nombre del proveedor debe ser texto' })
  @IsOptional()
  supplierName?: string;

  /**
   * Filter by supplier document number
   * @example "1234567890"
   */
  @ApiPropertyOptional({
    description: 'Filter by supplier document number',
    example: '1234567890',
  })
  @IsString({ message: 'El documento del proveedor debe ser texto' })
  @IsOptional()
  supplierDocument?: string;

  /**
   * Filter documents from this date (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter documents from this date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  /**
   * Filter documents until this date (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter documents until this date (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}
