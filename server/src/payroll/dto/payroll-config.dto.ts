import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollPeriodType } from '@prisma/client';

export class CreatePayrollConfigDto {
  @ApiProperty({ example: 1_423_500 })
  @IsNumber()
  @Min(0)
  smmlv: number;

  @ApiProperty({ example: 200_000 })
  @IsNumber()
  @Min(0)
  auxilioTransporteVal: number;

  @ApiProperty({ example: 49_799 })
  @IsNumber()
  @Min(0)
  uvtValue: number;

  @ApiProperty({ enum: PayrollPeriodType, default: PayrollPeriodType.MONTHLY })
  @IsEnum(PayrollPeriodType)
  @IsOptional()
  defaultPeriodType?: PayrollPeriodType = PayrollPeriodType.MONTHLY;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  payrollPrefix?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  payrollCurrentNumber?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adjustmentPrefix?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  adjustmentCurrentNumber?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  payrollSoftwareId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  payrollSoftwarePin?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  payrollTestSetId?: string;
}

export class UpdatePayrollConfigDto extends CreatePayrollConfigDto {}
