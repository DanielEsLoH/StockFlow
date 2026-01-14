import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

/**
 * Customer entity for Swagger documentation
 */
export class CustomerEntity {
  @ApiProperty({
    description: 'Unique identifier for the customer',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID this customer belongs to',
    example: 'cmkcykam80001reya0hsdx334',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'Juan Carlos Perez',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'juan.perez@example.com',
    nullable: true,
  })
  email: string | null;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+57 300 123 4567',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'Document type',
    enum: DocumentType,
    example: 'CC',
  })
  documentType: DocumentType;

  @ApiProperty({
    description: 'Document number',
    example: '1234567890',
  })
  documentNumber: string;

  @ApiPropertyOptional({
    description: 'Customer address',
    example: 'Calle 123 #45-67, Bogota',
    nullable: true,
  })
  address: string | null;

  @ApiPropertyOptional({
    description: 'Customer city',
    example: 'Bogota',
    nullable: true,
  })
  city: string | null;

  @ApiPropertyOptional({
    description: 'Additional notes about the customer',
    example: 'Cliente preferencial',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: 'Customer creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Customer last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Paginated customers response for Swagger documentation
 */
export class PaginatedCustomersEntity {
  @ApiProperty({
    description: 'Array of customers',
    type: [CustomerEntity],
  })
  data: CustomerEntity[];

  @ApiProperty({
    description: 'Total number of customers matching the query',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;
}