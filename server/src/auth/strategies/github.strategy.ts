import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-github2';
import type { OAuthUserDto } from '../dto/oauth-user.dto';

/**
 * GitHub OAuth Strategy for Passport.js
 *
 * This strategy handles authentication via GitHub OAuth.
 * It extracts user profile information from the GitHub response
 * and normalizes it into an OAuthUserDto for processing by the AuthService.
 *
 * Note: GitHub may not always return the user's email if it's set to private.
 * In this case, we request the 'user:email' scope to access private emails.
 *
 * The strategy is only registered when GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
 * environment variables are configured.
 *
 * @example
 * // Use with @UseGuards(AuthGuard('github'))
 * @Get('github')
 * @UseGuards(AuthGuard('github'))
 * githubAuth() {}
 *
 * @Get('github/callback')
 * @UseGuards(AuthGuard('github'))
 * githubAuthCallback(@Req() req) {
 *   return req.user; // OAuthUserDto
 * }
 */
@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GitHubStrategy.name);

  constructor(configService: ConfigService) {
    const clientId = configService.get<string>('github.clientId');
    const clientSecret = configService.get<string>('github.clientSecret');
    const callbackUrl = configService.get<string>('github.callbackUrl');

    if (!clientId || !clientSecret) {
      throw new Error(
        'GitHub OAuth credentials not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.',
      );
    }

    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: callbackUrl || 'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
    });

    this.logger.log('GitHub OAuth strategy initialized');
  }

  /**
   * Validates the GitHub OAuth response and extracts user profile information.
   *
   * @param accessToken - GitHub OAuth access token
   * @param refreshToken - GitHub OAuth refresh token (typically undefined for GitHub)
   * @param profile - GitHub user profile containing id, username, displayName, emails, photos
   * @param done - Passport callback function
   */
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: OAuthUserDto) => void,
  ): void {
    this.logger.debug(`GitHub OAuth validation for user: ${profile.id}`);

    try {
      // Extract email from profile
      // GitHub may return multiple emails; prefer the primary/verified one
      let email: string | undefined;

      if (profile.emails && profile.emails.length > 0) {
        // Try to find primary email first, then any verified email, then first email
        const primaryEmail = profile.emails.find(
          (e) => (e as { primary?: boolean }).primary === true,
        );
        const verifiedEmail = profile.emails.find(
          (e) => (e as { verified?: boolean }).verified === true,
        );
        email =
          primaryEmail?.value || verifiedEmail?.value || profile.emails[0].value;
      }

      if (!email) {
        this.logger.warn(
          `GitHub OAuth: No email found in profile for user ${profile.username || profile.id}. ` +
            'User may need to make their email public on GitHub.',
        );
        return done(
          new Error(
            'No email found in GitHub profile. Please make your email public on GitHub or use a different login method.',
          ),
          undefined,
        );
      }

      // Parse displayName to extract first and last name
      const { firstName, lastName } = this.parseDisplayName(
        profile.displayName,
        profile.username,
      );

      // Extract avatar URL from photos array
      const avatarUrl = profile.photos?.[0]?.value;

      const oauthUser: OAuthUserDto = {
        email: email.toLowerCase(),
        firstName,
        lastName,
        avatarUrl,
        githubId: profile.id,
        provider: 'GITHUB',
      };

      this.logger.debug(
        `GitHub OAuth: User profile extracted for ${oauthUser.email}`,
      );

      done(null, oauthUser);
    } catch (error) {
      this.logger.error(
        `GitHub OAuth validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      done(error as Error, undefined);
    }
  }

  /**
   * Parses the displayName from GitHub to extract first and last name.
   * Falls back to username if displayName is not available.
   *
   * @param displayName - The display name from GitHub profile
   * @param username - The GitHub username as fallback
   * @returns Object containing firstName and lastName
   */
  private parseDisplayName(
    displayName?: string,
    username?: string,
  ): { firstName: string; lastName: string } {
    if (!displayName) {
      // Use username as firstName if no displayName
      return {
        firstName: username || 'GitHub',
        lastName: 'User',
      };
    }

    const nameParts = displayName.trim().split(/\s+/);

    if (nameParts.length === 1) {
      return {
        firstName: nameParts[0],
        lastName: '',
      };
    }

    // First part is firstName, rest is lastName
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    return { firstName, lastName };
  }
}
