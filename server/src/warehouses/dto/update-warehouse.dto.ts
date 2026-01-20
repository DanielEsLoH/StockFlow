import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseStatus } from '@prisma/client';

/**
 * Data transfer object for updating an existing warehouse.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateWarehouseDto {
  /**
   * Warehouse name (minimum 2 characters)
   * @example "Main Warehouse"
   */
  @ApiPropertyOptional({
    description: 'Warehouse name',
    example: 'Main Warehouse',
    minLength: 2,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @IsOptional()
  name?: string;

  /**
   * Warehouse code (must be unique within tenant)
   * @example "WH-001"
   */
  @ApiPropertyOptional({
    description: 'Warehouse code (must be unique within tenant)',
    example: 'WH-001',
  })
  @IsString({ message: 'Code must be a string' })
  @IsOptional()
  code?: string;

  /**
   * Warehouse address
   * @example "123 Industrial Ave, Suite 100"
   */
  @ApiPropertyOptional({
    description: 'Warehouse address',
    example: '123 Industrial Ave, Suite 100',
  })
  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  address?: string;

  /**
   * City where the warehouse is located (can be null to clear)
   * @example "Bogota"
   */
  @ApiPropertyOptional({
    description: 'City where the warehouse is located',
    example: 'Bogota',
    nullable: true,
  })
  @IsString({ message: 'City must be a string' })
  @IsOptional()
  city?: string | null;

  /**
   * Contact phone number for the warehouse (can be null to clear)
   * @example "+57 1 234 5678"
   */
  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+57 1 234 5678',
    nullable: true,
  })
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  phone?: string | null;

  /**
   * Whether this is the default/main warehouse for the tenant
   * @example true
   */
  @ApiPropertyOptional({
    description: 'Whether this is the default/main warehouse',
    example: true,
  })
  @IsBoolean({ message: 'isDefault must be a boolean' })
  @IsOptional()
  isDefault?: boolean;

  /**
   * Warehouse status
   * @example "ACTIVE"
   */
  @ApiPropertyOptional({
    description: 'Warehouse status',
    enum: WarehouseStatus,
    example: 'ACTIVE',
  })
  @IsEnum(WarehouseStatus, {
    message: 'Status must be ACTIVE or INACTIVE',
  })
  @IsOptional()
  status?: WarehouseStatus;
}
