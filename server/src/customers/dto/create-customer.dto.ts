import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentType } from '@prisma/client';

/**
 * Data transfer object for creating a new customer.
 * Used by ADMIN and MANAGER users to create customers within their tenant.
 */
export class CreateCustomerDto {
  /**
   * Customer name (2-100 characters, trimmed)
   * @example "Juan Carlos Perez"
   */
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  /**
   * Customer email (optional, must be valid email format)
   * @example "juan.perez@example.com"
   */
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  /**
   * Customer phone number (optional, 7-20 characters)
   * @example "+57 300 123 4567"
   */
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @MinLength(7, { message: 'El teléfono debe tener al menos 7 caracteres' })
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  @IsOptional()
  phone?: string;

  /**
   * Document type (CC, NIT, RUT, PASSPORT, CE, DNI, OTHER)
   * @example "CC"
   */
  @IsEnum(DocumentType, {
    message:
      'El tipo de documento debe ser CC, NIT, RUT, PASSPORT, CE, DNI u OTHER',
  })
  documentType: DocumentType;

  /**
   * Document number (5-20 characters, trimmed)
   * @example "1234567890"
   */
  @IsString({ message: 'El número de documento debe ser una cadena de texto' })
  @MinLength(5, {
    message: 'El número de documento debe tener al menos 5 caracteres',
  })
  @MaxLength(20, {
    message: 'El número de documento no puede exceder 20 caracteres',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  documentNumber: string;

  /**
   * Customer address (optional, max 200 characters)
   * @example "Calle 123 #45-67, Bogota"
   */
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @MaxLength(200, { message: 'La dirección no puede exceder 200 caracteres' })
  @IsOptional()
  address?: string;

  /**
   * Customer city (optional, max 100 characters)
   * @example "Bogota"
   */
  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  @IsOptional()
  city?: string;

  /**
   * Additional notes (optional, max 500 characters)
   * @example "Cliente preferencial"
   */
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  @IsOptional()
  notes?: string;
}
