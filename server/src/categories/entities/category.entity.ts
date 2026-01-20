import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Category entity for Swagger documentation
 */
export class CategoryEntity {
  @ApiProperty({
    description: 'Unique identifier for the category',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID this category belongs to',
    example: 'cmkcykam80001reya0hsdx334',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Electronic devices and accessories',
    nullable: true,
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Category color for UI display',
    example: '#3b82f6',
    nullable: true,
  })
  color: string | null;

  @ApiProperty({
    description: 'Category creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Category last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Paginated categories response for Swagger documentation
 */
export class PaginatedCategoriesEntity {
  @ApiProperty({
    description: 'Array of categories',
    type: [CategoryEntity],
  })
  data: CategoryEntity[];

  @ApiProperty({
    description: 'Total number of categories matching the query',
    example: 50,
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
    example: 5,
  })
  totalPages: number;
}
