import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import {
  EmployeeStatus,
  SalaryType,
  ContractType,
  DocumentType,
  ARLRiskLevel,
} from '@prisma/client';

const TENANT_ID = 'tenant-1';

const mockEmployee = {
  id: 'emp-1',
  tenantId: TENANT_ID,
  documentType: DocumentType.CC,
  documentNumber: '1234567890',
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan@test.com',
  phone: '3001234567',
  address: 'Calle 1',
  city: 'Bogotá',
  cityCode: '11001',
  department: 'Cundinamarca',
  departmentCode: '11',
  contractType: ContractType.TERMINO_INDEFINIDO,
  salaryType: SalaryType.ORDINARIO,
  baseSalary: 1_423_500n,
  auxilioTransporte: true,
  arlRiskLevel: ARLRiskLevel.LEVEL_I,
  epsName: 'Sura',
  epsCode: 'EPS001',
  afpName: 'Porvenir',
  afpCode: 'AFP001',
  cajaName: 'Compensar',
  cajaCode: 'CCF001',
  bankName: 'Bancolombia',
  bankAccountType: 'SAVINGS',
  bankAccountNumber: '12345678901',
  costCenter: null,
  startDate: new Date('2026-01-15'),
  endDate: null,
  status: EmployeeStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EmployeesService', () => {
  let service: EmployeesService;
  let prisma: any;
  let tenantContext: any;

  beforeEach(async () => {
    prisma = {
      employee: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      payrollEntry: {
        count: jest.fn(),
      },
    };

    tenantContext = {
      requireTenantId: jest.fn().mockReturnValue(TENANT_ID),
      enforceLimit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenantContext },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  describe('findAll', () => {
    it('should return paginated employees', async () => {
      prisma.employee.findMany.mockResolvedValue([mockEmployee]);
      prisma.employee.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(0);

      await service.findAll(1, 20, EmployeeStatus.ACTIVE);

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, status: EmployeeStatus.ACTIVE },
        }),
      );
    });

    it('should filter by contractType', async () => {
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(0);

      await service.findAll(
        1,
        20,
        undefined,
        ContractType.TERMINO_INDEFINIDO,
      );

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            contractType: ContractType.TERMINO_INDEFINIDO,
          },
        }),
      );
    });

    it('should filter by search term', async () => {
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(0);

      await service.findAll(1, 20, undefined, undefined, 'Juan');

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            OR: expect.arrayContaining([
              { firstName: { contains: 'Juan', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should paginate correctly', async () => {
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(50);

      const result = await service.findAll(3, 10);

      expect(result.meta.totalPages).toBe(5);
      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return employee by id', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);

      const result = await service.findOne('emp-1');

      expect(result.id).toBe('emp-1');
      expect(result.baseSalary).toBe(1_423_500);
      expect(prisma.employee.findFirst).toHaveBeenCalledWith({
        where: { id: 'emp-1', tenantId: TENANT_ID },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      documentType: DocumentType.CC,
      documentNumber: '1234567890',
      firstName: 'Juan',
      lastName: 'Pérez',
      contractType: ContractType.TERMINO_INDEFINIDO,
      baseSalary: 1_423_500,
      startDate: '2026-01-15',
    };

    it('should create an employee', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.employee.create.mockResolvedValue(mockEmployee);

      const result = await service.create(createDto);

      expect(result.id).toBe('emp-1');
      expect(tenantContext.enforceLimit).toHaveBeenCalledWith('employees');
      expect(prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            documentNumber: '1234567890',
            auxilioTransporte: true,
          }),
        }),
      );
    });

    it('should auto-calculate auxilioTransporte as true for salary <= 2 SMMLV', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.employee.create.mockResolvedValue(mockEmployee);

      await service.create({ ...createDto, baseSalary: 2_847_000 });

      expect(prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ auxilioTransporte: true }),
        }),
      );
    });

    it('should auto-calculate auxilioTransporte as false for salary > 2 SMMLV', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.employee.create.mockResolvedValue({
        ...mockEmployee,
        baseSalary: 3_000_000n,
        auxilioTransporte: false,
      });

      await service.create({ ...createDto, baseSalary: 3_000_000 });

      expect(prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ auxilioTransporte: false }),
        }),
      );
    });

    it('should set auxilioTransporte false for integral salary', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.employee.create.mockResolvedValue({
        ...mockEmployee,
        salaryType: SalaryType.INTEGRAL,
        auxilioTransporte: false,
      });

      await service.create({
        ...createDto,
        salaryType: SalaryType.INTEGRAL,
        baseSalary: 18_505_500,
      });

      expect(prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ auxilioTransporte: false }),
        }),
      );
    });

    it('should throw ConflictException for duplicate document', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should enforce employee limit', async () => {
      tenantContext.enforceLimit.mockRejectedValue(
        new ForbiddenException('Employees limit reached'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update an employee', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        firstName: 'Carlos',
      });

      const result = await service.update('emp-1', { firstName: 'Carlos' });

      expect(result.firstName).toBe('Carlos');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { firstName: 'Carlos' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check for duplicate document on document change', async () => {
      prisma.employee.findFirst
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce({ id: 'emp-2' }); // duplicate found

      await expect(
        service.update('emp-1', { documentNumber: '9999999999' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same document number (no change)', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.update.mockResolvedValue(mockEmployee);

      await service.update('emp-1', {
        documentNumber: '1234567890',
        firstName: 'Carlos',
      });

      // Second findFirst should NOT be called since document didn't change
      expect(prisma.employee.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should recalculate auxilioTransporte on salary change', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        baseSalary: 5_000_000n,
        auxilioTransporte: false,
      });

      await service.update('emp-1', { baseSalary: 5_000_000 });

      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ auxilioTransporte: false }),
        }),
      );
    });
  });

  describe('changeStatus', () => {
    it('should change status to INACTIVE', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.INACTIVE,
      });

      const result = await service.changeStatus(
        'emp-1',
        EmployeeStatus.INACTIVE,
      );

      expect(result.status).toBe(EmployeeStatus.INACTIVE);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.changeStatus('non-existent', EmployeeStatus.INACTIVE),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if same status', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);

      await expect(
        service.changeStatus('emp-1', EmployeeStatus.ACTIVE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block termination if open payroll entries exist', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.payrollEntry.count.mockResolvedValue(2);

      await expect(
        service.changeStatus('emp-1', EmployeeStatus.TERMINATED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow termination if no open payroll entries', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.payrollEntry.count.mockResolvedValue(0);
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.TERMINATED,
        endDate: new Date(),
      });

      const result = await service.changeStatus(
        'emp-1',
        EmployeeStatus.TERMINATED,
      );

      expect(result.status).toBe(EmployeeStatus.TERMINATED);
    });

    it('should auto-set endDate on termination if not set', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.payrollEntry.count.mockResolvedValue(0);
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.TERMINATED,
      });

      await service.changeStatus('emp-1', EmployeeStatus.TERMINATED);

      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: EmployeeStatus.TERMINATED,
            endDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should NOT override existing endDate on termination', async () => {
      const empWithEndDate = {
        ...mockEmployee,
        endDate: new Date('2026-06-30'),
      };
      prisma.employee.findFirst.mockResolvedValue(empWithEndDate);
      prisma.payrollEntry.count.mockResolvedValue(0);
      prisma.employee.update.mockResolvedValue({
        ...empWithEndDate,
        status: EmployeeStatus.TERMINATED,
      });

      await service.changeStatus('emp-1', EmployeeStatus.TERMINATED);

      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: EmployeeStatus.TERMINATED },
        }),
      );
    });
  });

  describe('getActiveCount', () => {
    it('should return count of active employees', async () => {
      prisma.employee.count.mockResolvedValue(5);

      const result = await service.getActiveCount();

      expect(result).toBe(5);
      expect(prisma.employee.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, status: EmployeeStatus.ACTIVE },
      });
    });
  });
});
