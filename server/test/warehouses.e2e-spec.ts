// Load environment variables before anything else
import 'dotenv/config';

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
  Module,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule, PrismaService } from '../src/prisma';
import { AuthModule } from '../src/auth';
import { CommonModule } from '../src/common';
import { PermissionsModule } from '../src/common/permissions';
import { ArcjetModule, ArcjetService } from '../src/arcjet';
import { CacheModule } from '../src/cache';
import { configuration, validateEnv } from '../src/config';
import { TenantMiddleware } from '../src/common';
import { WarehousesModule } from '../src/warehouses';
import { StockMovementsModule } from '../src/stock-movements';
import { ProductsModule } from '../src/products';
import {
  UserRole,
  ProductStatus,
  WarehouseStatus,
  MovementType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Unique identifier to avoid test data collision
const testIdentifier = `warehouses-e2e-${Date.now()}`;

// ============================================================================
// RESPONSE TYPE INTERFACES
// ============================================================================

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface WarehouseResponse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  isDefault: boolean;
  status: WarehouseStatus;
  isActive: boolean;
  productCount: number;
  manager: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseWithStockSummaryResponse extends WarehouseResponse {
  stockSummary: {
    totalProducts: number;
    totalQuantity: number;
  };
}

interface PaginatedWarehousesResponse {
  data: WarehouseResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface StockMovementResponse {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string | null;
  userId: string | null;
  type: MovementType;
  quantity: number;
  reason: string | null;
  notes: string | null;
  invoiceId: string | null;
  createdAt: string;
  product?: {
    id: string;
    sku: string;
    name: string;
  };
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface PaginatedMovementsResponse {
  data: StockMovementResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TransferResponse {
  outMovement: StockMovementResponse;
  inMovement: StockMovementResponse;
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
    CacheModule,
    PermissionsModule,
    ArcjetModule,
    AuthModule,
    ProductsModule,
    WarehousesModule,
    StockMovementsModule,
  ],
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

// ============================================================================
// E2E TESTS
// ============================================================================

describe('Warehouses & Stock Movements E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenant
  let tenant: { id: string; name: string; slug: string };

  // Test users
  let adminUser: { id: string; email: string; accessToken: string };
  let managerUser: { id: string; email: string; accessToken: string };
  let staffUser: { id: string; email: string; accessToken: string };

  // Test products
  let product1: { id: string; name: string; sku: string };
  let product2: { id: string; name: string; sku: string };

  // Warehouses created during tests
  let warehouse1: { id: string; name: string; code: string };
  let warehouse2: { id: string; name: string; code: string };
  let warehouseToDelete: { id: string };

  const hashedPassword = bcrypt.hashSync('TestPassword123!', 10);

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
      imports: [TestAppModule],
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
    // Create Test Tenant
    tenant = await prisma.tenant.create({
      data: {
        name: `Warehouse Test Tenant ${testIdentifier}`,
        slug: `warehouse-test-tenant-${testIdentifier}`,
        email: `warehouse-test-${testIdentifier}@test.com`,
        status: 'ACTIVE',
        plan: 'PRO',
        maxWarehouses: 100,
      },
    });

    // Create Admin User
    const adminRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin-${testIdentifier}@warehouse-test.com`,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // Create Manager User
    const managerRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `manager-${testIdentifier}@warehouse-test.com`,
        password: hashedPassword,
        firstName: 'Manager',
        lastName: 'User',
        role: UserRole.MANAGER,
        status: 'ACTIVE',
      },
    });

    // Create Staff User (limited permissions)
    const staffRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `staff-${testIdentifier}@warehouse-test.com`,
        password: hashedPassword,
        firstName: 'Staff',
        lastName: 'User',
        role: UserRole.EMPLOYEE,
        status: 'ACTIVE',
      },
    });

    // Create Test Products with stock
    const createdProduct1 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: `Warehouse Product One ${testIdentifier}`,
        sku: `WH-PROD-001-${testIdentifier}`,
        description: 'First test product for warehouse tests',
        salePrice: 100,
        costPrice: 50,
        stock: 500,
        status: ProductStatus.ACTIVE,
      },
    });
    product1 = {
      id: createdProduct1.id,
      name: createdProduct1.name,
      sku: createdProduct1.sku,
    };

    const createdProduct2 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: `Warehouse Product Two ${testIdentifier}`,
        sku: `WH-PROD-002-${testIdentifier}`,
        description: 'Second test product for warehouse tests',
        salePrice: 200,
        costPrice: 100,
        stock: 300,
        status: ProductStatus.ACTIVE,
      },
    });
    product2 = {
      id: createdProduct2.id,
      name: createdProduct2.name,
      sku: createdProduct2.sku,
    };

    // Login users to get access tokens
    const loginResponseAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `admin-${testIdentifier}@warehouse-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyAdmin = loginResponseAdmin.body as LoginResponse;
    adminUser = {
      id: adminRecord.id,
      email: adminRecord.email,
      accessToken: loginBodyAdmin.accessToken,
    };

    const loginResponseManager = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `manager-${testIdentifier}@warehouse-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyManager = loginResponseManager.body as LoginResponse;
    managerUser = {
      id: managerRecord.id,
      email: managerRecord.email,
      accessToken: loginBodyManager.accessToken,
    };

    const loginResponseStaff = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `staff-${testIdentifier}@warehouse-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyStaff = loginResponseStaff.body as LoginResponse;
    staffUser = {
      id: staffRecord.id,
      email: staffRecord.email,
      accessToken: loginBodyStaff.accessToken,
    };
  }

  async function cleanupTestData() {
    if (!tenant?.id) return;

    // Delete stock movements
    await prisma.stockMovement.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete warehouse stocks
    await prisma.warehouseStock.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete warehouses
    await prisma.warehouse.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete products
    await prisma.product.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete users
    await prisma.user.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete tenant
    await prisma.tenant.delete({
      where: { id: tenant.id },
    });
  }

  // ==========================================================================
  // TEST: POST /warehouses - Create Warehouse
  // ==========================================================================

  describe('POST /warehouses - Create Warehouse', () => {
    it('should create a warehouse successfully', async () => {
      const createDto = {
        name: `Main Warehouse ${testIdentifier}`,
        code: `WH-MAIN-${testIdentifier}`,
        address: '123 Industrial Ave',
        city: 'Bogota',
        phone: '+57 1 234 5678',
        isDefault: true,
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const wh = response.body as WarehouseResponse;

      expect(wh.id).toBeDefined();
      expect(wh.name).toBe(createDto.name);
      expect(wh.code).toBe(createDto.code);
      expect(wh.address).toBe(createDto.address);
      expect(wh.city).toBe(createDto.city);
      expect(wh.phone).toBe(createDto.phone);
      expect(wh.isDefault).toBe(true);
      expect(wh.status).toBe(WarehouseStatus.ACTIVE);
      expect(wh.tenantId).toBe(tenant.id);

      warehouse1 = { id: wh.id, name: wh.name, code: wh.code };
    });

    it('should create a second warehouse', async () => {
      const createDto = {
        name: `Secondary Warehouse ${testIdentifier}`,
        code: `WH-SEC-${testIdentifier}`,
        address: '456 Commerce Blvd',
        city: 'Medellin',
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const wh = response.body as WarehouseResponse;

      expect(wh.id).toBeDefined();
      expect(wh.name).toBe(createDto.name);
      expect(wh.code).toBe(createDto.code);
      expect(wh.isDefault).toBe(false);

      warehouse2 = { id: wh.id, name: wh.name, code: wh.code };
    });

    it('should create a warehouse for deletion tests', async () => {
      const createDto = {
        name: `Deletable Warehouse ${testIdentifier}`,
        code: `WH-DEL-${testIdentifier}`,
      };

      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const wh = response.body as WarehouseResponse;
      warehouseToDelete = { id: wh.id };
    });

    it('should NOT allow MANAGER to create warehouse (ADMIN only)', async () => {
      const createDto = {
        name: `Manager Warehouse ${testIdentifier}`,
        code: `WH-MGR-${testIdentifier}`,
      };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send(createDto)
        .expect(403);
    });

    it('should NOT allow STAFF to create warehouse', async () => {
      const createDto = {
        name: `Staff Warehouse ${testIdentifier}`,
        code: `WH-STF-${testIdentifier}`,
      };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send(createDto)
        .expect(403);
    });

    it('should reject duplicate warehouse code', async () => {
      const createDto = {
        name: `Duplicate Code Warehouse ${testIdentifier}`,
        code: warehouse1.code, // Same code as existing warehouse
      };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(409);
    });

    it('should reject warehouse with name too short', async () => {
      const createDto = {
        name: 'X', // Too short (min 2 chars)
        code: `WH-SHORT-${testIdentifier}`,
      };

      await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: GET /warehouses - List Warehouses
  // ==========================================================================

  describe('GET /warehouses - List Warehouses', () => {
    it('should list warehouses with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedWarehousesResponse;

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBeGreaterThanOrEqual(3); // At least warehouse1, warehouse2, warehouseToDelete
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses?page=1&limit=2')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedWarehousesResponse;

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
    });

    it('should allow STAFF to list warehouses (read access)', async () => {
      const response = await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedWarehousesResponse;
      expect(result.data).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: GET /warehouses/:id - Get Single Warehouse with Stock Summary
  // ==========================================================================

  describe('GET /warehouses/:id - Get Single Warehouse', () => {
    it('should get a warehouse with stock summary', async () => {
      const response = await request(app.getHttpServer())
        .get(`/warehouses/${warehouse1.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const wh = response.body as WarehouseWithStockSummaryResponse;

      expect(wh.id).toBe(warehouse1.id);
      expect(wh.name).toBe(warehouse1.name);
      expect(wh.code).toBe(warehouse1.code);
      expect(wh.stockSummary).toBeDefined();
      expect(typeof wh.stockSummary.totalProducts).toBe('number');
      expect(typeof wh.stockSummary.totalQuantity).toBe('number');
    });

    it('should return 404 for non-existent warehouse', async () => {
      await request(app.getHttpServer())
        .get('/warehouses/cm0nonexistent0warehouse00')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });

    it('should allow STAFF to view warehouse details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/warehouses/${warehouse1.id}`)
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const wh = response.body as WarehouseWithStockSummaryResponse;
      expect(wh.id).toBe(warehouse1.id);
    });
  });

  // ==========================================================================
  // TEST: PATCH /warehouses/:id - Update Warehouse
  // ==========================================================================

  describe('PATCH /warehouses/:id - Update Warehouse', () => {
    it('should update warehouse name and address', async () => {
      const updateDto = {
        name: `Updated Warehouse ${testIdentifier}`,
        address: '789 New Street',
      };

      const response = await request(app.getHttpServer())
        .patch(`/warehouses/${warehouse1.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(updateDto)
        .expect(200);

      const wh = response.body as WarehouseResponse;

      expect(wh.name).toBe(updateDto.name);
      expect(wh.address).toBe(updateDto.address);

      // Update tracked name
      warehouse1.name = wh.name;
    });

    it('should allow MANAGER to update warehouse', async () => {
      const updateDto = {
        phone: '+57 1 999 8888',
      };

      const response = await request(app.getHttpServer())
        .patch(`/warehouses/${warehouse1.id}`)
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send(updateDto)
        .expect(200);

      const wh = response.body as WarehouseResponse;
      expect(wh.phone).toBe(updateDto.phone);
    });

    it('should NOT allow STAFF to update warehouse', async () => {
      const updateDto = {
        name: 'Staff trying to update',
      };

      await request(app.getHttpServer())
        .patch(`/warehouses/${warehouse1.id}`)
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('should return 404 for updating non-existent warehouse', async () => {
      const updateDto = { name: 'Does Not Exist' };

      await request(app.getHttpServer())
        .patch('/warehouses/cm0nonexistent0warehouse00')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: POST /stock-movements - Create Stock Adjustment (IN)
  // ==========================================================================

  describe('POST /stock-movements - Stock Adjustments', () => {
    it('should create a positive stock adjustment (add stock)', async () => {
      // Get initial product stock
      const initialProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      const initialStock = initialProduct!.stock;

      const movementDto = {
        productId: product1.id,
        warehouseId: warehouse1.id,
        quantity: 50,
        reason: 'Inventory count correction',
        notes: 'Found extra units during audit',
      };

      const response = await request(app.getHttpServer())
        .post('/stock-movements')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(movementDto)
        .expect(201);

      const movement = response.body as StockMovementResponse;

      expect(movement.id).toBeDefined();
      expect(movement.productId).toBe(product1.id);
      expect(movement.warehouseId).toBe(warehouse1.id);
      expect(movement.type).toBe(MovementType.ADJUSTMENT);
      expect(movement.quantity).toBe(50);
      expect(movement.reason).toBe('Inventory count correction');
      expect(movement.notes).toBe('Found extra units during audit');

      // Verify product stock increased
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      expect(updatedProduct!.stock).toBe(initialStock + 50);
    });

    it('should create a negative stock adjustment (remove stock)', async () => {
      const initialProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      const initialStock = initialProduct!.stock;

      const movementDto = {
        productId: product1.id,
        warehouseId: warehouse1.id,
        quantity: -20,
        reason: 'Damaged goods removed',
        notes: 'Items damaged in storage',
      };

      const response = await request(app.getHttpServer())
        .post('/stock-movements')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(movementDto)
        .expect(201);

      const movement = response.body as StockMovementResponse;

      expect(movement.quantity).toBe(-20);
      expect(movement.type).toBe(MovementType.ADJUSTMENT);

      // Verify product stock decreased
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      expect(updatedProduct!.stock).toBe(initialStock - 20);
    });

    it('should allow MANAGER to create stock adjustment', async () => {
      const movementDto = {
        productId: product2.id,
        warehouseId: warehouse2.id,
        quantity: 30,
        reason: 'Manager adjustment',
      };

      const response = await request(app.getHttpServer())
        .post('/stock-movements')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send(movementDto)
        .expect(201);

      const movement = response.body as StockMovementResponse;
      expect(movement.quantity).toBe(30);
    });

    it('should NOT allow STAFF to create stock adjustment (403 Forbidden)', async () => {
      const movementDto = {
        productId: product1.id,
        quantity: 10,
        reason: 'Staff adjustment attempt',
      };

      await request(app.getHttpServer())
        .post('/stock-movements')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send(movementDto)
        .expect(403);
    });

    it('should reject adjustment that would make stock negative', async () => {
      // Get current stock for product2
      const currentProduct = await prisma.product.findUnique({
        where: { id: product2.id },
      });

      // Try to subtract more than available stock
      const movementDto = {
        productId: product2.id,
        quantity: -(currentProduct!.stock + 100),
        reason: 'Excessive removal',
      };

      await request(app.getHttpServer())
        .post('/stock-movements')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(movementDto)
        .expect(400);
    });

    it('should reject adjustment with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/stock-movements')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({})
        .expect(400);
    });

    it('should reject adjustment with non-existent productId', async () => {
      const movementDto = {
        productId: 'cm0nonexistent0product000',
        quantity: 10,
        reason: 'Non-existent product',
      };

      await request(app.getHttpServer())
        .post('/stock-movements')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(movementDto)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: POST /stock-movements/transfers - Transfer Between Warehouses
  // ==========================================================================

  describe('POST /stock-movements/transfers - Stock Transfers', () => {
    beforeAll(async () => {
      // Ensure warehouse1 has stock for product1 via WarehouseStock
      await prisma.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse1.id,
            productId: product1.id,
          },
        },
        update: { quantity: 200 },
        create: {
          tenantId: tenant.id,
          warehouseId: warehouse1.id,
          productId: product1.id,
          quantity: 200,
        },
      });
    });

    it('should transfer stock between warehouses', async () => {
      const transferDto = {
        productId: product1.id,
        sourceWarehouseId: warehouse1.id,
        destinationWarehouseId: warehouse2.id,
        quantity: 25,
        reason: 'Restock branch warehouse',
        notes: 'Monthly transfer',
      };

      const response = await request(app.getHttpServer())
        .post('/stock-movements/transfers')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(transferDto)
        .expect(201);

      const transfer = response.body as TransferResponse;

      // Verify out movement
      expect(transfer.outMovement).toBeDefined();
      expect(transfer.outMovement.type).toBe(MovementType.TRANSFER);
      expect(transfer.outMovement.quantity).toBeLessThan(0); // Negative for outgoing
      expect(transfer.outMovement.warehouseId).toBe(warehouse1.id);

      // Verify in movement
      expect(transfer.inMovement).toBeDefined();
      expect(transfer.inMovement.type).toBe(MovementType.TRANSFER);
      expect(transfer.inMovement.quantity).toBeGreaterThan(0); // Positive for incoming
      expect(transfer.inMovement.warehouseId).toBe(warehouse2.id);
    });

    it('should allow MANAGER to create transfers', async () => {
      const transferDto = {
        productId: product1.id,
        sourceWarehouseId: warehouse1.id,
        destinationWarehouseId: warehouse2.id,
        quantity: 10,
        reason: 'Manager transfer',
      };

      const response = await request(app.getHttpServer())
        .post('/stock-movements/transfers')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send(transferDto)
        .expect(201);

      const transfer = response.body as TransferResponse;
      expect(transfer.outMovement).toBeDefined();
      expect(transfer.inMovement).toBeDefined();
    });

    it('should NOT allow STAFF to create transfers', async () => {
      const transferDto = {
        productId: product1.id,
        sourceWarehouseId: warehouse1.id,
        destinationWarehouseId: warehouse2.id,
        quantity: 5,
      };

      await request(app.getHttpServer())
        .post('/stock-movements/transfers')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send(transferDto)
        .expect(403);
    });

    it('should reject transfer with same source and destination', async () => {
      const transferDto = {
        productId: product1.id,
        sourceWarehouseId: warehouse1.id,
        destinationWarehouseId: warehouse1.id, // Same as source
        quantity: 10,
      };

      await request(app.getHttpServer())
        .post('/stock-movements/transfers')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(transferDto)
        .expect(400);
    });

    it('should reject transfer with insufficient stock in source warehouse', async () => {
      // Get current stock in source warehouse
      const sourceStock = await prisma.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse1.id,
            productId: product1.id,
          },
        },
      });

      // Try to transfer more than available
      const transferDto = {
        productId: product1.id,
        sourceWarehouseId: warehouse1.id,
        destinationWarehouseId: warehouse2.id,
        quantity: (sourceStock?.quantity ?? 0) + 1000,
      };

      await request(app.getHttpServer())
        .post('/stock-movements/transfers')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(transferDto)
        .expect(400);
    });

    it('should reject transfer with quantity < 1', async () => {
      const transferDto = {
        productId: product1.id,
        sourceWarehouseId: warehouse1.id,
        destinationWarehouseId: warehouse2.id,
        quantity: 0,
      };

      await request(app.getHttpServer())
        .post('/stock-movements/transfers')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(transferDto)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: GET /stock-movements - List Movements with Filters
  // ==========================================================================

  describe('GET /stock-movements - List Movements', () => {
    it('should list stock movements with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-movements')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedMovementsResponse;

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBeGreaterThan(0);
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-movements?page=1&limit=2')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedMovementsResponse;

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
    });

    it('should filter movements by type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stock-movements?type=${MovementType.ADJUSTMENT}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedMovementsResponse;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((movement) => {
        expect(movement.type).toBe(MovementType.ADJUSTMENT);
      });
    });

    it('should filter movements by productId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stock-movements?productId=${product1.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedMovementsResponse;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((movement) => {
        expect(movement.productId).toBe(product1.id);
      });
    });

    it('should filter movements by warehouseId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stock-movements?warehouseId=${warehouse1.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedMovementsResponse;

      result.data.forEach((movement) => {
        expect(movement.warehouseId).toBe(warehouse1.id);
      });
    });

    it('should allow STAFF to list movements (read access)', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-movements')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedMovementsResponse;
      expect(result.data).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: GET /stock-movements/:id - Get Single Movement
  // ==========================================================================

  describe('GET /stock-movements/:id - Get Single Movement', () => {
    let movementId: string;

    beforeAll(async () => {
      // Get an existing movement ID
      const response = await request(app.getHttpServer())
        .get('/stock-movements?limit=1')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedMovementsResponse;
      movementId = result.data[0].id;
    });

    it('should get a single stock movement with relations', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stock-movements/${movementId}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const movement = response.body as StockMovementResponse;

      expect(movement.id).toBe(movementId);
      expect(movement.productId).toBeDefined();
      expect(movement.type).toBeDefined();
      expect(movement.quantity).toBeDefined();
      expect(movement.createdAt).toBeDefined();
    });

    it('should return 404 for non-existent movement', async () => {
      await request(app.getHttpServer())
        .get('/stock-movements/cm0nonexistent0movement00')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });

    it('should allow STAFF to view movement details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stock-movements/${movementId}`)
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const movement = response.body as StockMovementResponse;
      expect(movement.id).toBe(movementId);
    });
  });

  // ==========================================================================
  // TEST: Verify Stock Levels After Movements
  // ==========================================================================

  describe('Stock Level Verification', () => {
    it('should correctly track warehouse stock after adjustments and transfers', async () => {
      // Check warehouse1 stock for product1
      const wh1Stock = await prisma.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse1.id,
            productId: product1.id,
          },
        },
      });

      // warehouse1 started with 200, transferred out 25 + 10 = 35
      // So should have 165
      expect(wh1Stock).toBeDefined();
      expect(wh1Stock!.quantity).toBe(165);

      // Check warehouse2 received the transfers
      const wh2Stock = await prisma.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse2.id,
            productId: product1.id,
          },
        },
      });

      expect(wh2Stock).toBeDefined();
      expect(wh2Stock!.quantity).toBe(35); // 25 + 10 transferred in
    });
  });

  // ==========================================================================
  // TEST: DELETE /warehouses/:id - Delete Warehouse
  // ==========================================================================

  describe('DELETE /warehouses/:id - Delete Warehouse', () => {
    it('should NOT allow MANAGER to delete warehouse (ADMIN only)', async () => {
      await request(app.getHttpServer())
        .delete(`/warehouses/${warehouseToDelete.id}`)
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .expect(403);
    });

    it('should NOT allow STAFF to delete warehouse', async () => {
      await request(app.getHttpServer())
        .delete(`/warehouses/${warehouseToDelete.id}`)
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(403);
    });

    it('should delete warehouse with no stock', async () => {
      await request(app.getHttpServer())
        .delete(`/warehouses/${warehouseToDelete.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(204);

      // Verify warehouse no longer exists
      await request(app.getHttpServer())
        .get(`/warehouses/${warehouseToDelete.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });

    it('should NOT delete warehouse that has stock', async () => {
      // warehouse1 has stock from the transfer tests
      await request(app.getHttpServer())
        .delete(`/warehouses/${warehouse1.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent warehouse', async () => {
      await request(app.getHttpServer())
        .delete('/warehouses/cm0nonexistent0warehouse00')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: Authentication Required
  // ==========================================================================

  describe('Authentication Required', () => {
    it('should reject GET /warehouses without authentication', async () => {
      await request(app.getHttpServer()).get('/warehouses').expect(401);
    });

    it('should reject POST /warehouses without authentication', async () => {
      await request(app.getHttpServer())
        .post('/warehouses')
        .send({ name: 'Unauthed Warehouse', code: 'UNAUTH' })
        .expect(401);
    });

    it('should reject GET /stock-movements without authentication', async () => {
      await request(app.getHttpServer()).get('/stock-movements').expect(401);
    });

    it('should reject POST /stock-movements without authentication', async () => {
      await request(app.getHttpServer())
        .post('/stock-movements')
        .send({
          productId: product1.id,
          quantity: 10,
          reason: 'Unauthed adjustment',
        })
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/warehouses')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
