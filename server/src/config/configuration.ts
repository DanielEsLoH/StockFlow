import { registerAs } from '@nestjs/config';

/**
 * Application configuration interface
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
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
 * Complete application configuration interface
 */
export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  mail: MailConfig;
  email: EmailConfig;
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
 * Combined configuration factory function
 * Returns the complete configuration object
 */
export default (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
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
});
