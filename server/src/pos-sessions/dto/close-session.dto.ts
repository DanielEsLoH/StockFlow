import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CloseSessionDto {
  @ApiProperty({
    description: 'Physical cash count at closing (arqueo de caja)',
    example: 250000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closingAmount: number;

  @ApiPropertyOptional({
    description: 'Notes for the session closing',
    example: 'Cierre normal, sin novedades',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
