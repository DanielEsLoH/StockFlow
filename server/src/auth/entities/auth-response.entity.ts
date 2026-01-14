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
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token (long-lived, used to obtain new access tokens)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
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