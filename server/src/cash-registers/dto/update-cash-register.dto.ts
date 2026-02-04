import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { CashRegisterStatus } from '@prisma/client';

export class UpdateCashRegisterDto {
  @ApiPropertyOptional({
    description: 'Name of the cash register',
    example: 'Caja Principal Actualizada',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique code for the cash register',
    example: 'CAJA-002',
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

  @ApiPropertyOptional({
    description: 'Status of the cash register',
    enum: CashRegisterStatus,
    example: CashRegisterStatus.CLOSED,
  })
  @IsOptional()
  @IsEnum(CashRegisterStatus)
  status?: CashRegisterStatus;
}
