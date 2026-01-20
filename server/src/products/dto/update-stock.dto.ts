import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Adjustment type for stock operations
 */
export enum StockAdjustmentType {
  /** Set stock to an absolute value */
  SET = 'SET',
  /** Add to current stock */
  ADD = 'ADD',
  /** Subtract from current stock */
  SUBTRACT = 'SUBTRACT',
}

/**
 * Data transfer object for manually adjusting product stock.
 * Used by ADMIN and MANAGER users to adjust inventory levels.
 */
export class UpdateStockDto {
  /**
   * Quantity to adjust (interpretation depends on adjustmentType)
   * @example 50
   */
  @ApiProperty({
    description:
      'Quantity to adjust (interpretation depends on adjustmentType)',
    example: 50,
  })
  @IsInt({ message: 'Quantity must be an integer' })
  quantity: number;

  /**
   * Type of adjustment: SET (absolute), ADD, or SUBTRACT
   * @default SET
   * @example "ADD"
   */
  @ApiPropertyOptional({
    description: 'Type of adjustment: SET (absolute value), ADD, or SUBTRACT',
    enum: StockAdjustmentType,
    default: StockAdjustmentType.SET,
    example: 'ADD',
  })
  @IsEnum(StockAdjustmentType, {
    message: 'Adjustment type must be SET, ADD, or SUBTRACT',
  })
  @IsOptional()
  adjustmentType?: StockAdjustmentType = StockAdjustmentType.SET;

  /**
   * Reason for the stock adjustment (required for audit trail)
   * @example "Physical inventory count correction"
   */
  @ApiPropertyOptional({
    description: 'Reason for the stock adjustment (for audit trail)',
    example: 'Physical inventory count correction',
  })
  @IsString({ message: 'Reason must be a string' })
  @IsOptional()
  reason?: string;

  /**
   * Additional notes about the adjustment
   * @example "Counted 50 units in warehouse A"
   */
  @ApiPropertyOptional({
    description: 'Additional notes about the adjustment',
    example: 'Counted 50 units in warehouse A',
  })
  @IsString({ message: 'Notes must be a string' })
  @IsOptional()
  notes?: string;
}
