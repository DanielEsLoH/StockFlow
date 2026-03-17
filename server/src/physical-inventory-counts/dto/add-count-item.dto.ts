import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddCountItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Cantidad física contada' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  physicalQuantity: number;

  @ApiPropertyOptional({ description: 'Notas del ítem' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

export class UpdateCountItemDto {
  @ApiProperty({ description: 'Cantidad física contada' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  physicalQuantity: number;

  @ApiPropertyOptional({ description: 'Notas del ítem' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
