import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateCashRegisterDto {
  @ApiProperty({
    description: 'Name of the cash register',
    example: 'Caja Principal',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description:
      'Unique code for the cash register. Auto-generated if not provided.',
    example: 'CAJA-001',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message:
      'Code must contain only letters, numbers, hyphens, and underscores',
  })
  code?: string;

  @ApiProperty({
    description: 'ID of the warehouse where this cash register is located',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;
}
