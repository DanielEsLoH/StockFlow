import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto';
import { User, UserRole, UserStatus } from '@prisma/client';

/**
 * JWT payload structure for access tokens
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
  type: 'access' | 'refresh';
}

/**
 * User data returned after successful authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
}

/**
 * Response structure for login and registration
 */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * AuthService handles all authentication-related operations including
 * user validation, token generation, registration, and login.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates a user by email and password
   *
   * @param email - User's email address
   * @param password - Plain text password to verify
   * @returns The user if validation succeeds, null otherwise
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    this.logger.debug(`Validating user: ${email}`);

    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.debug(`User not found: ${email}`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.debug(`Invalid password for user: ${email}`);
      return null;
    }

    // Check if user account is active
    if (
      user.status !== UserStatus.ACTIVE &&
      user.status !== UserStatus.PENDING
    ) {
      this.logger.debug(
        `User account is not active: ${email}, status: ${user.status}`,
      );
      return null;
    }

    this.logger.debug(`User validated successfully: ${email}`);
    return user;
  }

  /**
   * Authenticates a user and generates access and refresh tokens
   *
   * @param email - User's email address
   * @param password - Plain text password
   * @returns Authentication response with user data and tokens
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.tenantId,
    );

    // Update refresh token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      user: this.mapToAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Registers a new user with the provided details
   *
   * @param dto - Registration data transfer object
   * @returns Authentication response with user data and tokens
   * @throws ConflictException if email already exists for the tenant
   * @throws NotFoundException if tenant doesn't exist
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, tenantId } = dto;
    const normalizedEmail = email.toLowerCase();

    this.logger.debug(`Registering new user: ${normalizedEmail}`);

    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      this.logger.warn(`Registration failed - tenant not found: ${tenantId}`);
      throw new NotFoundException('Tenant not found');
    }

    // Check if user already exists for this tenant
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: normalizedEmail,
        },
      },
    });

    if (existingUser) {
      this.logger.warn(
        `Registration failed - user already exists: ${normalizedEmail}`,
      );
      throw new ConflictException('A user with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create user with PENDING status
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        tenantId,
        status: UserStatus.PENDING,
        role: UserRole.EMPLOYEE,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.tenantId,
    );

    // Store refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    this.logger.log(`User registered successfully: ${user.email}`);

    return {
      user: this.mapToAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Generates access and refresh tokens for a user
   *
   * @param userId - User's unique identifier
   * @param email - User's email address
   * @param role - User's role
   * @param tenantId - User's tenant identifier
   * @returns Object containing access and refresh tokens
   */
  async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    tenantId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtSecret = this.configService.get<string>('jwt.secret');
    const jwtExpiration =
      this.configService.get<string>('jwt.expiration') ?? '15m';
    const jwtRefreshSecret =
      this.configService.get<string>('jwt.refreshSecret');
    const jwtRefreshExpiration =
      this.configService.get<string>('jwt.refreshExpiration') ?? '7d';

    const accessTokenPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      tenantId,
      type: 'access',
    };

    const refreshTokenPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      tenantId,
      type: 'refresh',
    };

    // Cast expiresIn to satisfy the JwtSignOptions type
    const accessTokenOptions: JwtSignOptions = {
      secret: jwtSecret,
      expiresIn: jwtExpiration as JwtSignOptions['expiresIn'],
    };

    const refreshTokenOptions: JwtSignOptions = {
      secret: jwtRefreshSecret,
      expiresIn: jwtRefreshExpiration as JwtSignOptions['expiresIn'],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, accessTokenOptions),
      this.jwtService.signAsync(refreshTokenPayload, refreshTokenOptions),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Maps a User entity to an AuthUser response object
   *
   * @param user - The user entity to map
   * @returns AuthUser object with safe user data
   */
  private mapToAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    };
  }
}
