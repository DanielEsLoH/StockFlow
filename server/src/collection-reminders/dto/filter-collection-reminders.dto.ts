import { IsDate, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  CollectionReminderType,
  ReminderChannel,
  ReminderStatus,
} from '@prisma/client';
import { PaginationDto } from '../../common/dto';

// CUID pattern
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for filtering and paginating collection reminders.
 * Extends PaginationDto for page-based pagination support.
 */
export class FilterCollectionRemindersDto extends PaginationDto {
  /**
   * Filter by reminder status
   * @example "PENDING"
   */
  @ApiPropertyOptional({
    description: 'Filter by reminder status',
    enum: ReminderStatus,
    example: 'PENDING',
  })
  @IsEnum(ReminderStatus, {
    message: 'El estado debe ser PENDING, SENT, FAILED o CANCELLED',
  })
  @IsOptional()
  status?: ReminderStatus;

  /**
   * Filter by reminder type
   * @example "AFTER_DUE"
   */
  @ApiPropertyOptional({
    description: 'Filter by reminder type',
    enum: CollectionReminderType,
    example: 'AFTER_DUE',
  })
  @IsEnum(CollectionReminderType, {
    message: 'El tipo debe ser BEFORE_DUE, ON_DUE, AFTER_DUE o MANUAL',
  })
  @IsOptional()
  type?: CollectionReminderType;

  /**
   * Filter by communication channel
   * @example "EMAIL"
   */
  @ApiPropertyOptional({
    description: 'Filter by communication channel',
    enum: ReminderChannel,
    example: 'EMAIL',
  })
  @IsEnum(ReminderChannel, {
    message: 'El canal debe ser EMAIL, SMS o WHATSAPP',
  })
  @IsOptional()
  channel?: ReminderChannel;

  /**
   * Filter by invoice ID
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description: 'Filter by invoice ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID de la factura debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la factura debe ser un CUID valido',
  })
  @IsOptional()
  invoiceId?: string;

  /**
   * Filter by customer ID
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del cliente debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del cliente debe ser un CUID valido',
  })
  @IsOptional()
  customerId?: string;

  /**
   * Filter reminders scheduled from this date (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter reminders scheduled from this date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  /**
   * Filter reminders scheduled until this date (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter reminders scheduled until this date (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}
