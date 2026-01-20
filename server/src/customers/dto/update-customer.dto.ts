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
import { DocumentType } from '@prisma/client';

/**
 * Data transfer object for updating an existing customer.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateCustomerDto {
  /**
   * Customer name (2-100 characters, trimmed)
   * @example "Juan Carlos Perez"
   */
  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'Juan Carlos Perez',
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
   * Customer email (optional, must be valid email format)
   * @example "juan.perez@example.com"
   */
  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'juan.perez@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'El correo electronico no es valido' })
  @IsOptional()
  email?: string;

  /**
   * Customer phone number (7-20 characters)
   * @example "+57 300 123 4567"
   */
  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+57 300 123 4567',
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
   * @example "CC"
   */
  @ApiPropertyOptional({
    description: 'Document type',
    enum: DocumentType,
    example: 'CC',
  })
  @IsEnum(DocumentType, {
    message:
      'El tipo de documento debe ser CC, NIT, RUT, PASSPORT, CE, DNI u OTHER',
  })
  @IsOptional()
  documentType?: DocumentType;

  /**
   * Document number (5-20 characters, trimmed)
   * @example "1234567890"
   */
  @ApiPropertyOptional({
    description: 'Document number',
    example: '1234567890',
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
   * Customer address (max 200 characters)
   * @example "Calle 123 #45-67, Bogota"
   */
  @ApiPropertyOptional({
    description: 'Customer address',
    example: 'Calle 123 #45-67, Bogota',
    maxLength: 200,
  })
  @IsString({ message: 'La direccion debe ser una cadena de texto' })
  @MaxLength(200, { message: 'La direccion no puede exceder 200 caracteres' })
  @IsOptional()
  address?: string;

  /**
   * Customer city (max 100 characters)
   * @example "Bogota"
   */
  @ApiPropertyOptional({
    description: 'Customer city',
    example: 'Bogota',
    maxLength: 100,
  })
  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  @IsOptional()
  city?: string;

  /**
   * Additional notes (max 500 characters)
   * @example "Cliente preferencial"
   */
  @ApiPropertyOptional({
    description: 'Additional notes about the customer',
    example: 'Cliente preferencial',
    maxLength: 500,
  })
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  @IsOptional()
  notes?: string;
}
