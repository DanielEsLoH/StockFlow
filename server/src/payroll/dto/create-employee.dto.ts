import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEmail,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  DocumentType,
  ContractType,
  SalaryType,
  ARLRiskLevel,
} from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ enum: DocumentType, default: DocumentType.CC })
  @IsEnum(DocumentType, { message: 'Tipo de documento invalido' })
  @IsOptional()
  documentType?: DocumentType = DocumentType.CC;

  @ApiProperty({ example: '1234567890' })
  @IsString({ message: 'Numero de documento es requerido' })
  @MinLength(3, { message: 'Numero de documento muy corto' })
  @MaxLength(20, { message: 'Numero de documento muy largo' })
  @Transform(({ value }) => value?.trim())
  documentNumber: string;

  @ApiProperty({ example: 'Juan' })
  @IsString({ message: 'Nombre es requerido' })
  @MinLength(2, { message: 'Nombre muy corto' })
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString({ message: 'Apellido es requerido' })
  @MinLength(2, { message: 'Apellido muy corto' })
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiPropertyOptional({ example: 'juan@email.com' })
  @IsEmail({}, { message: 'Email invalido' })
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cityCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentCode?: string;

  @ApiProperty({ enum: ContractType })
  @IsEnum(ContractType, { message: 'Tipo de contrato invalido' })
  contractType: ContractType;

  @ApiProperty({ enum: SalaryType, default: SalaryType.ORDINARIO })
  @IsEnum(SalaryType, { message: 'Tipo de salario invalido' })
  @IsOptional()
  salaryType?: SalaryType = SalaryType.ORDINARIO;

  @ApiProperty({ example: 1423500 })
  @IsNumber({}, { message: 'Salario base debe ser un numero' })
  @Min(0, { message: 'Salario base no puede ser negativo' })
  baseSalary: number;

  @ApiProperty({ enum: ARLRiskLevel, default: ARLRiskLevel.LEVEL_I })
  @IsEnum(ARLRiskLevel, { message: 'Nivel de riesgo ARL invalido' })
  @IsOptional()
  arlRiskLevel?: ARLRiskLevel = ARLRiskLevel.LEVEL_I;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  epsName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  epsCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  afpName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  afpCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cajaName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cajaCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankAccountType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString({}, { message: 'Fecha de inicio invalida' })
  startDate: string;

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'Fecha de fin invalida' })
  @IsOptional()
  endDate?: string;
}
