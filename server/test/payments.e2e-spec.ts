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
import { InvoicesModule } from '../src/invoices';
import { PaymentsModule } from '../src/payments';
import { ProductsModule } from '../src/products';
import { CustomersModule } from '../src/customers';
import {
  UserRole,
  ProductStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  DocumentType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Unique identifier to avoid test data collision
const testIdentifier = `payments-e2e-${Date.now()}`;

// ============================================================================
// RESPONSE TYPE INTERFACES
// ============================================================================

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface InvoiceResponse {
  id: string;
  tenantId: string;
  customerId: string | null;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
}

interface PaymentResponse {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paymentDate: string;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    paymentStatus: PaymentStatus;
    customer?: {
      id: string;
      name: string;
    } | null;
  };
}

interface PaginatedPaymentsResponse {
  data: PaymentResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PaymentStatsResponse {
  totalPayments: number;
  totalReceived: number;
  averagePaymentValue: number;
  paymentsByMethod: Record<string, number>;
  todayPayments: number;
  todayTotal: number;
  weekPayments: number;
  weekTotal: number;
  pendingInvoicesCount: number;
  pendingAmount: number;
  overdueCount: number;
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
    InvoicesModule,
    PaymentsModule,
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

describe('Payments E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenant
  let tenant: { id: string; name: string; slug: string };

  // Test users
  let adminUser: { id: string; email: string; accessToken: string };
  let managerUser: { id: string; email: string; accessToken: string };
  let staffUser: { id: string; email: string; accessToken: string };

  // Test customer
  let customer: { id: string; name: string };

  // Test product
  let product: { id: string; name: string; sku: string };

  // Test invoices (created during setup)
  let invoiceForFullPayment: { id: string; invoiceNumber: string; total: number };
  let invoiceForPartialPayments: { id: string; invoiceNumber: string; total: number };
  let invoiceForMethods: { id: string; invoiceNumber: string; total: number };

  // Payment IDs tracked for later tests
  let partialPaymentId: string;
  let cashPaymentId: string;

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
        name: `Payment Test Tenant ${testIdentifier}`,
        slug: `payment-test-tenant-${testIdentifier}`,
        email: `payment-test-${testIdentifier}@test.com`,
        status: 'ACTIVE',
        plan: 'PRO',
        maxInvoices: 1000,
      },
    });

    // Create Admin User
    const adminRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin-${testIdentifier}@payment-test.com`,
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
        email: `manager-${testIdentifier}@payment-test.com`,
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
        email: `staff-${testIdentifier}@payment-test.com`,
        password: hashedPassword,
        firstName: 'Staff',
        lastName: 'User',
        role: UserRole.EMPLOYEE,
        status: 'ACTIVE',
      },
    });

    // Create Test Customer
    const createdCustomer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: `Test Customer ${testIdentifier}`,
        email: `customer-${testIdentifier}@test.com`,
        phone: '+1234567890',
        documentType: DocumentType.CC,
        documentNumber: `123456789-${testIdentifier}`,
      },
    });
    customer = { id: createdCustomer.id, name: createdCustomer.name };

    // Create Test Warehouse (required for invoice creation)
    await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        name: `Test Warehouse ${testIdentifier}`,
        code: `WH-${testIdentifier}`,
        isMain: true,
      },
    });

    // Create Test Product
    const createdProduct = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: `Test Product ${testIdentifier}`,
        sku: `TEST-PAY-001-${testIdentifier}`,
        description: 'Product for payment tests',
        salePrice: 100,
        costPrice: 50,
        stock: 1000,
        status: ProductStatus.ACTIVE,
      },
    });
    product = {
      id: createdProduct.id,
      name: createdProduct.name,
      sku: createdProduct.sku,
    };

    // Login users to get access tokens
    const loginResponseAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `admin-${testIdentifier}@payment-test.com`,
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
        email: `manager-${testIdentifier}@payment-test.com`,
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
        email: `staff-${testIdentifier}@payment-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyStaff = loginResponseStaff.body as LoginResponse;
    staffUser = {
      id: staffRecord.id,
      email: staffRecord.email,
      accessToken: loginBodyStaff.accessToken,
    };

    // Create invoices via API (so they go through proper business logic)
    // Invoice 1: For full payment test (total = 2*100 + 19% tax = 238)
    const inv1Response = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${adminUser.accessToken}`)
      .send({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 2, unitPrice: 100, taxRate: 19 }],
      })
      .expect(201);

    const inv1 = inv1Response.body as InvoiceResponse;

    // Send the invoice so payments can be recorded
    await request(app.getHttpServer())
      .patch(`/invoices/${inv1.id}/send`)
      .set('Authorization', `Bearer ${adminUser.accessToken}`)
      .expect(200);

    invoiceForFullPayment = { id: inv1.id, invoiceNumber: inv1.invoiceNumber, total: inv1.total };

    // Invoice 2: For partial payment tests (total = 5*100 + 19% tax = 595)
    const inv2Response = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${adminUser.accessToken}`)
      .send({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 5, unitPrice: 100, taxRate: 19 }],
      })
      .expect(201);

    const inv2 = inv2Response.body as InvoiceResponse;

    await request(app.getHttpServer())
      .patch(`/invoices/${inv2.id}/send`)
      .set('Authorization', `Bearer ${adminUser.accessToken}`)
      .expect(200);

    invoiceForPartialPayments = { id: inv2.id, invoiceNumber: inv2.invoiceNumber, total: inv2.total };

    // Invoice 3: For payment method tests (total = 10*100 + 19% tax = 1190)
    const inv3Response = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${adminUser.accessToken}`)
      .send({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 10, unitPrice: 100, taxRate: 19 }],
      })
      .expect(201);

    const inv3 = inv3Response.body as InvoiceResponse;

    await request(app.getHttpServer())
      .patch(`/invoices/${inv3.id}/send`)
      .set('Authorization', `Bearer ${adminUser.accessToken}`)
      .expect(200);

    invoiceForMethods = { id: inv3.id, invoiceNumber: inv3.invoiceNumber, total: inv3.total };
  }

  async function cleanupTestData() {
    if (!tenant?.id) return;

    // Delete payments
    await prisma.payment.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete stock movements
    await prisma.stockMovement.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete invoice items
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { tenantId: tenant.id } },
    });

    // Delete invoices
    await prisma.invoice.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete warehouse stocks
    await prisma.warehouseStock.deleteMany({
      where: { warehouse: { tenantId: tenant.id } },
    });

    // Delete warehouses
    await prisma.warehouse.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete products
    await prisma.product.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete customers
    await prisma.customer.deleteMany({
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
  // TEST: POST /payments - Create Payment (Full Payment)
  // ==========================================================================

  describe('POST /payments - Create Payment', () => {
    it('should create a full payment and update invoice to PAID', async () => {
      const paymentDto = {
        invoiceId: invoiceForFullPayment.id,
        amount: invoiceForFullPayment.total,
        method: PaymentMethod.CASH,
        reference: 'PAY-FULL-001',
        notes: 'Full payment in cash',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      const payment = response.body as PaymentResponse;

      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(invoiceForFullPayment.total);
      expect(payment.method).toBe(PaymentMethod.CASH);
      expect(payment.invoiceId).toBe(invoiceForFullPayment.id);
      expect(payment.reference).toBe('PAY-FULL-001');
      expect(payment.notes).toBe('Full payment in cash');
      expect(payment.paymentDate).toBeDefined();

      // Verify invoice paymentStatus changed to PAID
      const invoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceForFullPayment.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const updatedInvoice = invoiceResponse.body as InvoiceResponse;
      expect(updatedInvoice.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('should allow MANAGER to record a payment', async () => {
      const paymentDto = {
        invoiceId: invoiceForPartialPayments.id,
        amount: 100,
        method: PaymentMethod.CASH,
        reference: 'PAY-MGR-001',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      const payment = response.body as PaymentResponse;
      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(100);

      partialPaymentId = payment.id;
    });

    it('should NOT allow STAFF to record a payment (403 Forbidden)', async () => {
      const paymentDto = {
        invoiceId: invoiceForPartialPayments.id,
        amount: 50,
        method: PaymentMethod.CASH,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send(paymentDto)
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: Partial Payments and Status Transitions
  // ==========================================================================

  describe('Partial Payments and Status Transitions', () => {
    it('should set invoice to PARTIALLY_PAID after partial payment', async () => {
      // A partial payment was already recorded above (100 of 595)
      const invoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceForPartialPayments.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const invoice = invoiceResponse.body as InvoiceResponse;
      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);
    });

    it('should allow additional partial payment', async () => {
      const paymentDto = {
        invoiceId: invoiceForPartialPayments.id,
        amount: 200,
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'PAY-PARTIAL-002',
        notes: 'Second partial payment',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      const payment = response.body as PaymentResponse;
      expect(payment.amount).toBe(200);
      expect(payment.method).toBe(PaymentMethod.BANK_TRANSFER);

      // Invoice should still be PARTIALLY_PAID (300 of 595 paid)
      const invoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceForPartialPayments.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const invoice = invoiceResponse.body as InvoiceResponse;
      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);
    });

    it('should transition to PAID when remaining balance is paid', async () => {
      // Pay the remaining balance (595 - 100 - 200 = 295)
      const remainingBalance = Number(invoiceForPartialPayments.total) - 300;

      const paymentDto = {
        invoiceId: invoiceForPartialPayments.id,
        amount: remainingBalance,
        method: PaymentMethod.CREDIT_CARD,
        reference: 'PAY-FINAL-003',
        notes: 'Final payment',
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      // Invoice should now be PAID
      const invoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceForPartialPayments.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const invoice = invoiceResponse.body as InvoiceResponse;
      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
    });
  });

  // ==========================================================================
  // TEST: Payment Methods (CASH, BANK_TRANSFER, CREDIT_CARD)
  // ==========================================================================

  describe('Payment Methods', () => {
    it('should accept CASH payment method', async () => {
      const paymentDto = {
        invoiceId: invoiceForMethods.id,
        amount: 100,
        method: PaymentMethod.CASH,
        reference: 'CASH-001',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      const payment = response.body as PaymentResponse;
      expect(payment.method).toBe(PaymentMethod.CASH);

      cashPaymentId = payment.id;
    });

    it('should accept BANK_TRANSFER payment method', async () => {
      const paymentDto = {
        invoiceId: invoiceForMethods.id,
        amount: 100,
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'TXN-BANK-001',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      const payment = response.body as PaymentResponse;
      expect(payment.method).toBe(PaymentMethod.BANK_TRANSFER);
    });

    it('should accept CREDIT_CARD payment method', async () => {
      const paymentDto = {
        invoiceId: invoiceForMethods.id,
        amount: 100,
        method: PaymentMethod.CREDIT_CARD,
        reference: 'CC-AUTH-001',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      const payment = response.body as PaymentResponse;
      expect(payment.method).toBe(PaymentMethod.CREDIT_CARD);
    });
  });

  // ==========================================================================
  // TEST: POST /payments - Validation Errors
  // ==========================================================================

  describe('POST /payments - Validation Errors', () => {
    it('should reject payment with amount <= 0', async () => {
      const paymentDto = {
        invoiceId: invoiceForMethods.id,
        amount: 0,
        method: PaymentMethod.CASH,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(400);
    });

    it('should reject payment with negative amount', async () => {
      const paymentDto = {
        invoiceId: invoiceForMethods.id,
        amount: -50,
        method: PaymentMethod.CASH,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(400);
    });

    it('should reject payment with invalid invoiceId format', async () => {
      const paymentDto = {
        invoiceId: 'not-a-valid-cuid',
        amount: 100,
        method: PaymentMethod.CASH,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(400);
    });

    it('should reject payment with non-existent invoiceId', async () => {
      const paymentDto = {
        invoiceId: 'cm0nonexistent0invoice0000',
        amount: 100,
        method: PaymentMethod.CASH,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(404);
    });

    it('should reject payment that exceeds remaining balance', async () => {
      // invoiceForMethods has total 1190, already paid 300 (100+100+100)
      // Remaining = 890, try to pay more
      const paymentDto = {
        invoiceId: invoiceForMethods.id,
        amount: 1000,
        method: PaymentMethod.CASH,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(400);
    });

    it('should reject payment with invalid method', async () => {
      const paymentDto = {
        invoiceId: invoiceForMethods.id,
        amount: 50,
        method: 'BITCOIN',
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(400);
    });

    it('should reject payment with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({})
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: GET /payments - List Payments with Pagination
  // ==========================================================================

  describe('GET /payments - List Payments', () => {
    it('should list payments with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedPaymentsResponse;

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBeGreaterThan(0);
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments?page=1&limit=2')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedPaymentsResponse;

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
    });

    it('should filter payments by invoiceId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments?invoiceId=${invoiceForFullPayment.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedPaymentsResponse;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((payment) => {
        expect(payment.invoiceId).toBe(invoiceForFullPayment.id);
      });
    });

    it('should filter payments by method', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments?method=${PaymentMethod.CASH}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedPaymentsResponse;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((payment) => {
        expect(payment.method).toBe(PaymentMethod.CASH);
      });
    });

    it('should allow STAFF to list payments (read access)', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedPaymentsResponse;
      expect(result.data).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: GET /payments/:id - Get Single Payment
  // ==========================================================================

  describe('GET /payments/:id - Get Single Payment', () => {
    it('should get a payment with invoice details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments/${cashPaymentId}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const payment = response.body as PaymentResponse;

      expect(payment.id).toBe(cashPaymentId);
      expect(payment.method).toBe(PaymentMethod.CASH);
      expect(payment.invoice).toBeDefined();
      expect(payment.invoice!.id).toBe(invoiceForMethods.id);
      expect(payment.invoice!.invoiceNumber).toBeDefined();
    });

    it('should return 404 for non-existent payment', async () => {
      await request(app.getHttpServer())
        .get('/payments/cm0nonexistent0payment0000')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });

    it('should allow STAFF to view payment details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments/${cashPaymentId}`)
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const payment = response.body as PaymentResponse;
      expect(payment.id).toBe(cashPaymentId);
    });
  });

  // ==========================================================================
  // TEST: GET /payments/stats - Payment Statistics
  // ==========================================================================

  describe('GET /payments/stats - Payment Statistics', () => {
    it('should return payment statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/stats')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const stats = response.body as PaymentStatsResponse;

      expect(stats.totalPayments).toBeGreaterThan(0);
      expect(stats.totalReceived).toBeGreaterThan(0);
      expect(stats.averagePaymentValue).toBeGreaterThan(0);
      expect(stats.paymentsByMethod).toBeDefined();
      expect(typeof stats.todayPayments).toBe('number');
      expect(typeof stats.todayTotal).toBe('number');
      expect(typeof stats.weekPayments).toBe('number');
      expect(typeof stats.weekTotal).toBe('number');
      expect(typeof stats.pendingInvoicesCount).toBe('number');
      expect(typeof stats.pendingAmount).toBe('number');
      expect(typeof stats.overdueCount).toBe('number');
    });

    it('should include method breakdown in stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/stats')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const stats = response.body as PaymentStatsResponse;

      // We recorded payments with CASH, BANK_TRANSFER, and CREDIT_CARD
      expect(stats.paymentsByMethod['CASH']).toBeGreaterThan(0);
      expect(stats.paymentsByMethod['BANK_TRANSFER']).toBeGreaterThan(0);
      expect(stats.paymentsByMethod['CREDIT_CARD']).toBeGreaterThan(0);
    });

    it('should allow STAFF to view payment stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/stats')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const stats = response.body as PaymentStatsResponse;
      expect(stats.totalPayments).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // TEST: DELETE /payments/:id - Delete Payment
  // ==========================================================================

  describe('DELETE /payments/:id - Delete Payment', () => {
    it('should NOT allow MANAGER to delete a payment (ADMIN only)', async () => {
      await request(app.getHttpServer())
        .delete(`/payments/${partialPaymentId}`)
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .expect(403);
    });

    it('should NOT allow STAFF to delete a payment', async () => {
      await request(app.getHttpServer())
        .delete(`/payments/${partialPaymentId}`)
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent payment', async () => {
      await request(app.getHttpServer())
        .delete('/payments/cm0nonexistent0payment0000')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });

    it('should allow ADMIN to delete a payment and recalculate invoice status', async () => {
      // Create a fresh invoice and payment for this deletion test
      const invResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, unitPrice: 100, taxRate: 19 }],
        })
        .expect(201);

      const inv = invResponse.body as InvoiceResponse;

      await request(app.getHttpServer())
        .patch(`/invoices/${inv.id}/send`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      // Record a payment
      const payResponse = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          invoiceId: inv.id,
          amount: 50,
          method: PaymentMethod.CASH,
        })
        .expect(201);

      const createdPayment = payResponse.body as PaymentResponse;

      // Verify invoice is PARTIALLY_PAID
      const beforeDelete = await request(app.getHttpServer())
        .get(`/invoices/${inv.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      expect((beforeDelete.body as InvoiceResponse).paymentStatus).toBe(
        PaymentStatus.PARTIALLY_PAID,
      );

      // Delete the payment
      await request(app.getHttpServer())
        .delete(`/payments/${createdPayment.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(204);

      // Verify invoice reverted to UNPAID
      const afterDelete = await request(app.getHttpServer())
        .get(`/invoices/${inv.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      expect((afterDelete.body as InvoiceResponse).paymentStatus).toBe(
        PaymentStatus.UNPAID,
      );

      // Verify payment no longer exists
      await request(app.getHttpServer())
        .get(`/payments/${createdPayment.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: Authentication Required
  // ==========================================================================

  describe('Authentication Required', () => {
    it('should reject GET /payments without authentication', async () => {
      await request(app.getHttpServer()).get('/payments').expect(401);
    });

    it('should reject POST /payments without authentication', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .send({
          invoiceId: invoiceForMethods.id,
          amount: 50,
          method: PaymentMethod.CASH,
        })
        .expect(401);
    });

    it('should reject GET /payments/stats without authentication', async () => {
      await request(app.getHttpServer()).get('/payments/stats').expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
