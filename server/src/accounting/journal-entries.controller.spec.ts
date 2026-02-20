import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { JournalEntrySource, JournalEntryStatus } from '@prisma/client';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesService } from './journal-entries.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

const mockJournalEntry = {
  id: 'je-123',
  entryNumber: 'JE-00001',
  description: 'Venta de mercancia',
  status: JournalEntryStatus.DRAFT,
  source: JournalEntrySource.MANUAL,
  lines: [],
};

const mockPaginatedResponse = {
  data: [mockJournalEntry],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

describe('JournalEntriesController', () => {
  let controller: JournalEntriesController;
  let service: jest.Mocked<JournalEntriesService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
      findOne: jest.fn().mockResolvedValue(mockJournalEntry),
      create: jest.fn().mockResolvedValue(mockJournalEntry),
      postEntry: jest.fn().mockResolvedValue({ ...mockJournalEntry, status: JournalEntryStatus.POSTED }),
      voidEntry: jest.fn().mockResolvedValue({ ...mockJournalEntry, status: JournalEntryStatus.VOIDED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JournalEntriesController],
      providers: [
        { provide: JournalEntriesService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<JournalEntriesController>(JournalEntriesController);
    service = module.get(JournalEntriesService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ─── FINDALL ───────────────────────────────────────────────────
  describe('findAll', () => {
    it('should parse page and limit defaults', async () => {
      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(
        1, 20, undefined, undefined, undefined, undefined,
      );
    });

    it('should parse page and limit from strings', async () => {
      await controller.findAll('3', '50');

      expect(service.findAll).toHaveBeenCalledWith(
        3, 50, undefined, undefined, undefined, undefined,
      );
    });

    it('should clamp page to minimum 1', async () => {
      await controller.findAll('-5', '20');

      expect(service.findAll).toHaveBeenCalledWith(
        1, 20, undefined, undefined, undefined, undefined,
      );
    });

    it('should clamp limit to maximum 100', async () => {
      await controller.findAll('1', '500');

      expect(service.findAll).toHaveBeenCalledWith(
        1, 100, undefined, undefined, undefined, undefined,
      );
    });

    it('should default limit to 20 when value is 0 (falsy)', async () => {
      await controller.findAll('1', '0');

      // parseInt('0') = 0, which is falsy, so || 20 gives 20
      expect(service.findAll).toHaveBeenCalledWith(
        1, 20, undefined, undefined, undefined, undefined,
      );
    });

    it('should pass source and status filters', async () => {
      await controller.findAll(
        '1', '20',
        JournalEntrySource.MANUAL,
        JournalEntryStatus.POSTED,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        1, 20, JournalEntrySource.MANUAL, JournalEntryStatus.POSTED, undefined, undefined,
      );
    });

    it('should pass date filters', async () => {
      await controller.findAll('1', '20', undefined, undefined, '2025-01-01', '2025-12-31');

      expect(service.findAll).toHaveBeenCalledWith(
        1, 20, undefined, undefined, '2025-01-01', '2025-12-31',
      );
    });

    it('should handle invalid page string', async () => {
      await controller.findAll('abc', '20');

      // parseInt('abc') = NaN, || 1 gives 1
      expect(service.findAll).toHaveBeenCalledWith(
        1, 20, undefined, undefined, undefined, undefined,
      );
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should delegate to service', async () => {
      const result = await controller.findOne('je-123');

      expect(result).toEqual(mockJournalEntry);
      expect(service.findOne).toHaveBeenCalledWith('je-123');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      description: 'Test entry',
      lines: [
        { accountId: 'acc-1', debit: 1000, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: 1000 },
      ],
    } as any;

    it('should delegate to service with dto and userId', async () => {
      const req = { user: { id: 'user-1' } };
      const result = await controller.create(dto, req);

      expect(result).toEqual(mockJournalEntry);
      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
    });

    it('should handle missing user in request', async () => {
      const req = { user: undefined };
      await controller.create(dto, req);

      expect(service.create).toHaveBeenCalledWith(dto, undefined);
    });

    it('should propagate BadRequestException for unbalanced entry', async () => {
      service.create.mockRejectedValue(new BadRequestException());

      const req = { user: { id: 'user-1' } };
      await expect(controller.create(dto, req)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── POSTENTRY ─────────────────────────────────────────────────
  describe('postEntry', () => {
    it('should delegate to service', async () => {
      const result = await controller.postEntry('je-123');

      expect(result).toEqual({ ...mockJournalEntry, status: JournalEntryStatus.POSTED });
      expect(service.postEntry).toHaveBeenCalledWith('je-123');
    });

    it('should propagate BadRequestException for non-DRAFT entry', async () => {
      service.postEntry.mockRejectedValue(new BadRequestException());

      await expect(controller.postEntry('je-123')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── VOIDENTRY ─────────────────────────────────────────────────
  describe('voidEntry', () => {
    it('should delegate to service with id and reason', async () => {
      const result = await controller.voidEntry('je-123', 'Error en registro');

      expect(result).toEqual({ ...mockJournalEntry, status: JournalEntryStatus.VOIDED });
      expect(service.voidEntry).toHaveBeenCalledWith('je-123', 'Error en registro');
    });

    it('should propagate BadRequestException for already voided', async () => {
      service.voidEntry.mockRejectedValue(new BadRequestException());

      await expect(controller.voidEntry('je-123', 'reason')).rejects.toThrow(BadRequestException);
    });
  });
});
