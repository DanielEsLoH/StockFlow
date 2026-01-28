import { IsArray, IsString, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for bulk notification operations.
 * Used for marking multiple notifications as read or deleting multiple notifications.
 */
export class BulkNotificationIdsDto {
  /**
   * Array of notification IDs to operate on
   * @example ["clx1234567890abc", "clx1234567890def"]
   */
  @ApiProperty({
    description: 'Array of notification IDs',
    example: ['clx1234567890abc', 'clx1234567890def'],
    type: [String],
    maxItems: 100,
  })
  @IsArray({ message: 'IDs must be an array' })
  @ArrayNotEmpty({ message: 'At least one notification ID is required' })
  @ArrayMaxSize(100, { message: 'Cannot process more than 100 notifications at once' })
  @IsString({ each: true, message: 'Each ID must be a string' })
  ids: string[];
}
