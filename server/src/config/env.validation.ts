import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Supported environment types
 */
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Environment variables validation schema using class-validator
 */
export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL is required' })
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET is required' })
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty({ message: 'JWT_REFRESH_SECRET is required' })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsUrl(
    {
      require_tld: false,
      require_protocol: true,
      protocols: ['http', 'https'],
    },
    { message: 'FRONTEND_URL must be a valid URL' },
  )
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:5173';

  // ============================================================================
  // MAIL CONFIGURATION (Optional - for email notifications)
  // ============================================================================

  /**
   * SMTP server hostname.
   * If not set, email notifications will be disabled.
   * Example: smtp.gmail.com, smtp.sendgrid.net
   */
  @IsString()
  @IsOptional()
  MAIL_HOST?: string;

  /**
   * SMTP server port.
   * Common values: 25 (unencrypted), 465 (SSL), 587 (TLS)
   * Default: 587
   */
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  MAIL_PORT?: number = 587;

  /**
   * SMTP authentication username.
   * Usually your email address or API key name.
   */
  @IsString()
  @IsOptional()
  MAIL_USER?: string;

  /**
   * SMTP authentication password.
   * For services like Gmail, use an app-specific password.
   * For SendGrid, use your API key.
   */
  @IsString()
  @IsOptional()
  MAIL_PASSWORD?: string;

  /**
   * Default sender email address.
   * Format: "Display Name <email@domain.com>" or just "email@domain.com"
   * Default: "StockFlow <noreply@stockflow.com>"
   */
  @IsString()
  @IsOptional()
  MAIL_FROM?: string = 'StockFlow <noreply@stockflow.com>';

  // ============================================================================
  // BREVO EMAIL CONFIGURATION (Optional - for transactional emails via Brevo API)
  // ============================================================================

  /**
   * Brevo API key for sending transactional emails.
   * Get your API key from https://app.brevo.com/settings/keys/api
   * If not set, email sending will be disabled (logs warning instead).
   */
  @IsString()
  @IsOptional()
  BREVO_API_KEY?: string;

  /**
   * Sender email address for Brevo emails.
   * This email must be verified in your Brevo account.
   * Default: "noreply@stockflow.com"
   */
  @IsString()
  @IsOptional()
  BREVO_SENDER_EMAIL?: string = 'noreply@stockflow.com';

  /**
   * Sender name displayed in email clients.
   * Default: "StockFlow"
   */
  @IsString()
  @IsOptional()
  BREVO_SENDER_NAME?: string = 'StockFlow';

  // ============================================================================
  // ARCJET SECURITY CONFIGURATION (Optional - for rate limiting and security)
  // ============================================================================

  /**
   * Arcjet API key for rate limiting and security features.
   * Get your API key from https://app.arcjet.com
   * If not set, Arcjet protection will be disabled (logs warning instead).
   */
  @IsString()
  @IsOptional()
  ARCJET_KEY?: string;

  /**
   * Enable or disable Arcjet protection.
   * Set to 'false' to disable Arcjet even if API key is present.
   * Default: 'true'
   */
  @IsString()
  @IsOptional()
  ARCJET_ENABLED?: string = 'true';
}

/**
 * Validates environment variables on application startup
 * Throws an error if validation fails with detailed error messages
 *
 * @param config - Raw environment variables object
 * @returns Validated environment variables
 * @throws Error if validation fails
 */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints;
        if (constraints) {
          return Object.values(constraints).join(', ');
        }
        return `${error.property} has invalid value`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  return validatedConfig;
}
