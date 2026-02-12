import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Number of days to include in the dashboard data',
    example: 30,
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsOptional()
  @IsInt({ message: 'days debe ser un numero entero' })
  @Min(1, { message: 'days debe ser al menos 1' })
  @Max(365, { message: 'days no puede ser mayor a 365' })
  @Type(() => Number)
  days?: number;
}
