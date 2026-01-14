import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * User entity for Swagger documentation
 */
export class UserEntity {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'User role within the tenant',
    enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    example: 'EMPLOYEE',
  })
  role: string;

  @ApiProperty({
    description: 'User account status',
    enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'],
    example: 'ACTIVE',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatar: string | null;

  @ApiProperty({
    description: 'Tenant ID the user belongs to',
    example: 'clx1234567890tenant',
  })
  tenantId: string;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Paginated users response for Swagger documentation
 */
export class PaginatedUsersEntity {
  @ApiProperty({
    description: 'Array of user objects',
    type: [UserEntity],
  })
  data: UserEntity[];

  @ApiProperty({
    description: 'Total number of users',
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