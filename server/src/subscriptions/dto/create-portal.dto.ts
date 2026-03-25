import { IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a Stripe customer portal session.
 *
 * Used when a customer wants to manage their subscription,
 * update payment methods, or view billing history.
 */
export class CreatePortalDto {
  /**
   * Optional return URL after the customer leaves the portal.
   * If not provided, defaults to the frontend URL from configuration.
   *
   * @example 'https://app.stockflow.com/settings/billing'
   */
  @ApiPropertyOptional({
    description:
      'Return URL after the customer leaves the portal (defaults to frontend URL)',
    example: 'https://app.stockflow.com/settings/billing',
    format: 'uri',
  })
  @IsUrl(
    {
      require_tld: false,
      require_protocol: true,
      protocols: ['http', 'https'],
    },
    { message: 'Return URL must be a valid URL' },
  )
  @IsOptional()
  readonly returnUrl?: string;
}
