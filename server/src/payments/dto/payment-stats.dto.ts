import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export class PaymentsByStatusDto {
  @ApiProperty({ description: 'Number of pending payments', example: 5 })
  PENDING: number;

  @ApiProperty({ description: 'Number of completed payments', example: 25 })
  COMPLETED: number;

  @ApiProperty({ description: 'Number of failed payments', example: 2 })
  FAILED: number;

  @ApiProperty({ description: 'Number of refunded payments', example: 1 })
  REFUNDED: number;
}

export class PaymentsByMethodDto {
  @ApiProperty({ description: 'Number of cash payments', example: 15 })
  CASH: number;

  @ApiProperty({ description: 'Number of credit card payments', example: 20 })
  CREDIT_CARD: number;

  @ApiProperty({ description: 'Number of bank transfer payments', example: 10 })
  BANK_TRANSFER: number;

  @ApiProperty({ description: 'Number of PSE payments', example: 5 })
  PSE: number;

  @ApiProperty({ description: 'Number of other payments', example: 2 })
  OTHER: number;
}

export class PaymentStatsDto {
  @ApiProperty({ description: 'Total number of payments', example: 52 })
  totalPayments: number;

  @ApiProperty({ description: 'Total amount received (completed payments)', example: 85000.0 })
  totalReceived: number;

  @ApiProperty({ description: 'Total amount pending', example: 15000.0 })
  totalPending: number;

  @ApiProperty({ description: 'Total amount refunded', example: 2500.0 })
  totalRefunded: number;

  @ApiProperty({ description: 'Total amount processing', example: 5000.0 })
  totalProcessing: number;

  @ApiProperty({ description: 'Average payment value', example: 1634.62 })
  averagePaymentValue: number;

  @ApiProperty({
    description: 'Count of payments by status',
    type: PaymentsByStatusDto,
  })
  paymentsByStatus: Record<PaymentStatus, number>;

  @ApiProperty({
    description: 'Count of payments by method',
    type: PaymentsByMethodDto,
  })
  paymentsByMethod: Record<PaymentMethod, number>;

  @ApiProperty({ description: 'Number of payments today', example: 3 })
  todayPayments: number;

  @ApiProperty({ description: 'Total amount received today', example: 4500.0 })
  todayTotal: number;

  @ApiProperty({ description: 'Number of payments this week', example: 12 })
  weekPayments: number;

  @ApiProperty({ description: 'Total amount received this week', example: 18500.0 })
  weekTotal: number;
}
