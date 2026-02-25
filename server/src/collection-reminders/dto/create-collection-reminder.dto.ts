import {
  IsEnum,
  IsOptional,
  IsString,
  IsDate,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReminderChannel } from '@prisma/client';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for creating a manual collection reminder.
 * Used by ADMIN and MANAGER users to create reminders for specific invoices.
 */
export class CreateCollectionReminderDto {
  /**
   * Invoice ID to create the reminder for
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiProperty({
    description: 'Invoice ID to create the reminder for',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID de la factura debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la factura debe ser un CUID valido',
  })
  invoiceId: string;

  /**
   * Customer ID (optional, inferred from invoice if not provided)
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description:
      'Customer ID (optional, inferred from invoice if not provided)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del cliente debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del cliente debe ser un CUID valido',
  })
  @IsOptional()
  customerId?: string;

  /**
   * Communication channel for the reminder
   * @example "EMAIL"
   */
  @ApiPropertyOptional({
    description: 'Communication channel for the reminder',
    enum: ReminderChannel,
    example: 'EMAIL',
    default: 'EMAIL',
  })
  @IsEnum(ReminderChannel, {
    message: 'El canal debe ser EMAIL, SMS o WHATSAPP',
  })
  @IsOptional()
  channel?: ReminderChannel = ReminderChannel.EMAIL;

  /**
   * Scheduled date and time for sending the reminder
   * @example "2024-12-31T09:00:00.000Z"
   */
  @ApiProperty({
    description: 'Scheduled date and time for sending the reminder',
    example: '2024-12-31T09:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha programada debe ser una fecha valida' })
  @Type(() => Date)
  scheduledAt: Date;

  /**
   * Custom message for the reminder
   * @example "Estimado cliente, le recordamos que su factura INV-00001 vence pronto."
   */
  @ApiPropertyOptional({
    description: 'Custom message for the reminder',
    example:
      'Estimado cliente, le recordamos que su factura INV-00001 vence pronto.',
  })
  @IsString({ message: 'El mensaje debe ser texto' })
  @IsOptional()
  message?: string;

  /**
   * Internal notes about the reminder
   * @example "Cliente contactado por telefono, solicita recordatorio por email"
   */
  @ApiPropertyOptional({
    description: 'Internal notes about the reminder',
    example:
      'Cliente contactado por telefono, solicita recordatorio por email',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}
