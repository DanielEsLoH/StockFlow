import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback, type Profile } from 'passport-google-oauth20';
import type { OAuthUserDto } from '../dto/oauth-user.dto';

/**
 * Google OAuth 2.0 Strategy for Passport.js
 *
 * This strategy handles authentication via Google OAuth 2.0.
 * It extracts user profile information from the Google response
 * and normalizes it into an OAuthUserDto for processing by the AuthService.
 *
 * The strategy is only registered when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * environment variables are configured.
 *
 * @example
 * // Use with @UseGuards(AuthGuard('google'))
 * @Get('google')
 * @UseGuards(AuthGuard('google'))
 * googleAuth() {}
 *
 * @Get('google/callback')
 * @UseGuards(AuthGuard('google'))
 * googleAuthCallback(@Req() req) {
 *   return req.user; // OAuthUserDto
 * }
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(configService: ConfigService) {
    const clientId = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');
    const callbackUrl = configService.get<string>('google.callbackUrl');

    if (!clientId || !clientSecret) {
      throw new Error(
        'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      );
    }

    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: callbackUrl || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });

    this.logger.log('Google OAuth strategy initialized');
  }

  /**
   * Validates the Google OAuth response and extracts user profile information.
   *
   * @param accessToken - Google OAuth access token
   * @param refreshToken - Google OAuth refresh token (may be undefined)
   * @param profile - Google user profile containing id, emails, name, photos
   * @param done - Passport callback function
   */
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    this.logger.debug(`Google OAuth validation for user: ${profile.id}`);

    try {
      // Extract email from profile
      const email = profile.emails?.[0]?.value;

      if (!email) {
        this.logger.warn(
          `Google OAuth: No email found in profile for user ${profile.id}`,
        );
        return done(new Error('No email found in Google profile'), undefined);
      }

      // Extract name components
      const firstName = profile.name?.givenName || profile.displayName || '';
      const lastName = profile.name?.familyName || '';

      // Extract avatar URL
      const avatarUrl = profile.photos?.[0]?.value;

      const oauthUser: OAuthUserDto = {
        email: email.toLowerCase(),
        firstName,
        lastName,
        avatarUrl,
        googleId: profile.id,
        provider: 'GOOGLE',
      };

      this.logger.debug(
        `Google OAuth: User profile extracted for ${oauthUser.email}`,
      );

      done(null, oauthUser);
    } catch (error) {
      this.logger.error(
        `Google OAuth validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      done(error as Error, undefined);
    }
  }
}
