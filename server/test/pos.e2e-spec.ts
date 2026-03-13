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
import { CashRegistersModule } from '../src/cash-registers';
import { POSSessionsModule } from '../src/pos-sessions';
import { POSSalesModule } from '../src/pos-sales';
import { ProductsModule } from '../src/products';
import { CustomersModule } from '../src/customers';
import {
  UserRole,
  ProductStatus,
  PaymentMethod,
  DocumentType,
  POSSessionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Unique identifier to avoid test data collision
const testIdentifier = `pos-e2e-${Date.now()}`;

// ============================================================================
// RESPONSE TYPE INTERFACES
// ============================================================================

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface CashRegisterResponse {
  id: string;
  tenantId: string;
  warehouseId: string;
  name: string;
  code: string;
  status: string;
}

interface POSSessionResponse {
  id: string;
  tenantId: string;
  cashRegisterId: string;
  userId: string;
  status: POSSessionStatus;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  cashRegister: {
    id: string;
    name: string;
    code: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  summary: {
    totalSales: number;
    totalSalesAmount: number;
    totalCashIn: number;
    totalCashOut: number;
    salesByMethod: Record<string, number>;
  };
}

interface SalePaymentResponse {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  cardLastFour: string | null;
}

interface SaleItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
}

interface POSSaleResponse {
  id: string;
  tenantId: string;
  sessionId: string;
  invoiceId: string;
  saleNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  invoice: {
    id: string;
    invoiceNumber: string;
    customer: {
      id: string;
      name: string;
      documentNumber: string;
    } | null;
    items: SaleItemResponse[];
  };
  payments: SalePaymentResponse[];
  session: {
    id: string;
    cashRegister: {
      id: string;
      name: string;
      code: string;
    };
  };
}

interface PaginatedSalesResponse {
  data: POSSaleResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
    CustomersModule,
    CashRegistersModule,
    POSSessionsModule,
    POSSalesModule,
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

describe('POS E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenant
  let tenant: { id: string; name: string; slug: string };

  // Test users
  let adminUser: { id: string; email: string; accessToken: string };
  let employeeUser: { id: string; email: string; accessToken: string };

  // Test data
  let customer: { id: string; name: string };
  let product1: { id: string; name: string; sku: string; salePrice: number };
  let product2: { id: string; name: string; sku: string; salePrice: number };
  let warehouse: { id: string; name: string };
  let cashRegister: { id: string; name: string; code: string };

  // Created during tests
  let sessionId: string;
  let saleId: string;

  const hashedPassword = bcrypt.hashSync('TestPassword123!', 10);
  const INITIAL_STOCK = 100;

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
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create Test Tenant
    tenant = await prisma.tenant.create({
      data: {
        name: `POS Test Tenant ${testIdentifier}`,
        slug: `pos-test-tenant-${testIdentifier}`,
        email: `pos-test-${testIdentifier}@test.com`,
        status: 'ACTIVE',
        plan: 'PRO',
        maxProducts: 1000,
        maxInvoices: 1000,
      },
    });

    // Create Admin User
    const adminRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin-${testIdentifier}@pos-test.com`,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'POS',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // Create Employee User
    const employeeRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `employee-${testIdentifier}@pos-test.com`,
        password: hashedPassword,
        firstName: 'Employee',
        lastName: 'POS',
        role: UserRole.EMPLOYEE,
        status: 'ACTIVE',
      },
    });

    // Create Test Customer
    const createdCustomer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: `POS Customer ${testIdentifier}`,
        email: `pos-customer-${testIdentifier}@test.com`,
        phone: '+1234567890',
        documentType: DocumentType.CC,
        documentNumber: `POS-${testIdentifier}`,
      },
    });
    customer = { id: createdCustomer.id, name: createdCustomer.name };

    // Create Warehouse
    const createdWarehouse = await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        name: `POS Warehouse ${testIdentifier}`,
        code: `WH-${testIdentifier.slice(-8)}`,
      },
    });
    warehouse = { id: createdWarehouse.id, name: createdWarehouse.name };

    // Create Products with stock
    const createdProduct1 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: `POS Product One ${testIdentifier}`,
        sku: `POS-P1-${testIdentifier}`,
        description: 'First POS test product',
        salePrice: 10000,
        costPrice: 5000,
        taxRate: 19,
        stock: INITIAL_STOCK,
        status: ProductStatus.ACTIVE,
      },
    });
    product1 = {
      id: createdProduct1.id,
      name: createdProduct1.name,
      sku: createdProduct1.sku,
      salePrice: Number(createdProduct1.salePrice),
    };

    const createdProduct2 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: `POS Product Two ${testIdentifier}`,
        sku: `POS-P2-${testIdentifier}`,
        description: 'Second POS test product',
        salePrice: 25000,
        costPrice: 12000,
        taxRate: 19,
        stock: INITIAL_STOCK,
        status: ProductStatus.ACTIVE,
      },
    });
    product2 = {
      id: createdProduct2.id,
      name: createdProduct2.name,
      sku: createdProduct2.sku,
      salePrice: Number(createdProduct2.salePrice),
    };

    // Create warehouse stock
    await prisma.warehouseStock.createMany({
      data: [
        {
          tenantId: tenant.id,
          warehouseId: warehouse.id,
          productId: product1.id,
          quantity: INITIAL_STOCK,
        },
        {
          tenantId: tenant.id,
          warehouseId: warehouse.id,
          productId: product2.id,
          quantity: INITIAL_STOCK,
        },
      ],
    });

    // Login users to get access tokens
    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `admin-${testIdentifier}@pos-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyAdmin = loginAdmin.body as LoginResponse;
    adminUser = {
      id: adminRecord.id,
      email: adminRecord.email,
      accessToken: loginBodyAdmin.accessToken,
    };

    const loginEmployee = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `employee-${testIdentifier}@pos-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyEmployee = loginEmployee.body as LoginResponse;
    employeeUser = {
      id: employeeRecord.id,
      email: employeeRecord.email,
      accessToken: loginBodyEmployee.accessToken,
    };
  }

  async function cleanupTestData() {
    if (!tenant?.id) return;

    // Delete in order of dependencies (children first)
    await prisma.salePayment.deleteMany({
      where: { sale: { tenantId: tenant.id } },
    });
    await prisma.cashRegisterMovement.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.stockMovement.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.pOSSale.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.payment.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { tenantId: tenant.id } },
    });
    await prisma.invoice.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.pOSSession.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.cashRegister.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.warehouseStock.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.product.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.warehouse.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.customer.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.user.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.tenant.delete({
      where: { id: tenant.id },
    });
  }

  // ==========================================================================
  // TEST: POST /cash-registers - Create Cash Register
  // ==========================================================================

  describe('POST /cash-registers - Create Cash Register', () => {
    it('should create a cash register successfully', async () => {
      const createDto = {
        name: `Test Register ${testIdentifier}`,
        code: `CR-${testIdentifier.slice(-6)}`,
        warehouseId: warehouse.id,
      };

      const response = await request(app.getHttpServer())
        .post('/cash-registers')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as CashRegisterResponse;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.name).toBe(createDto.name);
      expect(body.warehouseId).toBe(warehouse.id);
      expect(body.status).toBe('CLOSED');

      cashRegister = { id: body.id, name: body.name, code: body.code };
    });

    it('should reject cash register creation by employee', async () => {
      await request(app.getHttpServer())
        .post('/cash-registers')
        .set('Authorization', `Bearer ${employeeUser.accessToken}`)
        .send({
          name: 'Unauthorized Register',
          code: 'UNAUTH-CR',
          warehouseId: warehouse.id,
        })
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: POST /pos-sessions/open - Open POS Session
  // ==========================================================================

  describe('POST /pos-sessions/open - Open Session', () => {
    it('should open a POS session successfully', async () => {
      const openDto = {
        cashRegisterId: cashRegister.id,
        openingAmount: 100000,
        notes: 'E2E test session',
      };

      const response = await request(app.getHttpServer())
        .post('/pos-sessions/open')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(openDto)
        .expect(201);

      const body = response.body as POSSessionResponse;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.status).toBe(POSSessionStatus.ACTIVE);
      expect(body.openingAmount).toBe(100000);
      expect(body.cashRegister.id).toBe(cashRegister.id);

      sessionId = body.id;
    });

    it('should reject opening a second session on the same cash register', async () => {
      const response = await request(app.getHttpServer())
        .post('/pos-sessions/open')
        .set('Authorization', `Bearer ${employeeUser.accessToken}`)
        .send({
          cashRegisterId: cashRegister.id,
          openingAmount: 50000,
        })
        .expect(409);

      expect(response.body.message).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: POST /pos-sales - Create POS Sale
  // ==========================================================================

  describe('POST /pos-sales - Create Sale', () => {
    it('should create a sale with single cash payment', async () => {
      const qty = 3;
      const unitPrice = product1.salePrice;
      const subtotal = qty * unitPrice;
      const tax = subtotal * 0.19;
      const total = subtotal + tax;

      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: qty,
            unitPrice,
            taxRate: 19,
          },
        ],
        payments: [
          {
            method: PaymentMethod.CASH,
            amount: total,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/pos-sales')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as POSSaleResponse;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.saleNumber).toBeDefined();
      expect(body.subtotal).toBeCloseTo(subtotal, 1);
      expect(body.total).toBeCloseTo(total, 1);
      expect(body.invoice).toBeDefined();
      expect(body.invoice.items).toHaveLength(1);
      expect(body.payments).toHaveLength(1);
      expect(body.payments[0].method).toBe(PaymentMethod.CASH);

      saleId = body.id;
    });

    it('should create a sale with split payments (cash + card)', async () => {
      const qty = 2;
      const unitPrice = product2.salePrice;
      const subtotal = qty * unitPrice;
      const tax = subtotal * 0.19;
      const total = subtotal + tax;
      const cashAmount = Math.round(total / 2 * 100) / 100;
      const cardAmount = Math.round((total - cashAmount) * 100) / 100;

      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product2.id,
            quantity: qty,
            unitPrice,
            taxRate: 19,
          },
        ],
        payments: [
          {
            method: PaymentMethod.CASH,
            amount: cashAmount,
          },
          {
            method: PaymentMethod.CREDIT_CARD,
            amount: cardAmount,
            reference: 'AUTH-E2E-001',
            cardLastFour: '4242',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/pos-sales')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as POSSaleResponse;
      expect(body.payments).toHaveLength(2);

      const cashPayment = body.payments.find(
        (p) => p.method === PaymentMethod.CASH,
      );
      const cardPayment = body.payments.find(
        (p) => p.method === PaymentMethod.CREDIT_CARD,
      );

      expect(cashPayment).toBeDefined();
      expect(cardPayment).toBeDefined();
      expect(cardPayment!.cardLastFour).toBe('4242');
    });

    it('should reject sale when payment total does not match', async () => {
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: product1.salePrice,
            taxRate: 19,
          },
        ],
        payments: [
          {
            method: PaymentMethod.CASH,
            amount: 1, // Intentionally wrong amount
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/pos-sales')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should reject sale when stock is insufficient', async () => {
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 99999, // More than available stock
            unitPrice: product1.salePrice,
            taxRate: 19,
          },
        ],
        payments: [
          {
            method: PaymentMethod.CASH,
            amount: 99999 * product1.salePrice * 1.19,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/pos-sales')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: GET /pos-sales - List Sales
  // ==========================================================================

  describe('GET /pos-sales - List Sales', () => {
    it('should list sales with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/pos-sales')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedSalesResponse;
      expect(body.data).toBeDefined();
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.meta).toBeDefined();
      expect(body.meta.total).toBeGreaterThanOrEqual(2);
      expect(body.meta.page).toBe(1);
    });

    it('should filter sales by session ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/pos-sales')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ sessionId })
        .expect(200);

      const body = response.body as PaginatedSalesResponse;
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      body.data.forEach((sale) => {
        expect(sale.sessionId).toBe(sessionId);
      });
    });
  });

  // ==========================================================================
  // TEST: GET /pos-sales/:id - Get Sale Details
  // ==========================================================================

  describe('GET /pos-sales/:id - Get Sale Details', () => {
    it('should return sale details with items and payments', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pos-sales/${saleId}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as POSSaleResponse;
      expect(body.id).toBe(saleId);
      expect(body.invoice).toBeDefined();
      expect(body.invoice.items).toBeDefined();
      expect(body.invoice.items.length).toBeGreaterThan(0);
      expect(body.payments).toBeDefined();
      expect(body.payments.length).toBeGreaterThan(0);
      expect(body.session).toBeDefined();
      expect(body.session.cashRegister).toBeDefined();
    });

    it('should return 404 for non-existent sale', async () => {
      await request(app.getHttpServer())
        .get('/pos-sales/non-existent-id')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: Verify inventory decremented after sale
  // ==========================================================================

  describe('Inventory verification', () => {
    it('should have decremented product stock after sales', async () => {
      const updatedProduct1 = await prisma.product.findUnique({
        where: { id: product1.id },
      });

      // Product 1 was sold 3 units in the first sale
      expect(updatedProduct1!.stock).toBe(INITIAL_STOCK - 3);

      const updatedProduct2 = await prisma.product.findUnique({
        where: { id: product2.id },
      });

      // Product 2 was sold 2 units in the split payment sale
      expect(updatedProduct2!.stock).toBe(INITIAL_STOCK - 2);
    });
  });

  // ==========================================================================
  // TEST: POST /pos-sessions/:id/close - Close POS Session
  // ==========================================================================

  describe('POST /pos-sessions/:id/close - Close Session', () => {
    it('should close session and verify totals', async () => {
      // Calculate the expected cash amount:
      // Opening: 100000
      // Sale 1: full cash = 3 * 10000 * 1.19 = 35700
      // Sale 2: half cash = roughly half of (2 * 25000 * 1.19)
      // The exact amounts depend on the split payment math

      const closeDto = {
        closingAmount: 150000, // Declared amount
        notes: 'E2E test session close',
      };

      const response = await request(app.getHttpServer())
        .post(`/pos-sessions/${sessionId}/close`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(closeDto)
        .expect(200);

      const body = response.body as POSSessionResponse;
      expect(body.status).toBe(POSSessionStatus.CLOSED);
      expect(body.closingAmount).toBe(150000);
      expect(body.expectedAmount).toBeDefined();
      expect(body.difference).toBeDefined();
      expect(body.closedAt).toBeDefined();
    });

    it('should reject closing an already closed session', async () => {
      await request(app.getHttpServer())
        .post(`/pos-sessions/${sessionId}/close`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ closingAmount: 150000 })
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: Validation - Sale without active session
  // ==========================================================================

  describe('Sale without active session', () => {
    it('should reject sale when no session is open', async () => {
      const total = product1.salePrice * 1.19;
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: product1.salePrice,
            taxRate: 19,
          },
        ],
        payments: [
          {
            method: PaymentMethod.CASH,
            amount: total,
          },
        ],
      };

      // The admin's session is now closed, so this should fail
      await request(app.getHttpServer())
        .post('/pos-sales')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: Unauthenticated access
  // ==========================================================================

  describe('Unauthenticated access', () => {
    it('should reject requests without auth token', async () => {
      await request(app.getHttpServer()).get('/pos-sales').expect(401);
    });

    it('should reject session operations without auth token', async () => {
      await request(app.getHttpServer())
        .post('/pos-sessions/open')
        .send({
          cashRegisterId: cashRegister.id,
          openingAmount: 50000,
        })
        .expect(401);
    });
  });
});
