import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
  Length,
  Matches,
} from 'class-validator';
import { TaxResponsibility } from '@prisma/client';

export class CreateDianConfigDto {
  @ApiProperty({
    description: 'NIT de la empresa (sin DV)',
    example: '900123456',
  })
  @IsString()
  @Matches(/^\d{9,10}$/, { message: 'NIT debe tener 9 o 10 digitos' })
  nit: string;

  @ApiProperty({ description: 'Digito de verificacion', example: '1' })
  @IsString()
  @Length(1, 1)
  dv: string;

  @ApiProperty({ description: 'Razon social', example: 'Mi Empresa S.A.S.' })
  @IsString()
  businessName: string;

  @ApiPropertyOptional({
    description: 'Nombre comercial',
    example: 'Mi Tienda',
  })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({
    description: 'Responsabilidades tributarias',
    enum: TaxResponsibility,
    isArray: true,
    example: ['IVA_RESPONSABLE', 'RENTA'],
  })
  @IsArray()
  taxResponsibilities: TaxResponsibility[];

  @ApiProperty({
    description: 'Actividad economica (codigo CIIU)',
    example: '4711',
  })
  @IsString()
  economicActivity: string;

  @ApiProperty({ description: 'Direccion', example: 'Calle 100 # 10-20' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Ciudad', example: 'Bogota D.C.' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Codigo de ciudad DANE', example: '11001' })
  @IsString()
  cityCode: string;

  @ApiProperty({ description: 'Departamento', example: 'Bogota D.C.' })
  @IsString()
  department: string;

  @ApiProperty({ description: 'Codigo de departamento DANE', example: '11' })
  @IsString()
  departmentCode: string;

  @ApiPropertyOptional({ description: 'Codigo postal', example: '110111' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Telefono', example: '+573001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Email para notificaciones DIAN',
    example: 'facturacion@empresa.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Modo de pruebas (habilitacion)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}

export class UpdateDianConfigDto {
  @ApiPropertyOptional({ description: 'Razon social' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Nombre comercial' })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiPropertyOptional({
    description: 'Responsabilidades tributarias',
    enum: TaxResponsibility,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  taxResponsibilities?: TaxResponsibility[];

  @ApiPropertyOptional({ description: 'Actividad economica' })
  @IsOptional()
  @IsString()
  economicActivity?: string;

  @ApiPropertyOptional({ description: 'Direccion' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Ciudad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Codigo de ciudad DANE' })
  @IsOptional()
  @IsString()
  cityCode?: string;

  @ApiPropertyOptional({ description: 'Departamento' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Codigo de departamento DANE' })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiPropertyOptional({ description: 'Codigo postal' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Telefono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Modo de pruebas' })
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}

export class SetDianSoftwareDto {
  @ApiProperty({ description: 'ID del software asignado por DIAN' })
  @IsString()
  softwareId: string;

  @ApiProperty({ description: 'PIN del software asignado por DIAN' })
  @IsString()
  softwarePin: string;

  @ApiProperty({ description: 'Clave tecnica del software' })
  @IsString()
  technicalKey: string;
}

export class SetDianResolutionDto {
  @ApiProperty({
    description: 'Numero de resolucion DIAN',
    example: '18760000001',
  })
  @IsString()
  resolutionNumber: string;

  @ApiProperty({ description: 'Fecha de la resolucion', example: '2024-01-01' })
  @IsDateString()
  resolutionDate: string;

  @ApiProperty({ description: 'Prefijo de facturacion', example: 'SETT' })
  @IsString()
  resolutionPrefix: string;

  @ApiProperty({ description: 'Rango inicial de numeracion', example: 1 })
  @IsInt()
  resolutionRangeFrom: number;

  @ApiProperty({ description: 'Rango final de numeracion', example: 5000 })
  @IsInt()
  resolutionRangeTo: number;
}
