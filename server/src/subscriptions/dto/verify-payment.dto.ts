import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for verifying a Wompi payment after the checkout widget callback.
 *
 * The transactionId is returned by the Wompi widget after the user
 * completes a payment. The backend uses it to verify the payment
 * status with the Wompi API.
 */
export class VerifyPaymentDto {
  /**
   * The Wompi transaction ID returned by the checkout widget.
   *
   * @example '12345-1234567890-12345'
   */
  @ApiProperty({
    description: 'Wompi transaction ID from the checkout widget callback',
    example: '12345-1234567890-12345',
  })
  @IsString({ message: 'Transaction ID must be a string' })
  @IsNotEmpty({ message: 'Transaction ID is required' })
  readonly transactionId: string;
}
