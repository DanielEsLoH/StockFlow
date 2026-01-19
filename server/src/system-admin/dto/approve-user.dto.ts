import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for approving a user
 */
export class ApproveUserDto {
  /**
   * The ID of the user to approve
   * @example "clx1234567890abcdef"
   */
  @ApiProperty({
    description: 'The unique identifier of the user to approve',
    example: 'clx1234567890abcdef',
  })
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;
}

/**
 * URL parameter DTO for user ID
 */
export class UserIdParamDto {
  /**
   * The ID of the user
   * @example "clx1234567890abcdef"
   */
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: 'clx1234567890abcdef',
  })
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID is required' })
  id: string;
}
