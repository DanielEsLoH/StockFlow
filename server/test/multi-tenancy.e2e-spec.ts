// Load environment variables before anything else
import 'dotenv/config';

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Module,
  Injectable,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule, PrismaService } from '../src/prisma';
import { AuthModule } from '../src/auth/auth.module';
import { CommonModule } from '../src/common';
import { configuration, validateEnv } from '../src/config';
import { JwtAuthGuard, RolesGuard } from '../src/auth/guards';
import { CurrentTenant, Roles } from '../src/common/decorators';
import { UserRole, ProductStatus } from '@prisma/client';
import { TenantMiddleware } from '../src/common/middleware';
import * as bcrypt from 'bcrypt';

// ============================================================================
// TEST-SPECIFIC DTOs
// ============================================================================

class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  salePrice: number;
}

class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  salePrice?: number;
}

// ============================================================================
// TEST-SPECIFIC SERVICE
// ============================================================================

@Injectable()
class TestProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        salePrice: dto.salePrice,
        costPrice: 0,
        status: ProductStatus.ACTIVE,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    // First check if product exists and belongs to tenant
    const existing = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async delete(tenantId: string, id: string) {
    // First check if product exists and belongs to tenant
    const existing = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  // Admin-only: Find products across all tenants
  async findAllAdmin() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { name: true, slug: true } } },
    });
  }
}

// ============================================================================
// TEST-SPECIFIC CONTROLLER
// ============================================================================

@Controller('test-products')
@UseGuards(JwtAuthGuard, RolesGuard)
class TestProductController {
  constructor(private readonly productService: TestProductService) {}

  // Admin endpoint - MUST be defined before :id route to avoid route conflict
  @Get('admin/all')
  @Roles(UserRole.SUPER_ADMIN)
  async findAllAdmin() {
    return this.productService.findAllAdmin();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(tenantId, dto);
  }

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    return this.productService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productService.delete(tenantId, id);
  }
}

// ============================================================================
// TEST MODULE
// ============================================================================

