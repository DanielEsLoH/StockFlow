import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-facebook';
import type { OAuthUserDto } from '../dto';

/**
 * Facebook OAuth Strategy for Passport.js
 *
 * Handles authentication via Facebook OAuth 2.0.
 * Extracts user profile information and normalizes it into an OAuthUserDto.
 *
 * The strategy is only registered when FACEBOOK_APP_ID and FACEBOOK_APP_SECRET
 * environment variables are configured.
 */
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);

  constructor(configService: ConfigService) {
    const appId = configService.get<string>('facebook.appId');
    const appSecret = configService.get<string>('facebook.appSecret');
    const callbackUrl = configService.get<string>('facebook.callbackUrl');

    if (!appId || !appSecret) {
      throw new Error(
        'Facebook OAuth credentials not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.',
      );
    }

    super({
      clientID: appId,
      clientSecret: appSecret,
      callbackURL:
        callbackUrl || 'http://localhost:3000/auth/facebook/callback',
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    });

    this.logger.log('Facebook OAuth strategy initialized');
  }

  /**
   * Validates the Facebook OAuth response and extracts user profile information.
   */
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: OAuthUserDto) => void,
  ): void {
    this.logger.debug(`Facebook OAuth validation for user: ${profile.id}`);

    try {
      const email = profile.emails?.[0]?.value;

      if (!email) {
        this.logger.warn(
          `Facebook OAuth: No email found in profile for user ${profile.id}`,
        );
        return done(
          new Error(
            'No se encontró un email en tu perfil de Facebook. Asegúrate de que tu cuenta tiene un email verificado.',
          ),
          undefined,
        );
      }

      const firstName =
        profile.name?.givenName || profile.displayName || 'Facebook';
      const lastName = profile.name?.familyName || '';
      const avatarUrl = profile.photos?.[0]?.value;

      const oauthUser: OAuthUserDto = {
        email: email.toLowerCase(),
        firstName,
        lastName,
        avatarUrl,
        facebookId: profile.id,
        provider: 'FACEBOOK',
      };

      this.logger.debug(
        `Facebook OAuth: User profile extracted for ${oauthUser.email}`,
      );

      done(null, oauthUser);
    } catch (error) {
      this.logger.error(
        `Facebook OAuth validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      done(error as Error, undefined);
    }
  }
}
