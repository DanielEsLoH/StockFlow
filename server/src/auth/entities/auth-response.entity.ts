import { ApiProperty } from '@nestjs/swagger';

/**
 * User data returned in authentication responses
 */
export class AuthUserEntity {
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

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://pub-xxx.r2.dev/avatars/tenant-1/user-1/avatar-123.jpg',
    nullable: true,
    required: false,
  })
  avatar: string | null;

  @ApiProperty({
    description: 'User role within the tenant',
    enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    example: 'ADMIN',
  })
  role: string;

  @ApiProperty({
    description: 'User account status',
    enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'],
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Tenant ID the user belongs to',
    example: 'clx1234567890tenant',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Assigned warehouse ID (null for ADMIN users)',
    example: 'clx1234567890warehouse',
    nullable: true,
    required: false,
  })
  warehouseId: string | null;

  @ApiProperty({
    description: 'Assigned warehouse details (null for ADMIN users)',
    nullable: true,
    required: false,
    example: { id: 'clx123', name: 'Almacén Principal', code: 'ALM-001' },
  })
  warehouse: { id: string; name: string; code: string } | null;
}

/**
 * Response structure for successful authentication (login/register/refresh)
 */
export class AuthResponseEntity {
  @ApiProperty({
    description: 'Authenticated user data',
    type: AuthUserEntity,
  })
  user: AuthUserEntity;

  @ApiProperty({
    description: 'JWT access token (short-lived)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'JWT refresh token (long-lived, used to obtain new access tokens)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  })
  refreshToken: string;
}

/**
 * Response structure for successful logout
 */
export class LogoutResponseEntity {
  @ApiProperty({
    description: 'Logout confirmation message',
    example: 'Logged out successfully',
  })
  message: string;
}
