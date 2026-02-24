import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';
import {
  EmployeeStatus,
  ContractType,
  DocumentType,
  SalaryType,
} from '@prisma/client';

const mockEmployeeResponse = {
  id: 'emp-1',
  tenantId: 'tenant-1',
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
  baseSalary: 1_423_500,
  auxilioTransporte: true,
  arlRiskLevel: 'LEVEL_I',
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

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      changeStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [{ provide: EmployeesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  describe('findAll', () => {
    it('should call service.findAll with params', async () => {
      service.findAll.mockResolvedValue({
        data: [mockEmployeeResponse],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      const result = await controller.findAll(1, 20);

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
      );
      expect(result.data).toHaveLength(1);
    });

    it('should pass filters to service', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.findAll(
        1,
        20,
        EmployeeStatus.ACTIVE,
        'TERMINO_INDEFINIDO',
        'Juan',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        20,
        EmployeeStatus.ACTIVE,
        'TERMINO_INDEFINIDO',
        'Juan',
      );
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      service.findOne.mockResolvedValue(mockEmployeeResponse);

      const result = await controller.findOne('emp-1');

      expect(service.findOne).toHaveBeenCalledWith('emp-1');
      expect(result.id).toBe('emp-1');
    });
  });

  describe('create', () => {
    it('should call service.create', async () => {
      service.create.mockResolvedValue(mockEmployeeResponse);

      const dto = {
        documentNumber: '1234567890',
        firstName: 'Juan',
        lastName: 'Pérez',
        contractType: ContractType.TERMINO_INDEFINIDO,
        baseSalary: 1_423_500,
        startDate: '2026-01-15',
      };

      const result = await controller.create(dto as any);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('emp-1');
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      service.update.mockResolvedValue({
        ...mockEmployeeResponse,
        firstName: 'Carlos',
      });

      const result = await controller.update('emp-1', {
        firstName: 'Carlos',
      });

      expect(service.update).toHaveBeenCalledWith('emp-1', {
        firstName: 'Carlos',
      });
      expect(result.firstName).toBe('Carlos');
    });
  });

  describe('changeStatus', () => {
    it('should call service.changeStatus', async () => {
      service.changeStatus.mockResolvedValue({
        ...mockEmployeeResponse,
        status: EmployeeStatus.TERMINATED,
      });

      const result = await controller.changeStatus(
        'emp-1',
        EmployeeStatus.TERMINATED,
      );

      expect(service.changeStatus).toHaveBeenCalledWith(
        'emp-1',
        EmployeeStatus.TERMINATED,
      );
      expect(result.status).toBe(EmployeeStatus.TERMINATED);
    });
  });
});
