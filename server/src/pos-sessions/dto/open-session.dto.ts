import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OpenSessionDto {
  @ApiProperty({
    description: 'ID of the cash register to open session for',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString()
  @IsNotEmpty()
  cashRegisterId: string;

  @ApiProperty({
    description: 'Opening amount in cash (fondo de caja inicial)',
    example: 100000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingAmount: number;

  @ApiPropertyOptional({
    description: 'Notes for the session opening',
    example: 'Apertura normal del turno matutino',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
