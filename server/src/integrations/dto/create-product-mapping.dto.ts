import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SyncDirection } from '@prisma/client';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class CreateProductMappingDto {
  @ApiProperty({
    description: 'StockFlow product ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString()
  @Matches(CUID_PATTERN, {
    message: 'El ID del producto debe ser un CUID válido',
  })
  productId: string;

  @ApiProperty({
    description: 'External product ID from the platform',
    example: '7654321098',
  })
  @IsString()
  externalId: string;

  @ApiPropertyOptional({
    description: 'External product SKU',
  })
  @IsString()
  @IsOptional()
  externalSku?: string;

  @ApiPropertyOptional({
    description: 'External product URL',
  })
  @IsString()
  @IsOptional()
  externalUrl?: string;

  @ApiPropertyOptional({
    description: 'Sync direction for this mapping',
    enum: SyncDirection,
    default: 'BOTH',
  })
  @IsEnum(SyncDirection)
  @IsOptional()
  syncDirection?: SyncDirection;
}
