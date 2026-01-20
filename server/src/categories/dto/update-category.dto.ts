import { IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for updating an existing category.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateCategoryDto {
  /**
   * Category name (must be unique within tenant, minimum 2 characters)
   * @example "Electronics"
   */
  @ApiPropertyOptional({
    description: 'Category name (must be unique within tenant)',
    example: 'Electronics',
    minLength: 2,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @IsOptional()
  name?: string;

  /**
   * Category description
   * @example "Electronic devices and accessories"
   */
  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Electronic devices and accessories',
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  /**
   * Category color in hex format
   * @example "#3b82f6"
   */
  @ApiPropertyOptional({
    description: 'Category color in hex format',
    example: '#3b82f6',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString({ message: 'Color must be a string' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #3b82f6)',
  })
  color?: string;
}
