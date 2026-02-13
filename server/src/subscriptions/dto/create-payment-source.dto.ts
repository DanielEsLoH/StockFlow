import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a Wompi payment source (tokenized card) for recurring billing.
 *
 * The token is obtained client-side via the Wompi.js SDK after tokenizing
 * the customer's card. The acceptance tokens are obtained from the
 * Wompi merchant info endpoint.
 */
export class CreatePaymentSourceDto {
  /**
   * Tokenized card token from the Wompi.js SDK.
   *
   * @example 'tok_test_1234567890_abcdef'
   */
  @ApiProperty({
    description: 'Tokenized card token from Wompi.js SDK',
    example: 'tok_test_1234567890_abcdef',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  readonly token: string;

  /**
   * Acceptance token from the Wompi merchant info.
   * Required to comply with Wompi's terms acceptance flow.
   *
   * @example 'eyJ...'
   */
  @ApiProperty({
    description: 'Acceptance token from Wompi merchant info',
    example: 'eyJ...',
  })
  @IsString({ message: 'Acceptance token must be a string' })
  @IsNotEmpty({ message: 'Acceptance token is required' })
  readonly acceptanceToken: string;

  /**
   * Personal data authorization token from Wompi merchant info.
   * Optional but recommended for Colombian data protection compliance.
   *
   * @example 'eyJ...'
   */
  @ApiPropertyOptional({
    description:
      'Personal data authorization token from Wompi merchant info (optional)',
    example: 'eyJ...',
  })
  @IsString({ message: 'Personal auth token must be a string' })
  @IsOptional()
  readonly personalAuthToken?: string;
}
