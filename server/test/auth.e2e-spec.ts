// Load environment variables before anything else
import 'dotenv/config';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { PrismaModule, PrismaService } from '../src/prisma';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { CommonModule } from '../src/common';
import { ArcjetModule, ArcjetService } from '../src/arcjet';
import { configuration, validateEnv } from '../src/config';
import { UserRole, UserStatus } from '@prisma/client';

// ============================================================================
// RESPONSE TYPE INTERFACES
// ============================================================================

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface LogoutResponse {
  message: string;
}

interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

interface ValidationErrorResponse {
  statusCode: number;
  message: string[];
  error: string;
}

interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

// ============================================================================
// E2E TESTS
// ============================================================================

describe('Authentication E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenant
  let testTenant: { id: string; name: string; slug: string };

  // Test user
  let testUser: {
    id: string;
    email: string;
    accessToken: string;
    refreshToken: string;
  };

  const testPassword = 'TestPassword123!';
  const hashedPassword = bcrypt.hashSync(testPassword, 10);

  // Mock ArcjetService to disable rate limiting and bot protection in tests
  const mockArcjetService = {
    isProtectionEnabled: jest.fn().mockReturnValue(false),
    getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
    checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
    checkBot: jest.fn().mockResolvedValue({ allowed: true }),
    onModuleInit: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          load: [configuration],
          validate: validateEnv,
        }),
        PrismaModule,
        CommonModule,
        AuthModule,
        UsersModule,
        ArcjetModule,
      ],
    })
      .overrideProvider(ArcjetService)
      .useValue(mockArcjetService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes (matching main.ts configuration)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test tenant
    testTenant = await prisma.tenant.create({
      data: {
        name: 'Auth Test Tenant',
        slug: 'auth-test-tenant',
        email: 'auth-test@test.com',
        status: 'ACTIVE',
        plan: 'PRO',
      },
    });

    // Create test user for login tests
    const userRecord = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        email: 'auth-test-user@test.com',
        password: hashedPassword,
        firstName: 'Auth',
        lastName: 'TestUser',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // Login to get tokens
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'auth-test-user@test.com', password: testPassword })
      .expect(200);

    const loginBody = loginResponse.body as AuthResponse;
    testUser = {
      id: userRecord.id,
      email: userRecord.email,
      accessToken: loginBody.accessToken,
      refreshToken: loginBody.refreshToken,
    };
  }

  async function cleanupTestData() {
    // Delete test users
    await prisma.user.deleteMany({
      where: {
        tenantId: testTenant?.id,
      },
    });

    // Delete test tenant
    if (testTenant?.id) {
      await prisma.tenant.delete({
        where: { id: testTenant.id },
      });
    }
  }

  // ==========================================================================
  // TEST: POST /auth/login - Successful login
  // ==========================================================================

  describe('POST /auth/login', () => {
    it('should return accessToken and refreshToken on successful login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testPassword,
        })
        .expect(200);

      const body = response.body as AuthResponse;

      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(testUser.email);
      expect(body.user.id).toBe(testUser.id);
      expect(body.user.tenantId).toBe(testTenant.id);
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
      expect(body.accessToken.length).toBeGreaterThan(0);
      expect(body.refreshToken.length).toBeGreaterThan(0);
    });

    it('should return 401 with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
      expect(body.message).toBe('Invalid email or password');
    });

    it('should return 401 with non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testPassword,
        })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
      expect(body.message).toBe('Invalid email or password');
    });

    it('should return 400 with invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: testPassword,
        })
        .expect(400);

      const body = response.body as ValidationErrorResponse;

      expect(body.statusCode).toBe(400);
      expect(body.message).toContain('Please provide a valid email address');
    });

    it('should return 400 with missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: testPassword,
        })
        .expect(400);

      const body = response.body as ValidationErrorResponse;

      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/email/i)]),
      );
    });

    it('should return 400 with missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
        })
        .expect(400);

      const body = response.body as ValidationErrorResponse;

      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/password/i)]),
      );
    });
  });

  // ==========================================================================
  // TEST: POST /auth/register - Registration
  // ==========================================================================

  describe('POST /auth/register', () => {
    const uniqueEmail = () =>
      `register-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;

    it('should successfully register a new user with tenantId', async () => {
      const email = uniqueEmail();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User',
          tenantId: testTenant.id,
        })
        .expect(201);

      const body = response.body as AuthResponse;

      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(email.toLowerCase());
      expect(body.user.firstName).toBe('New');
      expect(body.user.lastName).toBe('User');
      expect(body.user.tenantId).toBe(testTenant.id);
      expect(body.user.role).toBe(UserRole.EMPLOYEE);
      expect(body.user.status).toBe(UserStatus.PENDING);
    });

    it('should return 409 when registering with duplicate email for same tenant', async () => {
      const email = uniqueEmail();

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'SecurePassword123!',
          firstName: 'First',
          lastName: 'User',
          tenantId: testTenant.id,
        })
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'SecurePassword123!',
          firstName: 'Second',
          lastName: 'User',
          tenantId: testTenant.id,
        })
        .expect(409);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(409);
      expect(body.message).toBe('A user with this email already exists');
    });

    it('should return 404 when registering with non-existent tenantId', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail(),
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
          tenantId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(404);
      expect(body.message).toBe('Tenant not found');
    });

    it('should return 400 with validation errors for missing required fields', async () => {
      // Missing all fields
      const response1 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);

      const body1 = response1.body as ValidationErrorResponse;
      expect(body1.statusCode).toBe(400);
      expect(body1.message).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/email/i),
          expect.stringMatching(/password/i),
          expect.stringMatching(/first.*name/i),
          expect.stringMatching(/last.*name/i),
          expect.stringMatching(/tenant.*id/i),
        ]),
      );

      // Missing tenantId only
      const response2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail(),
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      const body2 = response2.body as ValidationErrorResponse;
      expect(body2.statusCode).toBe(400);
      expect(body2.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/tenant.*id/i)]),
      );
    });

    it('should return 400 when password is too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail(),
          password: 'short',
          firstName: 'Test',
          lastName: 'User',
          tenantId: testTenant.id,
        })
        .expect(400);

      const body = response.body as ValidationErrorResponse;

      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/password.*8.*character/i),
        ]),
      );
    });

    it('should normalize email to lowercase', async () => {
      const email = `UPPERCASE-${Date.now()}@TEST.COM`;

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
          tenantId: testTenant.id,
        })
        .expect(201);

      const body = response.body as AuthResponse;
      expect(body.user.email).toBe(email.toLowerCase());
    });
  });

  // ==========================================================================
  // TEST: POST /auth/refresh - Token refresh
  // ==========================================================================

  describe('POST /auth/refresh', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      // Get a fresh refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testPassword })
        .expect(200);

      const loginBody = loginResponse.body as AuthResponse;
      validRefreshToken = loginBody.refreshToken;
    });

    it('should return new accessToken and refreshToken on successful refresh', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
        })
        .expect(200);

      const body = response.body as AuthResponse;

      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(testUser.email);
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
      // Note: Token rotation generates new tokens, but if generated within the same
      // second, JWT tokens may be identical due to same payload + iat timestamp.
      // We verify token validity and structure rather than string difference.
      expect(body.refreshToken.length).toBeGreaterThan(0);
    });

    it('should return 401 with invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
      expect(body.message).toBe('Invalid or expired refresh token');
    });

    it('should return 401 with expired or revoked refresh token', async () => {
      // Wait 1.1 seconds to ensure JWT timestamps differ (JWT uses seconds precision)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // First, use the token to get a new one (token rotation)
      const firstRefreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
        })
        .expect(200);

      const firstRefreshBody = firstRefreshResponse.body as AuthResponse;
      // Verify the token was actually rotated (different timestamp = different token)
      expect(firstRefreshBody.refreshToken).not.toBe(validRefreshToken);

      // Now try to use the old token again - should fail
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
        })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
      expect(body.message).toBe('Invalid refresh token');
    });

    it('should return 400 with missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);

      const body = response.body as ValidationErrorResponse;

      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/refresh.*token/i)]),
      );
    });

    it('should reject access tokens used as refresh tokens', async () => {
      // Get an access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testPassword })
        .expect(200);

      const loginBody = loginResponse.body as AuthResponse;
      const accessToken = loginBody.accessToken;

      // Try to use access token as refresh token
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: accessToken,
        })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // TEST: POST /auth/logout - Logout
  // ==========================================================================

  describe('POST /auth/logout', () => {
    it('should successfully logout and invalidate refresh token', async () => {
      // Login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testPassword })
        .expect(200);

      const loginBody = loginResponse.body as AuthResponse;
      const refreshToken = loginBody.refreshToken;

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);

      const logoutBody = logoutResponse.body as LogoutResponse;

      expect(logoutBody).toHaveProperty('message');
      expect(logoutBody.message).toBe('Logged out successfully');

      // Verify the refresh token is now invalid
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      const refreshBody = refreshResponse.body as ErrorResponse;
      expect(refreshBody.statusCode).toBe(401);
    });

    it('should return 401 with invalid refresh token for logout', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
    });

    it('should return 400 with missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({})
        .expect(400);

      const body = response.body as ValidationErrorResponse;

      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/refresh.*token/i)]),
      );
    });
  });

  // ==========================================================================
  // TEST: GET /users/me - Profile endpoint (authenticated)
  // ==========================================================================

  describe('GET /users/me (profile)', () => {
    it('should return user profile when authenticated', async () => {
      // Get fresh access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testPassword })
        .expect(200);

      const loginBody = loginResponse.body as AuthResponse;
      const accessToken = loginBody.accessToken;

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as UserProfileResponse;

      expect(body.id).toBe(testUser.id);
      expect(body.email).toBe(testUser.email);
      expect(body.tenantId).toBe(testTenant.id);
      expect(body).toHaveProperty('firstName');
      expect(body).toHaveProperty('lastName');
      expect(body).toHaveProperty('role');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      // Missing "Bearer" prefix
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'invalid-header')
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
    });

    it('should return 401 with empty Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ')
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // TEST: Suspended/Inactive user and tenant handling
  // ==========================================================================

  describe('Suspended and Inactive user/tenant handling', () => {
    let suspendedUser: { id: string; email: string };
    let inactiveUser: { id: string; email: string };

    beforeAll(async () => {
      // Create a suspended user
      const suspendedUserRecord = await prisma.user.create({
        data: {
          tenantId: testTenant.id,
          email: 'suspended-user@test.com',
          password: hashedPassword,
          firstName: 'Suspended',
          lastName: 'User',
          role: UserRole.EMPLOYEE,
          status: UserStatus.SUSPENDED,
        },
      });
      suspendedUser = {
        id: suspendedUserRecord.id,
        email: suspendedUserRecord.email,
      };

      // Create an inactive user
      const inactiveUserRecord = await prisma.user.create({
        data: {
          tenantId: testTenant.id,
          email: 'inactive-user@test.com',
          password: hashedPassword,
          firstName: 'Inactive',
          lastName: 'User',
          role: UserRole.EMPLOYEE,
          status: UserStatus.INACTIVE,
        },
      });
      inactiveUser = {
        id: inactiveUserRecord.id,
        email: inactiveUserRecord.email,
      };
    });

    it('should return 403 when suspended user tries to login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: suspendedUser.email,
          password: testPassword,
        })
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(403);
      expect(body.message).toContain('suspended');
    });

    it('should return 403 when inactive user tries to login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: inactiveUser.email,
          password: testPassword,
        })
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(403);
      expect(body.message).toContain('inactive');
    });
  });

  // ==========================================================================
  // TEST: Complete authentication flow
  // ==========================================================================

  describe('Complete Authentication Flow', () => {
    it('should handle complete auth lifecycle: register -> login -> profile -> refresh -> logout', async () => {
      const email = `flow-test-${Date.now()}@test.com`;
      const password = 'FlowTestPassword123!';

      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Flow',
          lastName: 'Test',
          tenantId: testTenant.id,
        })
        .expect(201);

      const registerBody = registerResponse.body as AuthResponse;
      expect(registerBody.user.email).toBe(email.toLowerCase());

      // Step 2: Login with new credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      const loginBody = loginResponse.body as AuthResponse;
      const accessToken = loginBody.accessToken;
      const refreshToken = loginBody.refreshToken;

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // Step 3: Access profile with access token
      const profileResponse = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const profileBody = profileResponse.body as UserProfileResponse;
      expect(profileBody.email).toBe(email.toLowerCase());

      // Wait for JWT timestamp to change (JWT uses seconds precision)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Step 4: Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const refreshBody = refreshResponse.body as AuthResponse;
      const newAccessToken = refreshBody.accessToken;
      const newRefreshToken = refreshBody.refreshToken;

      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toBe(refreshToken); // Token rotation (different timestamp)

      // Step 5: Verify new access token works
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // Step 6: Old refresh token should be invalid (token rotation)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      // Step 7: Logout with new refresh token
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      const logoutBody = logoutResponse.body as LogoutResponse;
      expect(logoutBody.message).toBe('Logged out successfully');

      // Step 8: Verify refresh token is invalidated after logout
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(401);
    });
  });
});