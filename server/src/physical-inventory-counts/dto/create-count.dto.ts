import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhysicalCountDto {
  @ApiProperty({ description: 'ID de la bodega a contar' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Notas del conteo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
