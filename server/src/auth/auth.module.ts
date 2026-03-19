import { Module, forwardRef, Logger, OnModuleInit } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  JwtStrategy,
  JwtRefreshStrategy,
  GoogleStrategy,
  GitHubStrategy,
  FacebookStrategy,
} from './strategies';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvitationsModule } from '../invitations/invitations.module';

/**
 * OAuth Strategy Provider Factory
 *
 * Creates a conditional provider for an OAuth strategy.
 * The strategy is only instantiated if its credentials are configured.
 */
const createGoogleStrategyProvider = {
  provide: GoogleStrategy,
  useFactory: (configService: ConfigService): GoogleStrategy | undefined => {
    const clientId = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');

    if (clientId && clientSecret) {
      return new GoogleStrategy(configService);
    }
    return undefined;
  },
  inject: [ConfigService],
};

const createGitHubStrategyProvider = {
  provide: GitHubStrategy,
  useFactory: (configService: ConfigService): GitHubStrategy | undefined => {
    const clientId = configService.get<string>('github.clientId');
    const clientSecret = configService.get<string>('github.clientSecret');

    if (clientId && clientSecret) {
      return new GitHubStrategy(configService);
    }
    return undefined;
  },
  inject: [ConfigService],
};

const createFacebookStrategyProvider = {
  provide: FacebookStrategy,
  useFactory: (configService: ConfigService): FacebookStrategy | undefined => {
    const appId = configService.get<string>('facebook.appId');
    const appSecret = configService.get<string>('facebook.appSecret');

    if (appId && appSecret) {
      return new FacebookStrategy(configService);
    }
    return undefined;
  },
  inject: [ConfigService],
};

/**
 * AuthModule provides authentication functionality including:
 * - User registration and login
 * - JWT token generation and validation
 * - Passport integration for authentication strategies
 * - JWT and JWT-Refresh strategies for token validation
 * - OAuth/SSO authentication with Google and GitHub (when configured)
 *
 * OAuth strategies are conditionally registered based on environment variables:
 * - Google: Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * - GitHub: Requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
 *
 * When OAuth credentials are not configured, the corresponding endpoints will
 * return a 500 error. This is expected behavior for optional OAuth providers.
 *
 * This module exports AuthService and JwtModule for use in other modules
 * that need to perform authentication operations or validate tokens.
 */
@Module({
  imports: [
    // PrismaModule is @Global(), so PrismaService is available without importing here
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiration = configService.get<string>('jwt.expiration') ?? '15m';
        return {
          secret: configService.get<string>('jwt.secret'),
          signOptions: {
            expiresIn: expiration as JwtModuleOptions['signOptions'] extends {
              expiresIn?: infer T;
            }
              ? T
              : never,
          },
        };
      },
    }),
    NotificationsModule,
    // Use forwardRef to handle circular dependency with InvitationsModule
    forwardRef(() => InvitationsModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    // OAuth strategies are conditionally registered
    createGoogleStrategyProvider,
    createGitHubStrategyProvider,
    createFacebookStrategyProvider,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Logs the OAuth configuration status when the module initializes.
   */
  onModuleInit(): void {
    const googleConfigured = !!(
      this.configService.get<string>('google.clientId') &&
      this.configService.get<string>('google.clientSecret')
    );
    const githubConfigured = !!(
      this.configService.get<string>('github.clientId') &&
      this.configService.get<string>('github.clientSecret')
    );
    const facebookConfigured = !!(
      this.configService.get<string>('facebook.appId') &&
      this.configService.get<string>('facebook.appSecret')
    );

    if (googleConfigured || githubConfigured || facebookConfigured) {
      this.logger.log(
        `OAuth providers: Google=${googleConfigured ? 'enabled' : 'disabled'}, GitHub=${githubConfigured ? 'enabled' : 'disabled'}, Facebook=${facebookConfigured ? 'enabled' : 'disabled'}`,
      );
    } else {
      this.logger.log(
        'OAuth providers: None configured. Set GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET, or FACEBOOK_APP_ID/SECRET to enable SSO.',
      );
    }
  }
}
