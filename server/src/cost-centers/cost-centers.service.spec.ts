import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';

describe('CostCentersService', () => {
  let service: CostCentersService;
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';

  const mockCostCenter = {
    id: 'cc-1',
    tenantId: mockTenantId,
    code: 'ADM',
    name: 'Administración',
    description: 'Centro de costos administrativo',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCostCenterWithCount = {
    ...mockCostCenter,
    _count: { journalEntryLines: 5 },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      costCenter: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      journalEntryLine: {
        count: jest.fn(),
      },
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostCentersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<CostCentersService>(CostCentersService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return all cost centers for tenant', async () => {
      (prisma.costCenter.findMany as jest.Mock).mockResolvedValue([
        mockCostCenterWithCount,
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'cc-1',
        code: 'ADM',
        name: 'Administración',
        description: 'Centro de costos administrativo',
        isActive: true,
        tenantId: mockTenantId,
        createdAt: mockCostCenter.createdAt,
        updatedAt: mockCostCenter.updatedAt,
        journalEntryLineCount: 5,
      });
      expect(prisma.costCenter.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { code: 'asc' },
        include: { _count: { select: { journalEntryLines: true } } },
      });
    });

    it('should filter by search term', async () => {
      (prisma.costCenter.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll('admin');

      expect(prisma.costCenter.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          OR: [
            { name: { contains: 'admin', mode: 'insensitive' } },
            { code: { contains: 'admin', mode: 'insensitive' } },
          ],
        },
        orderBy: { code: 'asc' },
        include: { _count: { select: { journalEntryLines: true } } },
      });
    });

    it('should return empty array when no results', async () => {
      (prisma.costCenter.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a cost center by id', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(
        mockCostCenterWithCount,
      );

      const result = await service.findOne('cc-1');

      expect(result.id).toBe('cc-1');
      expect(result.journalEntryLineCount).toBe(5);
      expect(prisma.costCenter.findFirst).toHaveBeenCalledWith({
        where: { id: 'cc-1', tenantId: mockTenantId },
        include: { _count: { select: { journalEntryLines: true } } },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a cost center with normalized code', async () => {
      (prisma.costCenter.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.costCenter.create as jest.Mock).mockResolvedValue(mockCostCenter);

      const result = await service.create({
        code: ' adm ',
        name: ' Administración ',
        description: 'Centro de costos administrativo',
      });

      expect(result.code).toBe('ADM');
      expect(prisma.costCenter.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          code: 'ADM',
          name: 'Administración',
          description: 'Centro de costos administrativo',
        },
      });
    });

    it('should throw ConflictException when code already exists', async () => {
      (prisma.costCenter.findUnique as jest.Mock).mockResolvedValue(
        mockCostCenter,
      );

      await expect(
        service.create({
          code: 'ADM',
          name: 'Another',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update cost center fields', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(
        mockCostCenter,
      );
      (prisma.costCenter.update as jest.Mock).mockResolvedValue({
        ...mockCostCenter,
        name: 'Updated Name',
      });

      const result = await service.update('cc-1', { name: ' Updated Name ' });

      expect(result.name).toBe('Updated Name');
      expect(prisma.costCenter.update).toHaveBeenCalledWith({
        where: { id: 'cc-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should check code uniqueness when code changes', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(
        mockCostCenter,
      );
      (prisma.costCenter.findUnique as jest.Mock).mockResolvedValue({
        id: 'cc-other',
      });

      await expect(
        service.update('cc-1', { code: 'VEN' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should skip uniqueness check when code unchanged', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(
        mockCostCenter,
      );
      (prisma.costCenter.update as jest.Mock).mockResolvedValue(mockCostCenter);

      await service.update('cc-1', { code: 'ADM' });

      expect(prisma.costCenter.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update isActive', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(
        mockCostCenter,
      );
      (prisma.costCenter.update as jest.Mock).mockResolvedValue({
        ...mockCostCenter,
        isActive: false,
      });

      await service.update('cc-1', { isActive: false });

      expect(prisma.costCenter.update).toHaveBeenCalledWith({
        where: { id: 'cc-1' },
        data: { isActive: false },
      });
    });
  });

  describe('remove', () => {
    it('should delete a cost center with no journal entry lines', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(
        mockCostCenter,
      );
      (prisma.journalEntryLine.count as jest.Mock).mockResolvedValue(0);
      (prisma.costCenter.delete as jest.Mock).mockResolvedValue(mockCostCenter);

      await service.remove('cc-1');

      expect(prisma.costCenter.delete).toHaveBeenCalledWith({
        where: { id: 'cc-1' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when journal entry lines exist', async () => {
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(
        mockCostCenter,
      );
      (prisma.journalEntryLine.count as jest.Mock).mockResolvedValue(3);

      await expect(service.remove('cc-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOptions', () => {
    it('should return active cost centers as options', async () => {
      (prisma.costCenter.findMany as jest.Mock).mockResolvedValue([
        { id: 'cc-1', code: 'ADM', name: 'Administración' },
      ]);

      const result = await service.getOptions();

      expect(result).toEqual([
        { id: 'cc-1', code: 'ADM', name: 'Administración' },
      ]);
      expect(prisma.costCenter.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      });
    });
  });
});
