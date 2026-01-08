import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Base pagination DTO for list endpoints
 * Supports page-based pagination with configurable page size
 */
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
