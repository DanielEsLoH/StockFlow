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
import { DianModule } from '../src/dian';
import { InvoicesModule } from '../src/invoices';
import { ProductsModule } from '../src/products';
import { CustomersModule } from '../src/customers';
import {
  UserRole,
  ProductStatus,
  InvoiceStatus,
  DocumentType,
  DianDocumentStatus,
  DianDocumentType,
  CreditNoteReason,
  TaxResponsibility,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Unique identifier to avoid test data collision
const testIdentifier = `dian-e2e-${Date.now()}`;

// ============================================================================
// RESPONSE TYPE INTERFACES
// ============================================================================

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface DianConfigResponse {
  id: string;
  tenantId: string;
  nit: string;
  dv: string;
  businessName: string;
  tradeName?: string | null;
  taxResponsibilities: TaxResponsibility[];
  economicActivity: string;
  address: string;
  city: string;
  cityCode: string;
  department: string;
  departmentCode: string;
  email: string;
  testMode: boolean;
  hasSoftwareConfig: boolean;
  hasResolution: boolean;
  hasCertificate: boolean;
  resolutionNumber?: string | null;
  resolutionPrefix?: string | null;
  resolutionRangeFrom?: number | null;
  resolutionRangeTo?: number | null;
  currentNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface DianDocumentResponse {
  id: string;
  tenantId: string;
  invoiceId?: string | null;
  documentType: DianDocumentType;
  documentNumber: string;
  cufe?: string | null;
  cude?: string | null;
  qrCode?: string | null;
  status: DianDocumentStatus;
  dianResponse?: Record<string, any> | null;
  dianTrackId?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DianDocumentWithInvoiceResponse extends DianDocumentResponse {
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    customer?: {
      id: string;
      name: string;
      documentNumber: string;
    } | null;
  } | null;
}

interface PaginatedDianDocumentsResponse {
  data: DianDocumentWithInvoiceResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ProcessInvoiceResponse {
  success: boolean;
  documentId: string;
  cufe?: string;
  trackId?: string;
  status: DianDocumentStatus;
  message: string;
  errors?: string[];
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
    DianModule,
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

describe('DIAN E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenant
  let tenant: { id: string; name: string; slug: string };

  // Test users
  let adminUser: { id: string; email: string; accessToken: string };
  let managerUser: { id: string; email: string; accessToken: string };
  let staffUser: { id: string; email: string; accessToken: string };

  // Test customer
  let customer: { id: string; name: string; documentNumber: string };

  // Test product
  let product: { id: string; name: string; sku: string };

  // Test invoice
  let invoice: { id: string; invoiceNumber: string };

  // DIAN artifacts created during tests
  let dianConfigId: string;
  let dianDocumentId: string;

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
  }, 60_000);

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  // ==========================================================================
  // TEST DATA SETUP
  // ==========================================================================

  async function setupTestData() {
    // Create Test Tenant
    tenant = await prisma.tenant.create({
      data: {
        name: `DIAN Test Tenant ${testIdentifier}`,
        slug: `dian-test-tenant-${testIdentifier}`,
        email: `dian-test-${testIdentifier}@test.com`,
        status: 'ACTIVE',
        plan: 'PRO',
        maxInvoices: 1000,
      },
    });

    // Create Admin User
    const adminRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin-${testIdentifier}@dian-test.com`,
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
        email: `manager-${testIdentifier}@dian-test.com`,
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
        email: `staff-${testIdentifier}@dian-test.com`,
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
        phone: '+573001234567',
        documentType: DocumentType.NIT,
        documentNumber: `900123456-${testIdentifier}`,
      },
    });
    customer = {
      id: createdCustomer.id,
      name: createdCustomer.name,
      documentNumber: createdCustomer.documentNumber,
    };

    // Create Test Product
    const createdProduct = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: `Test Product ${testIdentifier}`,
        sku: `DIAN-PROD-001-${testIdentifier}`,
        description: 'Product for DIAN testing',
        salePrice: 100_000,
        costPrice: 50_000,
        stock: 100,
        status: ProductStatus.ACTIVE,
      },
    });
    product = {
      id: createdProduct.id,
      name: createdProduct.name,
      sku: createdProduct.sku,
    };

    // Create Test Invoice via Prisma (SENT status for DIAN processing)
    const createdInvoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        userId: adminRecord.id,
        invoiceNumber: `FE-${testIdentifier}-001`,
        subtotal: 200_000,
        tax: 38_000,
        discount: 0,
        total: 238_000,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: InvoiceStatus.SENT,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 2,
              unitPrice: 100_000,
              taxRate: 19,
              discount: 0,
              subtotal: 200_000,
              tax: 38_000,
              total: 238_000,
            },
          ],
        },
      },
    });
    invoice = {
      id: createdInvoice.id,
      invoiceNumber: createdInvoice.invoiceNumber,
    };

    // Login users to get access tokens
    const loginResponseAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `admin-${testIdentifier}@dian-test.com`,
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
        email: `manager-${testIdentifier}@dian-test.com`,
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
        email: `staff-${testIdentifier}@dian-test.com`,
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

    // Delete DIAN documents
    await prisma.dianDocument.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete DIAN config
    await prisma.tenantDianConfig.deleteMany({
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
  // TEST: Validation - Send invoice without DIAN config
  // ==========================================================================

  describe('DIAN Configuration Validation', () => {
    it('should fail to send invoice when DIAN config does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/dian/send')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ invoiceId: invoice.id })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return null when no config exists', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      // API may return null, empty object, or empty string
      const body = response.body;
      expect(
        body === null || body === '' || (typeof body === 'object' && Object.keys(body).length === 0),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // TEST: POST /dian/config - Create DIAN Configuration
  // ==========================================================================

  describe('POST /dian/config - Create DIAN Configuration', () => {
    it('should create DIAN config successfully as admin', async () => {
      const createDto = {
        nit: '900123456',
        dv: '1',
        businessName: `Test Company ${testIdentifier} S.A.S.`,
        tradeName: `Test Shop ${testIdentifier}`,
        taxResponsibilities: [TaxResponsibility.O_13],
        economicActivity: '4711',
        address: 'Calle 100 # 10-20',
        city: 'Bogota D.C.',
        cityCode: '11001',
        department: 'Bogota D.C.',
        departmentCode: '11',
        postalCode: '110111',
        phone: '+573001234567',
        email: `dian-${testIdentifier}@test.com`,
        testMode: true,
      };

      const response = await request(app.getHttpServer())
        .post('/dian/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as DianConfigResponse;
      expect(body.nit).toBe('900123456');
      expect(body.dv).toBe('1');
      expect(body.businessName).toContain(testIdentifier);
      expect(body.testMode).toBe(true);
      expect(body.hasSoftwareConfig).toBe(false);
      expect(body.hasResolution).toBe(false);
      expect(body.hasCertificate).toBe(false);

      dianConfigId = body.id;
    });

    it('should reject DIAN config creation from EMPLOYEE role', async () => {
      await request(app.getHttpServer())
        .post('/dian/config')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send({
          nit: '900123456',
          dv: '1',
          businessName: 'Unauthorized Company',
          taxResponsibilities: [TaxResponsibility.O_13],
          economicActivity: '4711',
          address: 'Calle 1',
          city: 'Bogota',
          cityCode: '11001',
          department: 'Bogota',
          departmentCode: '11',
          email: 'unauth@test.com',
        })
        .expect(403);
    });

    it('should reject DIAN config with invalid NIT format', async () => {
      await request(app.getHttpServer())
        .post('/dian/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          nit: 'INVALID',
          dv: '1',
          businessName: 'Bad Config Company',
          taxResponsibilities: [TaxResponsibility.O_13],
          economicActivity: '4711',
          address: 'Calle 1',
          city: 'Bogota',
          cityCode: '11001',
          department: 'Bogota',
          departmentCode: '11',
          email: 'bad@test.com',
        })
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: GET /dian/config - Get DIAN Configuration
  // ==========================================================================

  describe('GET /dian/config - Get DIAN Configuration', () => {
    it('should return DIAN config for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as DianConfigResponse;
      expect(body.nit).toBe('900123456');
      expect(body.businessName).toContain(testIdentifier);
      expect(body.testMode).toBe(true);
    });

    it('should return DIAN config for manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/config')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .expect(200);

      const body = response.body as DianConfigResponse;
      expect(body.nit).toBe('900123456');
    });

    it('should reject DIAN config access from EMPLOYEE role', async () => {
      await request(app.getHttpServer())
        .get('/dian/config')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: POST /dian/config/software - Set Software Credentials
  // ==========================================================================

  describe('POST /dian/config/software - Set Software Credentials', () => {
    it('should set software credentials successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/dian/config/software')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          softwareId: `soft-id-${testIdentifier}`,
          softwarePin: '12345',
          technicalKey: `tech-key-${testIdentifier}`,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should verify software config is now set', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as DianConfigResponse;
      expect(body.hasSoftwareConfig).toBe(true);
    });
  });

  // ==========================================================================
  // TEST: POST /dian/config/resolution - Set Resolution
  // ==========================================================================

  describe('POST /dian/config/resolution - Set Resolution', () => {
    it('should set resolution successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/dian/config/resolution')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          resolutionNumber: '18760000001',
          resolutionDate: '2024-01-01',
          resolutionPrefix: 'SETT',
          resolutionRangeFrom: 1,
          resolutionRangeTo: 5000,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should verify resolution is now configured', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as DianConfigResponse;
      expect(body.hasResolution).toBe(true);
      expect(body.resolutionNumber).toBe('18760000001');
      expect(body.resolutionPrefix).toBe('SETT');
      expect(body.resolutionRangeFrom).toBe(1);
      expect(body.resolutionRangeTo).toBe(5000);
    });
  });

  // ==========================================================================
  // TEST: PUT /dian/config - Update DIAN Configuration
  // ==========================================================================

  describe('PUT /dian/config - Update DIAN Configuration', () => {
    it('should update DIAN config successfully', async () => {
      const response = await request(app.getHttpServer())
        .put('/dian/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          tradeName: `Updated Shop ${testIdentifier}`,
          phone: '+573009876543',
        })
        .expect(200);

      const body = response.body as DianConfigResponse;
      expect(body.tradeName).toBe(`Updated Shop ${testIdentifier}`);
    });
  });

  // ==========================================================================
  // TEST: POST /dian/config/notes - Set Note Configuration
  // ==========================================================================

  describe('POST /dian/config/notes - Set Note Configuration', () => {
    it('should set note configuration successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/dian/config/notes')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          creditNotePrefix: 'NC',
          creditNoteStartNumber: 1,
          debitNotePrefix: 'ND',
          debitNoteStartNumber: 1,
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: POST /dian/send - Process Invoice for DIAN
  // ==========================================================================

  describe('POST /dian/send - Process Invoice for DIAN', () => {
    it('should process and send invoice to DIAN successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/dian/send')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ invoiceId: invoice.id })
        .expect(200);

      const body = response.body as ProcessInvoiceResponse;
      expect(body.documentId).toBeDefined();
      expect(body.cufe).toBeDefined();
      expect(body.cufe).not.toBe('');
      expect(body.status).toBeDefined();
      expect(body.message).toBeDefined();

      dianDocumentId = body.documentId;
    });

    it('should allow manager to process invoice', async () => {
      // Create a second invoice for manager to process
      const secondInvoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          userId: managerUser.id,
          invoiceNumber: `FE-${testIdentifier}-002`,
          subtotal: 100_000,
          tax: 19_000,
          discount: 0,
          total: 119_000,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.SENT,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: 100_000,
                taxRate: 19,
                discount: 0,
                subtotal: 100_000,
                tax: 19_000,
                total: 119_000,
              },
            ],
          },
        },
      });

      const response = await request(app.getHttpServer())
        .post('/dian/send')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send({ invoiceId: secondInvoice.id })
        .expect(200);

      const body = response.body as ProcessInvoiceResponse;
      expect(body.documentId).toBeDefined();
      expect(body.cufe).toBeDefined();
    });

    it('should reject processing from EMPLOYEE role', async () => {
      await request(app.getHttpServer())
        .post('/dian/send')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send({ invoiceId: invoice.id })
        .expect(403);
    });

    it('should return 404 for non-existent invoice', async () => {
      await request(app.getHttpServer())
        .post('/dian/send')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ invoiceId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('should reject sending without invoiceId', async () => {
      await request(app.getHttpServer())
        .post('/dian/send')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({})
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: GET /dian/documents - List DIAN Documents
  // ==========================================================================

  describe('GET /dian/documents - List DIAN Documents', () => {
    it('should list DIAN documents with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/documents')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedDianDocumentsResponse;
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.meta).toBeDefined();
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter documents by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/documents')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ status: DianDocumentStatus.GENERATED })
        .expect(200);

      const body = response.body as PaginatedDianDocumentsResponse;
      expect(body.data).toBeDefined();
    });

    it('should filter documents by document type', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/documents')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ documentType: DianDocumentType.FACTURA_ELECTRONICA })
        .expect(200);

      const body = response.body as PaginatedDianDocumentsResponse;
      expect(body.data).toBeDefined();
    });

    it('should allow manager to list documents', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/documents')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .expect(200);

      const body = response.body as PaginatedDianDocumentsResponse;
      expect(body.data).toBeDefined();
    });

    it('should reject listing from EMPLOYEE role', async () => {
      await request(app.getHttpServer())
        .get('/dian/documents')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: GET /dian/documents/:id - Get DIAN Document Details
  // ==========================================================================

  describe('GET /dian/documents/:id - Get Document Details', () => {
    it('should return document details with invoice info', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dian/documents/${dianDocumentId}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as DianDocumentWithInvoiceResponse;
      expect(body.id).toBe(dianDocumentId);
      expect(body.invoiceId).toBe(invoice.id);
      expect(body.documentType).toBe(DianDocumentType.FACTURA_ELECTRONICA);
      expect(body.cufe).toBeDefined();
      expect(body.cufe).not.toBe('');
      expect(body.documentNumber).toBeDefined();
    });

    it('should return 404 for non-existent document', async () => {
      await request(app.getHttpServer())
        .get('/dian/documents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: GET /dian/documents/:id/xml - Download XML
  // ==========================================================================

  describe('GET /dian/documents/:id/xml - Download Document XML', () => {
    it('should download XML for a DIAN document', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dian/documents/${dianDocumentId}/xml`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/xml');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
      // Verify it is valid XML content
      expect(response.text).toContain('<?xml');
    });
  });

  // ==========================================================================
  // TEST: GET /dian/stats - Get Statistics
  // ==========================================================================

  describe('GET /dian/stats - Get DIAN Statistics', () => {
    it('should return DIAN statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/dian/stats')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: POST /dian/documents/:id/events - Send DIAN Event
  // ==========================================================================

  describe('POST /dian/documents/:id/events - Send DIAN Event', () => {
    it('should send acuse de recibo event (030)', async () => {
      // First, make the document ACCEPTED so events can be sent
      await prisma.dianDocument.update({
        where: { id: dianDocumentId },
        data: { status: DianDocumentStatus.ACCEPTED, acceptedAt: new Date() },
      });

      const response = await request(app.getHttpServer())
        .post(`/dian/documents/${dianDocumentId}/events`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ eventCode: '030' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should reject event with invalid event code', async () => {
      await request(app.getHttpServer())
        .post(`/dian/documents/${dianDocumentId}/events`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ eventCode: '999' })
        .expect(400);
    });

    it('should return 404 for event on non-existent document', async () => {
      await request(app.getHttpServer())
        .post('/dian/documents/00000000-0000-0000-0000-000000000000/events')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ eventCode: '030' })
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: POST /dian/credit-note - Create Credit Note
  // ==========================================================================

  describe('POST /dian/credit-note - Create Credit Note', () => {
    it('should create a credit note for an accepted invoice', async () => {
      const response = await request(app.getHttpServer())
        .post('/dian/credit-note')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          invoiceId: invoice.id,
          reasonCode: CreditNoteReason.DEVOLUCION_PARCIAL,
          reason: 'Producto defectuoso',
          description: 'Devolucion por defecto de fabrica',
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.documentId).toBeDefined();
    });

    it('should reject credit note from EMPLOYEE role', async () => {
      await request(app.getHttpServer())
        .post('/dian/credit-note')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send({
          invoiceId: invoice.id,
          reasonCode: CreditNoteReason.ANULACION,
          reason: 'Anulacion completa',
        })
        .expect(403);
    });

    it('should return 404 for credit note on non-existent invoice', async () => {
      await request(app.getHttpServer())
        .post('/dian/credit-note')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          invoiceId: '00000000-0000-0000-0000-000000000000',
          reasonCode: CreditNoteReason.ANULACION,
          reason: 'Anulacion',
        })
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: POST /dian/check-status - Check Document Status
  // ==========================================================================

  describe('POST /dian/check-status - Check Document Status', () => {
    it('should check status of a DIAN document', async () => {
      const response = await request(app.getHttpServer())
        .post('/dian/check-status')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ documentId: dianDocumentId })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 404 for non-existent document status check', async () => {
      await request(app.getHttpServer())
        .post('/dian/check-status')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ documentId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: Unauthenticated access
  // ==========================================================================

  describe('Unauthenticated Access', () => {
    it('should reject unauthenticated access to GET /dian/config', async () => {
      await request(app.getHttpServer())
        .get('/dian/config')
        .expect(401);
    });

    it('should reject unauthenticated access to POST /dian/send', async () => {
      await request(app.getHttpServer())
        .post('/dian/send')
        .send({ invoiceId: invoice.id })
        .expect(401);
    });

    it('should reject unauthenticated access to GET /dian/documents', async () => {
      await request(app.getHttpServer())
        .get('/dian/documents')
        .expect(401);
    });
  });
});
