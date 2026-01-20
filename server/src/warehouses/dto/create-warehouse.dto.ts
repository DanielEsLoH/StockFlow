import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for creating a new warehouse.
 * Used by ADMIN users to create warehouses within their tenant.
 */
export class CreateWarehouseDto {
  /**
   * Warehouse name (minimum 2 characters)
   * @example "Main Warehouse"
   */
  @ApiProperty({
    description: 'Warehouse name',
    example: 'Main Warehouse',
    minLength: 2,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  /**
   * Warehouse code (unique within tenant, auto-generated if not provided)
   * @example "WH-001"
   */
  @ApiPropertyOptional({
    description:
      'Warehouse code (unique within tenant, auto-generated if not provided)',
    example: 'WH-001',
  })
  @IsString({ message: 'Code must be a string' })
  @IsOptional()
  code?: string;

  /**
   * Warehouse address (optional)
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
   * City where the warehouse is located (optional)
   * @example "Bogota"
   */
  @ApiPropertyOptional({
    description: 'City where the warehouse is located',
    example: 'Bogota',
  })
  @IsString({ message: 'City must be a string' })
  @IsOptional()
  city?: string;

  /**
   * Contact phone number for the warehouse (optional)
   * @example "+57 1 234 5678"
   */
  @ApiPropertyOptional({
    description: 'Contact phone number for the warehouse',
    example: '+57 1 234 5678',
  })
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  phone?: string;

  /**
   * Whether this is the default/main warehouse for the tenant
   * @example false
   */
  @ApiPropertyOptional({
    description: 'Whether this is the default/main warehouse for the tenant',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'isDefault must be a boolean' })
  @IsOptional()
  isDefault?: boolean = false;
}
