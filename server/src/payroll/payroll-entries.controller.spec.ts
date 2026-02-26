import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PayrollEntriesController } from './payroll-entries.controller';
import { PayrollEntriesService } from './payroll-entries.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

describe('PayrollEntriesController', () => {
  let controller: PayrollEntriesController;
  let service: jest.Mocked<PayrollEntriesService>;

  const mockEntryResponse = {
    id: 'entry-1',
    entryNumber: 'NOM-001-001',
    status: 'DRAFT',
    baseSalary: 2000000,
    totalNeto: 2002000,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollEntriesController],
      providers: [{ provide: PayrollEntriesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollEntriesController>(
      PayrollEntriesController,
    );
    service = module.get(PayrollEntriesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should return entry details', async () => {
      service.findOne.mockResolvedValue(mockEntryResponse as any);

      const result = await controller.findOne('entry-1');

      expect(result).toEqual(mockEntryResponse);
      expect(service.findOne).toHaveBeenCalledWith('entry-1');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return entry', async () => {
      const dto = { daysWorked: 25 };
      service.update.mockResolvedValue(mockEntryResponse as any);

      const result = await controller.update('entry-1', dto);

      expect(result).toEqual(mockEntryResponse);
      expect(service.update).toHaveBeenCalledWith('entry-1', dto);
    });
  });
});
