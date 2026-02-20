import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AccountingPeriodStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingPeriodsService } from './accounting-periods.service';

describe('AccountingPeriodsService', () => {
  let service: AccountingPeriodsService;
  let prisma: jest.Mocked<any>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-abc';

  const mockPeriod = {
    id: 'period-1',
    tenantId: mockTenantId,
    name: 'Enero 2025',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    status: AccountingPeriodStatus.OPEN,
    closedAt: null,
    closedById: null,
    notes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    _count: { journalEntries: 5 },
  };

  const mockClosedPeriod = {
    ...mockPeriod,
    id: 'period-2',
    name: 'Diciembre 2024',
    startDate: new Date('2024-12-01'),
    endDate: new Date('2024-12-31'),
    status: AccountingPeriodStatus.CLOSED,
    closedAt: new Date('2025-01-05'),
    closedById: 'user-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrisma = {
      accountingPeriod: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      journalEntry: {
        count: jest.fn(),
      },
    };

    const mockTenantContext = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingPeriodsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<AccountingPeriodsService>(AccountingPeriodsService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all periods for the tenant ordered by startDate desc', async () => {
      prisma.accountingPeriod.findMany.mockResolvedValue([mockPeriod, mockClosedPeriod]);

      const result = await service.findAll();

      expect(prisma.accountingPeriod.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        include: { _count: { select: { journalEntries: true } } },
        orderBy: { startDate: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should map _count.journalEntries to entryCount', async () => {
      prisma.accountingPeriod.findMany.mockResolvedValue([mockPeriod]);

      const result = await service.findAll();

      expect(result[0].entryCount).toBe(5);
    });

    it('should return an empty array when no periods exist', async () => {
      prisma.accountingPeriod.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return the period when it exists', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(mockPeriod);

      const result = await service.findOne('period-1');

      expect(prisma.accountingPeriod.findFirst).toHaveBeenCalledWith({
        where: { id: 'period-1', tenantId: mockTenantId },
        include: { _count: { select: { journalEntries: true } } },
      });
      expect(result.id).toBe('period-1');
      expect(result.name).toBe('Enero 2025');
    });

    it('should throw NotFoundException when period does not exist', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should include the period ID in the error message', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(null);

      await expect(service.findOne('period-xyz')).rejects.toThrow('period-xyz');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const validDto = {
      name: 'Febrero 2025',
      startDate: '2025-02-01',
      endDate: '2025-02-28',
    };

    it('should create a period when dates are valid and no overlap exists', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(null);
      prisma.accountingPeriod.create.mockResolvedValue({
        ...mockPeriod,
        id: 'period-new',
        name: 'Febrero 2025',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        _count: { journalEntries: 0 },
      });

      const result = await service.create(validDto);

      expect(prisma.accountingPeriod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            name: 'Febrero 2025',
          }),
        }),
      );
      expect(result.name).toBe('Febrero 2025');
      expect(result.entryCount).toBe(0);
    });

    it('should throw BadRequestException when endDate <= startDate', async () => {
      const invalidDto = {
        name: 'Invalid',
        startDate: '2025-03-31',
        endDate: '2025-03-01',
      };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when endDate equals startDate', async () => {
      const sameDate = {
        name: 'Same Day',
        startDate: '2025-03-15',
        endDate: '2025-03-15',
      };

      await expect(service.create(sameDate)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when period overlaps an existing one', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue({
        ...mockPeriod,
        name: 'Enero 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      const overlappingDto = {
        name: 'Overlap',
        startDate: '2025-01-15',
        endDate: '2025-02-15',
      };

      await expect(service.create(overlappingDto)).rejects.toThrow(ConflictException);
    });

    it('should include the overlapping period name in the ConflictException message', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue({
        ...mockPeriod,
        name: 'Enero 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      const overlappingDto = {
        name: 'Overlap',
        startDate: '2025-01-15',
        endDate: '2025-02-15',
      };

      await expect(service.create(overlappingDto)).rejects.toThrow('Enero 2025');
    });

    it('should pass notes to create when provided', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(null);
      prisma.accountingPeriod.create.mockResolvedValue({
        ...mockPeriod,
        notes: 'Some notes',
        _count: { journalEntries: 0 },
      });

      await service.create({ ...validDto, notes: 'Some notes' });

      expect(prisma.accountingPeriod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ notes: 'Some notes' }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // closePeriod
  // ---------------------------------------------------------------------------
  describe('closePeriod', () => {
    const userId = 'user-close';

    it('should close an open period with no draft entries', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.journalEntry.count.mockResolvedValue(0);
      prisma.accountingPeriod.update.mockResolvedValue({
        ...mockPeriod,
        status: AccountingPeriodStatus.CLOSED,
        closedAt: new Date(),
        closedById: userId,
      });

      const result = await service.closePeriod('period-1', userId);

      expect(prisma.accountingPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'period-1' },
          data: expect.objectContaining({
            status: AccountingPeriodStatus.CLOSED,
            closedById: userId,
          }),
        }),
      );
      expect(result.status).toBe(AccountingPeriodStatus.CLOSED);
    });

    it('should throw NotFoundException when period does not exist', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(null);

      await expect(service.closePeriod('missing', userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when period is already closed', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(mockClosedPeriod);

      await expect(service.closePeriod('period-2', userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when draft entries exist', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.journalEntry.count.mockResolvedValue(3);

      await expect(service.closePeriod('period-1', userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include draft count in the error message when drafts exist', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.journalEntry.count.mockResolvedValue(3);

      await expect(service.closePeriod('period-1', userId)).rejects.toThrow('3');
    });

    it('should query draft entries scoped to tenant and period', async () => {
      prisma.accountingPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.journalEntry.count.mockResolvedValue(0);
      prisma.accountingPeriod.update.mockResolvedValue({
        ...mockPeriod,
        status: AccountingPeriodStatus.CLOSED,
      });

      await service.closePeriod('period-1', userId);

      expect(prisma.journalEntry.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          periodId: 'period-1',
          status: 'DRAFT',
        },
      });
    });
  });
});