@Module({
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
  ],
  controllers: [TestProductController],
  providers: [TestProductService],
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

// ============================================================================
// E2E TESTS
// ============================================================================

describe('Multi-Tenancy E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenants
  let tenantA: { id: string; name: string; slug: string };
  let tenantB: { id: string; name: string; slug: string };

  // Test users
  let userA: { id: string; email: string; accessToken: string };
  let userB: { id: string; email: string; accessToken: string };
  let superAdmin: { id: string; email: string; accessToken: string };

  // Test products
  let productA: { id: string; name: string; sku: string };

  const hashedPassword = bcrypt.hashSync('TestPassword123!', 10);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

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
    // Create Tenant A
    tenantA = await prisma.tenant.create({
      data: {
        name: 'Test Tenant A',
        slug: 'test-tenant-a',
        email: 'tenant-a@test.com',
        status: 'ACTIVE',
        plan: 'PRO',
      },
    });

    // Create Tenant B
    tenantB = await prisma.tenant.create({
      data: {
        name: 'Test Tenant B',
        slug: 'test-tenant-b',
        email: 'tenant-b@test.com',
        status: 'ACTIVE',
        plan: 'PRO',
      },
    });

    // Create User A (Admin of Tenant A)
    const userARecord = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: 'user-a@test-tenant-a.com',
        password: hashedPassword,
        firstName: 'User',
        lastName: 'A',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // Create User B (Admin of Tenant B)
    const userBRecord = await prisma.user.create({
      data: {
        tenantId: tenantB.id,
        email: 'user-b@test-tenant-b.com',
        password: hashedPassword,
        firstName: 'User',
        lastName: 'B',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // Create Super Admin (belongs to Tenant A but has super admin privileges)
    const superAdminRecord = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: 'super-admin@test.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        status: 'ACTIVE',
      },
    });

    // Login users to get access tokens
    const loginResponseA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-a@test-tenant-a.com', password: 'TestPassword123!' })
      .expect(200);

    userA = {
      id: userARecord.id,
      email: userARecord.email,
      accessToken: loginResponseA.body.accessToken,
    };

    const loginResponseB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-b@test-tenant-b.com', password: 'TestPassword123!' })
      .expect(200);

    userB = {
      id: userBRecord.id,
      email: userBRecord.email,
      accessToken: loginResponseB.body.accessToken,
    };

    const loginResponseSuperAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'super-admin@test.com', password: 'TestPassword123!' })
      .expect(200);

    superAdmin = {
      id: superAdminRecord.id,
      email: superAdminRecord.email,
      accessToken: loginResponseSuperAdmin.body.accessToken,
    };
  }

  async function cleanupTestData() {
    // Delete products created by test tenants
    await prisma.product.deleteMany({
      where: {
        tenantId: { in: [tenantA?.id, tenantB?.id].filter(Boolean) },
      },
    });

    // Delete test users
    await prisma.user.deleteMany({
      where: {
        tenantId: { in: [tenantA?.id, tenantB?.id].filter(Boolean) },
      },
    });

    // Delete test tenants
    await prisma.tenant.deleteMany({
      where: {
        id: { in: [tenantA?.id, tenantB?.id].filter(Boolean) },
      },
    });
  }

  // ==========================================================================
  // TEST: User from Tenant A cannot see data from Tenant B
  // ==========================================================================

  describe('Tenant Data Isolation', () => {
    beforeAll(async () => {
      // Create a product for Tenant A
      const response = await request(app.getHttpServer())
        .post('/test-products')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Product from Tenant A',
          sku: 'PROD-A-001',
          description: 'This product belongs to Tenant A',
          salePrice: 100,
        })
        .expect(201);

      productA = {
        id: response.body.id,
        name: response.body.name,
        sku: response.body.sku,
      };
    });

    it('should allow Tenant A to see their own product', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-products')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((p: { id: string }) => p.id === productA.id)).toBe(true);
    });

    it('should NOT allow Tenant B to see Tenant A products in list', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-products')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // Tenant B should not see any of Tenant A's products
      expect(response.body.some((p: { id: string }) => p.id === productA.id)).toBe(false);
    });

    it('should NOT allow Tenant B to access Tenant A product by ID', async () => {
      await request(app.getHttpServer())
        .get(`/test-products/${productA.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404); // Should return 404 as if product doesn't exist
    });

    it('should allow Tenant A to access their own product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/test-products/${productA.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(productA.id);
      expect(response.body.name).toBe(productA.name);
    });
  });

  // ==========================================================================
  // TEST: Creating a record assigns tenantId automatically
  // ==========================================================================

  describe('Automatic Tenant ID Assignment', () => {
    it('should automatically assign tenantId when Tenant B creates a product', async () => {
      const response = await request(app.getHttpServer())
        .post('/test-products')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          name: 'Product from Tenant B',
          sku: 'PROD-B-001',
          description: 'This product belongs to Tenant B',
          salePrice: 200,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.tenantId).toBe(tenantB.id);
      expect(response.body.name).toBe('Product from Tenant B');

      // Verify Tenant A cannot see this product
      const listResponse = await request(app.getHttpServer())
        .get('/test-products')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(listResponse.body.some((p: { id: string }) => p.id === response.body.id)).toBe(false);

      // Verify Tenant B can see this product
      const listResponseB = await request(app.getHttpServer())
        .get('/test-products')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(listResponseB.body.some((p: { id: string }) => p.id === response.body.id)).toBe(true);
    });
  });

  // ==========================================================================
  // TEST: Update/Delete only affects records from current tenant
  // ==========================================================================

  describe('Tenant-Scoped Updates and Deletes', () => {
    let productToUpdate: { id: string };
    let productToDelete: { id: string };

    beforeAll(async () => {
      // Create products for Tenant A
      const updateResponse = await request(app.getHttpServer())
        .post('/test-products')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Product to Update',
          sku: 'PROD-UPDATE-001',
          salePrice: 50,
        })
        .expect(201);

      productToUpdate = { id: updateResponse.body.id };

      const deleteResponse = await request(app.getHttpServer())
        .post('/test-products')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Product to Delete',
          sku: 'PROD-DELETE-001',
          salePrice: 75,
        })
        .expect(201);

      productToDelete = { id: deleteResponse.body.id };
    });

    it('should NOT allow Tenant B to update Tenant A product', async () => {
      await request(app.getHttpServer())
        .put(`/test-products/${productToUpdate.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          name: 'Hacked by Tenant B',
          salePrice: 9999,
        })
        .expect(404); // Should return 404 as if product doesn't exist

      // Verify product was not updated
      const verifyResponse = await request(app.getHttpServer())
        .get(`/test-products/${productToUpdate.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(verifyResponse.body.name).toBe('Product to Update');
      expect(Number(verifyResponse.body.salePrice)).toBe(50);
    });

    it('should allow Tenant A to update their own product', async () => {
      const response = await request(app.getHttpServer())
        .put(`/test-products/${productToUpdate.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Updated by Tenant A',
          salePrice: 150,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated by Tenant A');
      expect(Number(response.body.salePrice)).toBe(150);
    });

    it('should NOT allow Tenant B to delete Tenant A product', async () => {
      await request(app.getHttpServer())
        .delete(`/test-products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404); // Should return 404 as if product doesn't exist

      // Verify product still exists
      const verifyResponse = await request(app.getHttpServer())
        .get(`/test-products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(verifyResponse.body.id).toBe(productToDelete.id);
    });

    it('should allow Tenant A to delete their own product', async () => {
      await request(app.getHttpServer())
        .delete(`/test-products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      // Verify product no longer exists
      await request(app.getHttpServer())
        .get(`/test-products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: Super Admin can see all tenants
  // ==========================================================================

  describe('Super Admin Cross-Tenant Access', () => {
    let productFromA: { id: string; tenantId: string };
    let productFromB: { id: string; tenantId: string };

    beforeAll(async () => {
      // Create a product for Tenant A
      const responseA = await request(app.getHttpServer())
        .post('/test-products')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Super Admin Test Product A',
          sku: 'PROD-SA-A-001',
          salePrice: 100,
        })
        .expect(201);

      productFromA = { id: responseA.body.id, tenantId: responseA.body.tenantId };

      // Create a product for Tenant B
      const responseB = await request(app.getHttpServer())
        .post('/test-products')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          name: 'Super Admin Test Product B',
          sku: 'PROD-SA-B-001',
          salePrice: 200,
        })
        .expect(201);

      productFromB = { id: responseB.body.id, tenantId: responseB.body.tenantId };
    });

    it('should allow Super Admin to see products from all tenants', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-products/admin/all')
        .set('Authorization', `Bearer ${superAdmin.accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      // Super Admin should see products from both tenants
      const productIds = response.body.map((p: { id: string }) => p.id);
      expect(productIds).toContain(productFromA.id);
      expect(productIds).toContain(productFromB.id);

      // Verify tenant information is included
      const tenantAProduct = response.body.find((p: { id: string }) => p.id === productFromA.id);
      const tenantBProduct = response.body.find((p: { id: string }) => p.id === productFromB.id);

      expect(tenantAProduct.tenant.slug).toBe('test-tenant-a');
      expect(tenantBProduct.tenant.slug).toBe('test-tenant-b');
    });

    it('should NOT allow regular admin to access super admin endpoint', async () => {
      await request(app.getHttpServer())
        .get('/test-products/admin/all')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(403);
    });

    it('should NOT allow Tenant B user to access super admin endpoint', async () => {
      await request(app.getHttpServer())
        .get('/test-products/admin/all')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: Unauthenticated requests are rejected
  // ==========================================================================

  describe('Authentication Required', () => {
    it('should reject requests without authentication token', async () => {
      await request(app.getHttpServer())
        .get('/test-products')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/test-products')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject POST requests without authentication', async () => {
      await request(app.getHttpServer())
        .post('/test-products')
        .send({
          name: 'Unauthorized Product',
          sku: 'UNAUTH-001',
          salePrice: 100,
        })
        .expect(401);
    });
  });

  // ==========================================================================
  // TEST: Complete isolation flow
  // ==========================================================================

  describe('Complete Tenant Isolation Flow', () => {
    it('should demonstrate complete isolation: Tenant A creates, Tenant B cannot see', async () => {
      // Step 1: Tenant A creates a product
      const createResponse = await request(app.getHttpServer())
        .post('/test-products')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Isolation Test Product',
          sku: 'ISOLATION-001',
          description: 'Testing complete isolation',
          salePrice: 500,
        })
        .expect(201);

      const createdProductId = createResponse.body.id;
      expect(createResponse.body.tenantId).toBe(tenantA.id);

      // Step 2: Tenant B lists products - should NOT see Tenant A's product
      const listResponseB = await request(app.getHttpServer())
        .get('/test-products')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      const tenantBProductIds = listResponseB.body.map((p: { id: string }) => p.id);
      expect(tenantBProductIds).not.toContain(createdProductId);

      // Step 3: Tenant B tries to access by ID - should get 404
      await request(app.getHttpServer())
        .get(`/test-products/${createdProductId}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);

      // Step 4: Tenant B tries to update - should get 404
      await request(app.getHttpServer())
        .put(`/test-products/${createdProductId}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ name: 'Attempted Hack' })
        .expect(404);

      // Step 5: Tenant B tries to delete - should get 404
      await request(app.getHttpServer())
        .delete(`/test-products/${createdProductId}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);

      // Step 6: Verify Tenant A can still access their product (unaffected)
      const verifyResponse = await request(app.getHttpServer())
        .get(`/test-products/${createdProductId}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(verifyResponse.body.name).toBe('Isolation Test Product');
      expect(verifyResponse.body.tenantId).toBe(tenantA.id);

      // Step 7: Super Admin can see the product
      const superAdminResponse = await request(app.getHttpServer())
        .get('/test-products/admin/all')
        .set('Authorization', `Bearer ${superAdmin.accessToken}`)
        .expect(200);

      const superAdminProductIds = superAdminResponse.body.map((p: { id: string }) => p.id);
      expect(superAdminProductIds).toContain(createdProductId);
    });
  });
});
