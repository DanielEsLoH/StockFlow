/**
 * Data Transfer Object for OAuth user profile information.
 * This DTO represents the normalized user data extracted from OAuth providers
 * (Google, GitHub) after successful authentication.
 */
export interface OAuthUserDto {
  /** User's email address from the OAuth provider. */
  email: string;
  /** User's first name from the OAuth provider. */
  firstName: string;
  /** User's last name from the OAuth provider. */
  lastName: string;
  /** URL to the user's avatar/profile picture from the OAuth provider. */
  avatarUrl?: string;
  /** Google's unique user identifier. Present only when authenticating via Google OAuth. */
  googleId?: string;
  /** GitHub's unique user identifier. Present only when authenticating via GitHub OAuth. */
  githubId?: string;
  /** The OAuth provider used for authentication. */
  provider: 'EMAIL' | 'GOOGLE' | 'GITHUB';
}

/**
 * Result type for OAuth login operation.
 * Indicates whether the user can proceed with login or requires additional action.
 */
export interface OAuthLoginResult {
  /**
   * Indicates the outcome of the OAuth login attempt.
   * - 'success': User is authenticated and tokens are provided
   * - 'pending': User account requires admin approval
   * - 'error': An error occurred during authentication
   */
  status: 'success' | 'pending' | 'error';

  /**
   * Access token for authenticated requests.
   * Only present when status is 'success'.
   */
  accessToken?: string;

  /**
   * Refresh token for obtaining new access tokens.
   * Only present when status is 'success'.
   */
  refreshToken?: string;

  /**
   * Human-readable message describing the result.
   */
  message?: string;

  /**
   * Error details if status is 'error'.
   */
  error?: string;
}
