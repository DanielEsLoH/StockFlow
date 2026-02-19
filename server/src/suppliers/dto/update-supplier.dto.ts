import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { DocumentType, PaymentTerms } from '@prisma/client';

/**
 * Data transfer object for updating an existing supplier.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateSupplierDto {
  /**
   * Supplier name (2-100 characters, trimmed)
   * @example "Distribuidora ABC S.A.S."
   */
  @ApiPropertyOptional({
    description: 'Supplier name',
    example: 'Distribuidora ABC S.A.S.',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsOptional()
  name?: string;

  /**
   * Supplier email (optional, must be valid email format)
   * @example "ventas@distribuidora-abc.com"
   */
  @ApiPropertyOptional({
    description: 'Supplier email address',
    example: 'ventas@distribuidora-abc.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'El correo electronico no es valido' })
  @IsOptional()
  email?: string;

  /**
   * Supplier phone number (7-20 characters)
   * @example "+57 601 234 5678"
   */
  @ApiPropertyOptional({
    description: 'Supplier phone number',
    example: '+57 601 234 5678',
    minLength: 7,
    maxLength: 20,
  })
  @IsString({ message: 'El telefono debe ser una cadena de texto' })
  @MinLength(7, { message: 'El telefono debe tener al menos 7 caracteres' })
  @MaxLength(20, { message: 'El telefono no puede exceder 20 caracteres' })
  @IsOptional()
  phone?: string;

  /**
   * Document type (CC, NIT, RUT, PASSPORT, CE, DNI, OTHER)
   * @example "NIT"
   */
  @ApiPropertyOptional({
    description: 'Document type',
    enum: DocumentType,
    example: 'NIT',
  })
  @IsEnum(DocumentType, {
    message:
      'El tipo de documento debe ser CC, NIT, RUT, PASSPORT, CE, DNI u OTHER',
  })
  @IsOptional()
  documentType?: DocumentType;

  /**
   * Document number (5-20 characters, trimmed)
   * @example "900123456-7"
   */
  @ApiPropertyOptional({
    description: 'Document number',
    example: '900123456-7',
    minLength: 5,
    maxLength: 20,
  })
  @IsString({ message: 'El numero de documento debe ser una cadena de texto' })
  @MinLength(5, {
    message: 'El numero de documento debe tener al menos 5 caracteres',
  })
  @MaxLength(20, {
    message: 'El numero de documento no puede exceder 20 caracteres',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsOptional()
  documentNumber?: string;

  /**
   * Supplier address (max 200 characters)
   * @example "Carrera 7 #45-12, Bogota"
   */
  @ApiPropertyOptional({
    description: 'Supplier address',
    example: 'Carrera 7 #45-12, Bogota',
    maxLength: 200,
  })
  @IsString({ message: 'La direccion debe ser una cadena de texto' })
  @MaxLength(200, { message: 'La direccion no puede exceder 200 caracteres' })
  @IsOptional()
  address?: string;

  /**
   * Supplier city (max 100 characters)
   * @example "Bogota"
   */
  @ApiPropertyOptional({
    description: 'Supplier city',
    example: 'Bogota',
    maxLength: 100,
  })
  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  @IsOptional()
  city?: string;

  /**
   * Additional notes (max 500 characters)
   * @example "Proveedor principal de materias primas"
   */
  @ApiPropertyOptional({
    description: 'Additional notes about the supplier',
    example: 'Proveedor principal de materias primas',
    maxLength: 500,
  })
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  @IsOptional()
  notes?: string;

  /**
   * Payment terms (IMMEDIATE, NET_15, NET_30, NET_60)
   * @example "NET_30"
   */
  @ApiPropertyOptional({
    description: 'Payment terms for this supplier',
    enum: PaymentTerms,
    example: 'NET_30',
  })
  @IsEnum(PaymentTerms, {
    message:
      'Los terminos de pago deben ser IMMEDIATE, NET_15, NET_30 o NET_60',
  })
  @IsOptional()
  paymentTerms?: PaymentTerms;

  /**
   * Contact person name (max 100 characters)
   * @example "Carlos Rodriguez"
   */
  @ApiPropertyOptional({
    description: 'Contact person name at the supplier',
    example: 'Carlos Rodriguez',
    maxLength: 100,
  })
  @IsString({ message: 'El nombre del contacto debe ser una cadena de texto' })
  @MaxLength(100, {
    message: 'El nombre del contacto no puede exceder 100 caracteres',
  })
  @IsOptional()
  contactName?: string;

  /**
   * Contact person phone (max 20 characters)
   * @example "+57 310 987 6543"
   */
  @ApiPropertyOptional({
    description: 'Contact person phone number',
    example: '+57 310 987 6543',
    maxLength: 20,
  })
  @IsString({
    message: 'El telefono del contacto debe ser una cadena de texto',
  })
  @MaxLength(20, {
    message: 'El telefono del contacto no puede exceder 20 caracteres',
  })
  @IsOptional()
  contactPhone?: string;
}
