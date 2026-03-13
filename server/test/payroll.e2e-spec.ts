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
import { PayrollModule } from '../src/payroll/payroll.module';
import {
  UserRole,
  ContractType,
  SalaryType,
  ARLRiskLevel,
  EmployeeStatus,
  PayrollPeriodType,
  PayrollPeriodStatus,
  PayrollEntryStatus,
  DocumentType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Unique identifier to avoid test data collision
const testSuffix = Date.now().toString().slice(-8);
const testIdentifier = `pay-${testSuffix}`;

// ============================================================================
// RESPONSE TYPE INTERFACES
// ============================================================================

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface EmployeeResponse {
  id: string;
  tenantId: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  contractType: string;
  salaryType: string;
  baseSalary: number;
  auxilioTransporte: boolean;
  arlRiskLevel: string;
  epsName: string | null;
  afpName: string | null;
  cajaName: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedEmployeesResponse {
  data: EmployeeResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PayrollPeriodResponse {
  id: string;
  tenantId: string;
  name: string;
  periodType: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  status: string;
  totalDevengados: number;
  totalDeducciones: number;
  totalNeto: number;
  employeeCount: number;
  approvedAt: string | null;
  approvedById: string | null;
  notes: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PayrollPeriodDetailResponse extends PayrollPeriodResponse {
  entries: PayrollEntryListItem[];
}

interface PayrollEntryListItem {
  id: string;
  entryNumber: string;
  status: string;
  employeeId: string;
  employeeName: string | null;
  employeeDocument: string | null;
  baseSalary: number;
  daysWorked: number;
  totalDevengados: number;
  totalDeducciones: number;
  totalNeto: number;
}

interface PayrollEntryDetailResponse {
  id: string;
  entryNumber: string;
  status: string;
  periodId: string;
  periodName: string | null;
  employeeId: string;
  employee: {
    name: string;
    documentNumber: string;
    documentType: string;
    contractType: string;
    salaryType: string;
    arlRiskLevel: string;
    epsName: string | null;
    afpName: string | null;
    cajaName: string | null;
  } | null;
  baseSalary: number;
  daysWorked: number;
  sueldo: number;
  auxilioTransporte: number;
  horasExtras: number;
  bonificaciones: number;
  comisiones: number;
  viaticos: number;
  incapacidad: number;
  licencia: number;
  vacaciones: number;
  otrosDevengados: number;
  totalDevengados: number;
  saludEmpleado: number;
  pensionEmpleado: number;
  fondoSolidaridad: number;
  retencionFuente: number;
  sindicato: number;
  libranzas: number;
  otrasDeducciones: number;
  totalDeducciones: number;
  saludEmpleador: number;
  pensionEmpleador: number;
  arlEmpleador: number;
  cajaEmpleador: number;
  senaEmpleador: number;
  icbfEmpleador: number;
  provisionPrima: number;
  provisionCesantias: number;
  provisionIntereses: number;
  provisionVacaciones: number;
  totalNeto: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedPeriodsResponse {
  data: PayrollPeriodResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PayrollConfigResponse {
  id: string;
  tenantId: string;
  smmlv: number;
  auxilioTransporteVal: number;
  uvtValue: number;
  defaultPeriodType: string;
  payrollPrefix: string | null;
  payrollCurrentNumber: number | null;
  createdAt: string;
  updatedAt: string;
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
    PayrollModule,
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

describe('Payroll E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenant
  let tenant: { id: string; name: string; slug: string };

  // Test users
  let adminUser: { id: string; email: string; accessToken: string };
  let managerUser: { id: string; email: string; accessToken: string };
  let staffUser: { id: string; email: string; accessToken: string };

  // Payroll artifacts created during tests
  let employee1: { id: string; documentNumber: string };
  let employee2: { id: string; documentNumber: string };
  let payrollPeriod: { id: string; name: string };
  let payrollEntryId: string;

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
    // Create Test Tenant with high limits
    tenant = await prisma.tenant.create({
      data: {
        name: `Payroll Test Tenant ${testIdentifier}`,
        slug: `payroll-test-tenant-${testIdentifier}`,
        email: `payroll-test-${testIdentifier}@test.com`,
        status: 'ACTIVE',
        plan: 'PRO',
        maxInvoices: 1000,
      },
    });

    // Create Admin User
    const adminRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin-${testIdentifier}@payroll-test.com`,
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
        email: `manager-${testIdentifier}@payroll-test.com`,
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
        email: `staff-${testIdentifier}@payroll-test.com`,
        password: hashedPassword,
        firstName: 'Staff',
        lastName: 'User',
        role: UserRole.EMPLOYEE,
        status: 'ACTIVE',
      },
    });

    // Login users to get access tokens
    const loginResponseAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `admin-${testIdentifier}@payroll-test.com`,
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
        email: `manager-${testIdentifier}@payroll-test.com`,
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
        email: `staff-${testIdentifier}@payroll-test.com`,
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

    // Delete payroll entries
    await prisma.payrollEntry.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete payroll periods
    await prisma.payrollPeriod.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete payroll config
    await prisma.payrollConfig.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete employees
    await prisma.employee.deleteMany({
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
  // TEST: POST /payroll/config - Create Payroll Config
  // ==========================================================================

  describe('POST /payroll/config - Create Payroll Configuration', () => {
    it('should create payroll configuration successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/payroll/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          smmlv: 1_423_500,
          auxilioTransporteVal: 200_000,
          uvtValue: 49_799,
          defaultPeriodType: PayrollPeriodType.MONTHLY,
        })
        .expect(201);

      const body = response.body as PayrollConfigResponse;
      expect(body.smmlv).toBe(1_423_500);
      expect(body.auxilioTransporteVal).toBe(200_000);
      expect(body.uvtValue).toBe(49_799);
    });
  });

  // ==========================================================================
  // TEST: GET /payroll/config - Get Payroll Config
  // ==========================================================================

  describe('GET /payroll/config - Get Payroll Configuration', () => {
    it('should return payroll configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/payroll/config')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as PayrollConfigResponse;
      expect(body.smmlv).toBe(1_423_500);
      expect(body.auxilioTransporteVal).toBe(200_000);
    });
  });

  // ==========================================================================
  // TEST: POST /payroll/employees - Create Employee
  // ==========================================================================

  describe('POST /payroll/employees - Create Employee', () => {
    it('should create first employee with minimum salary (gets auxilio transporte)', async () => {
      const response = await request(app.getHttpServer())
        .post('/payroll/employees')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          documentType: DocumentType.CC,
          documentNumber: `EMP001-${testIdentifier}`,
          firstName: 'Juan',
          lastName: 'Perez',
          email: `juan-${testIdentifier}@test.com`,
          phone: '3001234567',
          address: 'Calle 50 # 20-30',
          city: 'Bogota',
          cityCode: '11001',
          department: 'Bogota D.C.',
          departmentCode: '11',
          contractType: ContractType.TERMINO_INDEFINIDO,
          salaryType: SalaryType.ORDINARIO,
          baseSalary: 1_423_500,
          arlRiskLevel: ARLRiskLevel.LEVEL_I,
          epsName: 'Sura EPS',
          epsCode: 'EPS001',
          afpName: 'Proteccion',
          afpCode: 'AFP001',
          cajaName: 'Compensar',
          cajaCode: 'CCF001',
          startDate: '2026-01-15',
        })
        .expect(201);

      const body = response.body as EmployeeResponse;
      expect(body.id).toBeDefined();
      expect(body.firstName).toBe('Juan');
      expect(body.lastName).toBe('Perez');
      expect(body.baseSalary).toBe(1_423_500);
      expect(body.auxilioTransporte).toBe(true);
      expect(body.contractType).toBe(ContractType.TERMINO_INDEFINIDO);
      expect(body.status).toBe(EmployeeStatus.ACTIVE);

      employee1 = {
        id: body.id,
        documentNumber: body.documentNumber,
      };
    });

    it('should create second employee with high salary (no auxilio transporte)', async () => {
      const response = await request(app.getHttpServer())
        .post('/payroll/employees')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          documentType: DocumentType.CC,
          documentNumber: `EMP002-${testIdentifier}`,
          firstName: 'Maria',
          lastName: 'Garcia',
          email: `maria-${testIdentifier}@test.com`,
          phone: '3009876543',
          contractType: ContractType.TERMINO_FIJO,
          salaryType: SalaryType.ORDINARIO,
          baseSalary: 5_000_000,
          arlRiskLevel: ARLRiskLevel.LEVEL_II,
          epsName: 'Nueva EPS',
          epsCode: 'EPS002',
          afpName: 'Porvenir',
          afpCode: 'AFP002',
          startDate: '2026-01-01',
        })
        .expect(201);

      const body = response.body as EmployeeResponse;
      expect(body.id).toBeDefined();
      expect(body.firstName).toBe('Maria');
      expect(body.baseSalary).toBe(5_000_000);
      expect(body.auxilioTransporte).toBe(false);

      employee2 = {
        id: body.id,
        documentNumber: body.documentNumber,
      };
    });

    it('should reject duplicate document number', async () => {
      await request(app.getHttpServer())
        .post('/payroll/employees')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          documentNumber: `EMP001-${testIdentifier}`,
          firstName: 'Duplicate',
          lastName: 'Employee',
          contractType: ContractType.TERMINO_INDEFINIDO,
          baseSalary: 1_423_500,
          startDate: '2026-02-01',
        })
        .expect(409);
    });

    it('should reject employee creation without required fields', async () => {
      await request(app.getHttpServer())
        .post('/payroll/employees')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          firstName: 'Missing',
        })
        .expect(400);
    });

    it('should reject employee creation from EMPLOYEE role', async () => {
      await request(app.getHttpServer())
        .post('/payroll/employees')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send({
          documentNumber: `EMP003-${testIdentifier}`,
          firstName: 'Unauthorized',
          lastName: 'Employee',
          contractType: ContractType.TERMINO_INDEFINIDO,
          baseSalary: 1_423_500,
          startDate: '2026-02-01',
        })
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: GET /payroll/employees - List Employees
  // ==========================================================================

  describe('GET /payroll/employees - List Employees', () => {
    it('should list employees with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/payroll/employees')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedEmployeesResponse;
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.meta.total).toBe(2);
      expect(body.meta.page).toBe(1);
    });

    it('should filter employees by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/payroll/employees')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ status: EmployeeStatus.ACTIVE })
        .expect(200);

      const body = response.body as PaginatedEmployeesResponse;
      expect(body.data.length).toBe(2);
      expect(body.data.every((e) => e.status === EmployeeStatus.ACTIVE)).toBe(
        true,
      );
    });

    it('should search employees by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/payroll/employees')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ search: 'Juan' })
        .expect(200);

      const body = response.body as PaginatedEmployeesResponse;
      expect(body.data.length).toBe(1);
      expect(body.data[0].firstName).toBe('Juan');
    });

    it('should reject listing from EMPLOYEE role', async () => {
      await request(app.getHttpServer())
        .get('/payroll/employees')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: GET /payroll/employees/:id - Get Employee Details
  // ==========================================================================

  describe('GET /payroll/employees/:id - Get Employee Details', () => {
    it('should return employee details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payroll/employees/${employee1.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as EmployeeResponse;
      expect(body.id).toBe(employee1.id);
      expect(body.firstName).toBe('Juan');
      expect(body.lastName).toBe('Perez');
      expect(body.baseSalary).toBe(1_423_500);
      expect(body.auxilioTransporte).toBe(true);
      expect(body.epsName).toBe('Sura EPS');
      expect(body.afpName).toBe('Proteccion');
    });

    it('should return 404 for non-existent employee', async () => {
      await request(app.getHttpServer())
        .get('/payroll/employees/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: PUT /payroll/employees/:id - Update Employee
  // ==========================================================================

  describe('PUT /payroll/employees/:id - Update Employee', () => {
    it('should update employee details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/payroll/employees/${employee1.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          phone: '3005551234',
          bankName: 'Bancolombia',
          bankAccountType: 'AHORROS',
          bankAccountNumber: '12345678901',
        })
        .expect(200);

      const body = response.body as EmployeeResponse;
      expect(body.phone).toBe('3005551234');
    });
  });

  // ==========================================================================
  // TEST: POST /payroll/periods - Create Payroll Period
  // ==========================================================================

  describe('POST /payroll/periods - Create Payroll Period', () => {
    it('should create a monthly payroll period', async () => {
      const response = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          name: `Nomina Marzo 2026 ${testIdentifier}`,
          periodType: PayrollPeriodType.MONTHLY,
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          paymentDate: '2026-04-05',
          notes: 'Periodo de prueba E2E',
        })
        .expect(201);

      const body = response.body as PayrollPeriodResponse;
      expect(body.id).toBeDefined();
      expect(body.name).toContain('Nomina Marzo 2026');
      expect(body.periodType).toBe(PayrollPeriodType.MONTHLY);
      expect(body.status).toBe(PayrollPeriodStatus.OPEN);
      expect(body.totalDevengados).toBe(0);
      expect(body.totalDeducciones).toBe(0);
      expect(body.totalNeto).toBe(0);

      payrollPeriod = { id: body.id, name: body.name };
    });

    it('should reject overlapping payroll period', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          name: `Overlapping Period ${testIdentifier}`,
          periodType: PayrollPeriodType.MONTHLY,
          startDate: '2026-03-15',
          endDate: '2026-04-15',
          paymentDate: '2026-04-20',
        })
        .expect(400);
    });

    it('should reject period with end date before start date', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          name: `Invalid Period ${testIdentifier}`,
          periodType: PayrollPeriodType.MONTHLY,
          startDate: '2026-05-31',
          endDate: '2026-05-01',
          paymentDate: '2026-06-05',
        })
        .expect(400);
    });

    it('should reject period creation from EMPLOYEE role', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send({
          name: `Unauthorized Period ${testIdentifier}`,
          periodType: PayrollPeriodType.MONTHLY,
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          paymentDate: '2026-07-05',
        })
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: GET /payroll/periods - List Periods
  // ==========================================================================

  describe('GET /payroll/periods - List Payroll Periods', () => {
    it('should list payroll periods with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/payroll/periods')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedPeriodsResponse;
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.meta.total).toBe(1);
    });

    it('should allow manager to list periods', async () => {
      const response = await request(app.getHttpServer())
        .get('/payroll/periods')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .expect(200);

      const body = response.body as PaginatedPeriodsResponse;
      expect(body.data.length).toBe(1);
    });
  });

  // ==========================================================================
  // TEST: GET /payroll/periods/:id - Get Period Details
  // ==========================================================================

  describe('GET /payroll/periods/:id - Get Period Details', () => {
    it('should return period details with entries', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payroll/periods/${payrollPeriod.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as PayrollPeriodDetailResponse;
      expect(body.id).toBe(payrollPeriod.id);
      expect(body.name).toContain('Nomina Marzo 2026');
      expect(body.entries).toBeDefined();
      expect(Array.isArray(body.entries)).toBe(true);
    });

    it('should return 404 for non-existent period', async () => {
      await request(app.getHttpServer())
        .get('/payroll/periods/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: POST /payroll/periods/:id/calculate - Calculate Payroll
  // ==========================================================================

  describe('POST /payroll/periods/:id/calculate - Calculate Payroll', () => {
    it('should calculate payroll for all active employees', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payroll/periods/${payrollPeriod.id}/calculate`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(201);

      const body = response.body as PayrollPeriodDetailResponse;
      expect(body.status).toBe(PayrollPeriodStatus.CALCULATED);
      expect(body.entries).toBeDefined();
      expect(body.entries.length).toBe(2);
      expect(body.totalDevengados).toBeGreaterThan(0);
      expect(body.totalDeducciones).toBeGreaterThan(0);
      expect(body.totalNeto).toBeGreaterThan(0);
      expect(body.employeeCount).toBe(2);

      // Verify each entry was calculated
      for (const entry of body.entries) {
        expect(entry.status).toBe(PayrollEntryStatus.CALCULATED);
        expect(entry.totalDevengados).toBeGreaterThan(0);
        expect(entry.totalDeducciones).toBeGreaterThan(0);
        expect(entry.totalNeto).toBeGreaterThan(0);
      }

      // Store first entry ID for later tests
      payrollEntryId = body.entries[0].id;
    });

    it('should allow recalculation of already calculated period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payroll/periods/${payrollPeriod.id}/calculate`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(201);

      const body = response.body as PayrollPeriodDetailResponse;
      expect(body.status).toBe(PayrollPeriodStatus.CALCULATED);
      expect(body.entries.length).toBe(2);
    });
  });

  // ==========================================================================
  // TEST: GET /payroll/entries/:id - Get Payroll Entry Detail
  // ==========================================================================

  describe('GET /payroll/entries/:id - Get Payroll Entry Detail', () => {
    it('should return detailed payroll entry with Colombian deduction rates', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payroll/entries/${payrollEntryId}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as PayrollEntryDetailResponse;
      expect(body.id).toBe(payrollEntryId);
      expect(body.status).toBe(PayrollEntryStatus.CALCULATED);
      expect(body.employee).toBeDefined();
      expect(body.baseSalary).toBeGreaterThan(0);
      expect(body.daysWorked).toBeGreaterThan(0);

      // Verify devengados
      expect(body.sueldo).toBeGreaterThan(0);
      expect(body.totalDevengados).toBeGreaterThan(0);

      // Verify Colombian payroll deduction rates
      // Salud empleado: 4% of base salary (proportional to days worked)
      expect(body.saludEmpleado).toBeGreaterThan(0);
      // Pension empleado: 4% of base salary (proportional to days worked)
      expect(body.pensionEmpleado).toBeGreaterThan(0);

      // Verify employer contributions exist
      expect(body.saludEmpleador).toBeGreaterThan(0);
      expect(body.pensionEmpleador).toBeGreaterThan(0);
      expect(body.arlEmpleador).toBeGreaterThanOrEqual(0);
      expect(body.cajaEmpleador).toBeGreaterThanOrEqual(0);

      // Verify provisions
      expect(body.provisionPrima).toBeGreaterThanOrEqual(0);
      expect(body.provisionCesantias).toBeGreaterThanOrEqual(0);
      expect(body.provisionVacaciones).toBeGreaterThanOrEqual(0);

      // Verify totals are consistent
      expect(body.totalNeto).toBe(body.totalDevengados - body.totalDeducciones);
    });

    it('should verify minimum wage employee gets auxilio de transporte', async () => {
      // Find the entry for employee1 (minimum wage)
      const periodResponse = await request(app.getHttpServer())
        .get(`/payroll/periods/${payrollPeriod.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const periodBody = periodResponse.body as PayrollPeriodDetailResponse;
      const minWageEntry = periodBody.entries.find(
        (e) => e.employeeId === employee1.id,
      );
      expect(minWageEntry).toBeDefined();

      // Get full detail of this entry
      const entryResponse = await request(app.getHttpServer())
        .get(`/payroll/entries/${minWageEntry!.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const entryBody = entryResponse.body as PayrollEntryDetailResponse;
      expect(entryBody.auxilioTransporte).toBeGreaterThan(0);
    });

    it('should verify high salary employee does NOT get auxilio de transporte', async () => {
      const periodResponse = await request(app.getHttpServer())
        .get(`/payroll/periods/${payrollPeriod.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const periodBody = periodResponse.body as PayrollPeriodDetailResponse;
      const highSalaryEntry = periodBody.entries.find(
        (e) => e.employeeId === employee2.id,
      );
      expect(highSalaryEntry).toBeDefined();

      const entryResponse = await request(app.getHttpServer())
        .get(`/payroll/entries/${highSalaryEntry!.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const entryBody = entryResponse.body as PayrollEntryDetailResponse;
      expect(entryBody.auxilioTransporte).toBe(0);
    });

    it('should return 404 for non-existent entry', async () => {
      await request(app.getHttpServer())
        .get('/payroll/entries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: POST /payroll/periods/:id/approve - Approve Period
  // ==========================================================================

  describe('POST /payroll/periods/:id/approve - Approve Period', () => {
    it('should approve a calculated period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payroll/periods/${payrollPeriod.id}/approve`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(201);

      const body = response.body as PayrollPeriodDetailResponse;
      expect(body.status).toBe(PayrollPeriodStatus.APPROVED);
      expect(body.approvedAt).toBeDefined();
      expect(body.approvedById).toBe(adminUser.id);

      // All entries should be APPROVED
      for (const entry of body.entries) {
        expect(entry.status).toBe(PayrollEntryStatus.APPROVED);
      }
    });

    it('should reject approval of already approved period', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${payrollPeriod.id}/approve`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: POST /payroll/periods/:id/close - Close Period
  // ==========================================================================

  describe('POST /payroll/periods/:id/close - Close Period', () => {
    it('should close an approved period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payroll/periods/${payrollPeriod.id}/close`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(201);

      const body = response.body as PayrollPeriodDetailResponse;
      expect(body.status).toBe(PayrollPeriodStatus.CLOSED);
    });

    it('should reject closing an already closed period', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${payrollPeriod.id}/close`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: PATCH /payroll/employees/:id/status - Change Employee Status
  // ==========================================================================

  describe('PATCH /payroll/employees/:id/status - Change Employee Status', () => {
    it('should change employee status to INACTIVE', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/payroll/employees/${employee2.id}/status`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ status: EmployeeStatus.INACTIVE })
        .expect(200);

      const body = response.body as EmployeeResponse;
      expect(body.status).toBe(EmployeeStatus.INACTIVE);
    });

    it('should reject changing to same status', async () => {
      await request(app.getHttpServer())
        .patch(`/payroll/employees/${employee2.id}/status`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ status: EmployeeStatus.INACTIVE })
        .expect(400);
    });

    it('should allow terminating employee with no open payroll entries', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/payroll/employees/${employee2.id}/status`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ status: EmployeeStatus.TERMINATED })
        .expect(200);

      const body = response.body as EmployeeResponse;
      expect(body.status).toBe(EmployeeStatus.TERMINATED);
      expect(body.endDate).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: Validation - Calculate period without config
  // ==========================================================================

  describe('Payroll Validation', () => {
    it('should reject calculating a closed period', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${payrollPeriod.id}/calculate`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: Unauthenticated access
  // ==========================================================================

  describe('Unauthenticated Access', () => {
    it('should reject unauthenticated access to GET /payroll/employees', async () => {
      await request(app.getHttpServer())
        .get('/payroll/employees')
        .expect(401);
    });

    it('should reject unauthenticated access to POST /payroll/periods', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods')
        .send({
          name: 'Unauthorized Period',
          periodType: PayrollPeriodType.MONTHLY,
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          paymentDate: '2026-08-05',
        })
        .expect(401);
    });

    it('should reject unauthenticated access to GET /payroll/config', async () => {
      await request(app.getHttpServer())
        .get('/payroll/config')
        .expect(401);
    });
  });
});
