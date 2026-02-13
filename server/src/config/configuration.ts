import { registerAs } from '@nestjs/config';

/**
 * Application configuration interface
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  appUrl: string;
}

/**
 * Admin configuration interface
 */
export interface AdminConfig {
  email: string;
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  url: string;
}

/**
 * JWT configuration interface
 */
export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  expiration: string;
  refreshExpiration: string;
}

/**
 * Mail configuration interface (legacy SMTP)
 */
export interface MailConfig {
  host: string | undefined;
  port: number;
  user: string | undefined;
  password: string | undefined;
  from: string;
}

/**
 * Email configuration interface (Brevo)
 */
export interface EmailConfig {
  brevoApiKey: string | undefined;
  senderEmail: string;
  senderName: string;
}

/**
 * Arcjet security configuration interface
 */
export interface ArcjetConfig {
  key: string | undefined;
  environment: 'development' | 'production';
  enabled: boolean;
}

/**
 * Wompi configuration interface
 */
export interface WompiConfig {
  publicKey: string | undefined;
  privateKey: string | undefined;
  eventSecret: string | undefined;
  integritySecret: string | undefined;
  environment: 'sandbox' | 'production';
}

/**
 * Redis cache configuration interface
 */
export interface RedisConfig {
  host: string | undefined;
  port: number;
  password: string | undefined;
  db: number;
  ttl: number;
}

/**
 * Google OAuth configuration interface
 */
export interface GoogleOAuthConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  callbackUrl: string;
}

/**
 * GitHub OAuth configuration interface
 */
export interface GitHubOAuthConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  callbackUrl: string;
}

/**
 * Complete application configuration interface
 */
export interface Configuration {
  app: AppConfig;
  admin: AdminConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  mail: MailConfig;
  email: EmailConfig;
  arcjet: ArcjetConfig;
  wompi: WompiConfig;
  redis: RedisConfig;
  google: GoogleOAuthConfig;
  github: GitHubOAuthConfig;
}

/**
 * Application configuration factory
 */
export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    appUrl: process.env.APP_URL || 'https://stockflow.com',
  }),
);

/**
 * Admin configuration factory
 */
export const adminConfig = registerAs(
  'admin',
  (): AdminConfig => ({
    email: process.env.ADMIN_EMAIL || 'admin@stockflow.com',
  }),
);

/**
 * Database configuration factory
 */
export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    url: process.env.DATABASE_URL || '',
  }),
);

/**
 * JWT configuration factory
 */
export const jwtConfig = registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  }),
);

/**
 * Mail configuration factory (legacy SMTP)
 */
export const mailConfig = registerAs(
  'mail',
  (): MailConfig => ({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM || 'StockFlow <noreply@stockflow.com>',
  }),
);
/**
 * Email configuration factory (Brevo)
 */
export const emailConfig = registerAs(
  'email',
  (): EmailConfig => ({
    brevoApiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@stockflow.com',
    senderName: process.env.BREVO_SENDER_NAME || 'StockFlow',
  }),
);

/**
 * Arcjet security configuration factory
 * Provides rate limiting, bot protection, and API security
 */
export const arcjetConfig = registerAs(
  'arcjet',
  (): ArcjetConfig => ({
    key: process.env.ARCJET_KEY,
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
    enabled: process.env.ARCJET_ENABLED !== 'false',
  }),
);

/**
 * Wompi configuration factory
 * Provides subscription billing and payment processing via Wompi (Bancolombia)
 */
export const wompiConfig = registerAs(
  'wompi',
  (): WompiConfig => ({
    publicKey: process.env.WOMPI_PUBLIC_KEY,
    privateKey: process.env.WOMPI_PRIVATE_KEY,
    eventSecret: process.env.WOMPI_EVENT_SECRET,
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET,
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  }),
);

/**
 * Redis configuration factory
 * Provides distributed caching configuration
 */
export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  }),
);

/**
 * Google OAuth configuration factory
 * Provides Google OAuth2 authentication settings
 */
export const googleConfig = registerAs(
  'google',
  (): GoogleOAuthConfig => ({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/auth/google/callback',
  }),
);

/**
 * GitHub OAuth configuration factory
 * Provides GitHub OAuth authentication settings
 */
export const githubConfig = registerAs(
  'github',
  (): GitHubOAuthConfig => ({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ||
      'http://localhost:3000/auth/github/callback',
  }),
);

/**
 * Combined configuration factory function
 * Returns the complete configuration object
 */
export default (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    appUrl: process.env.APP_URL || 'https://stockflow.com',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@stockflow.com',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM || 'StockFlow <noreply@stockflow.com>',
  },
  email: {
    brevoApiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@stockflow.com',
    senderName: process.env.BREVO_SENDER_NAME || 'StockFlow',
  },
  arcjet: {
    key: process.env.ARCJET_KEY,
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
    enabled: process.env.ARCJET_ENABLED !== 'false',
  },
  wompi: {
    publicKey: process.env.WOMPI_PUBLIC_KEY,
    privateKey: process.env.WOMPI_PRIVATE_KEY,
    eventSecret: process.env.WOMPI_EVENT_SECRET,
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET,
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/auth/google/callback',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ||
      'http://localhost:3000/auth/github/callback',
  },
});
