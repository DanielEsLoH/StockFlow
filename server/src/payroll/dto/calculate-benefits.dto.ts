import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BenefitTypeEnum {
  PRIMA = 'PRIMA',
  CESANTIAS = 'CESANTIAS',
  INTERESES_CESANTIAS = 'INTERESES_CESANTIAS',
  VACACIONES = 'VACACIONES',
}

export class CalculateBenefitPaymentDto {
  @ApiProperty({
    enum: BenefitTypeEnum,
    description: 'Tipo de prestacion social a calcular',
    example: BenefitTypeEnum.PRIMA,
  })
  @IsEnum(BenefitTypeEnum, {
    message: 'benefitType debe ser: PRIMA, CESANTIAS, INTERESES_CESANTIAS o VACACIONES',
  })
  benefitType: BenefitTypeEnum;

  @ApiPropertyOptional({
    description: 'Fecha de pago/corte para el calculo (default: hoy)',
    example: '2026-06-30',
  })
  @IsOptional()
  @IsDateString({}, { message: 'paymentDate debe ser una fecha valida ISO 8601' })
  paymentDate?: string;
}

export class CalculateLiquidationDto {
  @ApiPropertyOptional({
    description: 'Fecha de terminacion del contrato (default: hoy)',
    example: '2026-02-24',
  })
  @IsOptional()
  @IsDateString({}, { message: 'terminationDate debe ser una fecha valida ISO 8601' })
  terminationDate?: string;
}
