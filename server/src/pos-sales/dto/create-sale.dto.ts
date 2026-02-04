import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class SaleItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Quantity to sell',
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Unit price override (uses product price if not provided)',
    example: 15000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({
    description: 'Discount percentage for this item',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountPercent?: number;
}

export class SalePaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Payment amount',
    example: 50000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Payment reference (transaction ID, authorization code, etc.)',
    example: 'AUTH-123456',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({
    description: 'Last 4 digits of card (for card payments)',
    example: '4532',
    maxLength: 4,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  cardLastFour?: string;
}

export class CreateSaleDto {
  @ApiPropertyOptional({
    description: 'Customer ID (optional for walk-in customers)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    description: 'Items to sell',
    type: [SaleItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiProperty({
    description: 'Payments (split payment support)',
    type: [SalePaymentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments: SalePaymentDto[];

  @ApiPropertyOptional({
    description: 'Global discount percentage',
    example: 5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Notes for the sale',
    example: 'Cliente frecuente',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
