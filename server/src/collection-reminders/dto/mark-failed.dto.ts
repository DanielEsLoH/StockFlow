import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for marking a reminder as failed.
 * Allows attaching notes explaining the failure reason.
 */
export class MarkFailedDto {
  /**
   * Notes explaining why the reminder failed
   * @example "Email rebotado: direccion no valida"
   */
  @ApiPropertyOptional({
    description: 'Notes explaining why the reminder failed',
    example: 'Email rebotado: direccion no valida',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}
