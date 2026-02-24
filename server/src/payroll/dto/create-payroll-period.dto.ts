import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollPeriodType } from '@prisma/client';

export class CreatePayrollPeriodDto {
  @ApiProperty({ example: 'Nómina Enero 2026' })
  @IsString()
  name: string;

  @ApiProperty({ enum: PayrollPeriodType })
  @IsEnum(PayrollPeriodType)
  periodType: PayrollPeriodType;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: '2026-02-05' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
