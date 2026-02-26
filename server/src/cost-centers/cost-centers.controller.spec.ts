import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersService } from './cost-centers.service';

describe('CostCentersController', () => {
  let controller: CostCentersController;
  let service: jest.Mocked<CostCentersService>;

  const mockCostCenter = {
    id: 'cc-1',
    code: 'ADM',
    name: 'Administración',
    description: 'Centro de costos administrativo',
    isActive: true,
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    journalEntryLineCount: 5,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getOptions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CostCentersController],
      providers: [
        { provide: CostCentersService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<CostCentersController>(CostCentersController);
    service = module.get(CostCentersService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return cost centers', async () => {
      service.findAll.mockResolvedValue([mockCostCenter]);

      const result = await controller.findAll();

      expect(result).toEqual([mockCostCenter]);
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass trimmed search query', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll('  admin  ');

      expect(service.findAll).toHaveBeenCalledWith('admin');
    });

    it('should pass undefined for empty search', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll('   ');

      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getOptions', () => {
    it('should return cost center options', async () => {
      const options = [{ id: 'cc-1', code: 'ADM', name: 'Administración' }];
      service.getOptions.mockResolvedValue(options);

      const result = await controller.getOptions();

      expect(result).toEqual(options);
      expect(service.getOptions).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a cost center by id', async () => {
      service.findOne.mockResolvedValue(mockCostCenter);

      const result = await controller.findOne('cc-1');

      expect(result).toEqual(mockCostCenter);
      expect(service.findOne).toHaveBeenCalledWith('cc-1');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a cost center', async () => {
      const dto = { code: 'ADM', name: 'Administración' };
      service.create.mockResolvedValue(mockCostCenter);

      const result = await controller.create(dto);

      expect(result).toEqual(mockCostCenter);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a cost center', async () => {
      const dto = { name: 'Updated' };
      service.update.mockResolvedValue({ ...mockCostCenter, name: 'Updated' });

      const result = await controller.update('cc-1', dto);

      expect(result.name).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith('cc-1', dto);
    });
  });

  describe('delete', () => {
    it('should delete a cost center', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.delete('cc-1');

      expect(service.remove).toHaveBeenCalledWith('cc-1');
    });
  });
});
