import { IsString, IsOptional, MinLength, Matches } from 'class-validator';

/**
 * Data transfer object for creating a new category.
 * Used by ADMIN and MANAGER users to create categories within their tenant.
 */
export class CreateCategoryDto {
  /**
   * Category name (must be unique within tenant, minimum 2 characters)
   * @example "Electronics"
   */
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  /**
   * Category description (optional)
   * @example "Electronic devices and accessories"
   */
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  /**
   * Category color in hex format (optional)
   * @example "#3b82f6"
   */
  @IsString({ message: 'Color must be a string' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #3b82f6)',
  })
  color?: string;
}
