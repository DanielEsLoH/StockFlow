import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for token refresh requests
 */
export class RefreshTokenDto {
  /**
   * The refresh token to exchange for new tokens
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @ApiProperty({
    description:
      'JWT refresh token to exchange for new access and refresh tokens',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
