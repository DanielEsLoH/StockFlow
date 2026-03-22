import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class ReturnItemDto {
  @ApiProperty({
    description: 'Invoice item ID to return',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString()
  @IsNotEmpty()
  invoiceItemId: string;

  @ApiProperty({
    description:
      'Quantity to return (must not exceed original quantity minus already returned)',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reason for returning this item',
    example: 'Producto defectuoso',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Refund payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Refund amount',
    example: 25000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Refund reference',
    example: 'REF-123456',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}

export class CreatePartialReturnDto {
  @ApiProperty({
    description: 'Items to return',
    type: [ReturnItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiProperty({
    description: 'Refund payments (how to refund the customer)',
    type: [RefundPaymentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefundPaymentDto)
  payments: RefundPaymentDto[];

  @ApiPropertyOptional({
    description: 'General reason for the return',
    example: 'Devolución parcial por insatisfacción del cliente',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
