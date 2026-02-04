import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CashMovementAction {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
}

export class CashMovementDto {
  @ApiProperty({
    description: 'Type of cash movement',
    enum: CashMovementAction,
    example: CashMovementAction.CASH_IN,
  })
  @IsEnum(CashMovementAction)
  action: CashMovementAction;

  @ApiProperty({
    description: 'Amount of money',
    example: 50000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Reference number or description',
    example: 'Cambio para caja',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Ingreso de efectivo para dar vueltas',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
