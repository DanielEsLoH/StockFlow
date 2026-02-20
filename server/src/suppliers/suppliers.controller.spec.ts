import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CustomerStatus } from '@prisma/client';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

const mockSupplierResponse = {
  id: 'supplier-123',
  name: 'Distribuidora ABC',
  email: 'abc@test.com',
  phone: '3001234567',
  documentType: 'NIT',
  documentNumber: '900123456-1',
  address: 'Calle 123',
  city: 'Bogota',
  state: 'Cundinamarca',
  businessName: 'Distribuidora ABC S.A.S.',
  taxId: '900123456-1',
  notes: null,
  status: 'ACTIVE',
  isActive: true,
  paymentTerms: 'NET_30',
  contactName: 'Carlos',
  contactPhone: '3009876543',
  totalOrders: 3,
  totalPurchased: 1000,
  tenantId: 'tenant-123',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockPaginatedResponse = {
  data: [mockSupplierResponse],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
};

const mockStatsResponse = { total: 10, active: 7, inactive: 3 };

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let suppliersService: jest.Mocked<SuppliersService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockSuppliersService = {
      findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
      getStats: jest.fn().mockResolvedValue(mockStatsResponse),
      search: jest.fn().mockResolvedValue([mockSupplierResponse]),
      findOne: jest.fn().mockResolvedValue(mockSupplierResponse),
      create: jest.fn().mockResolvedValue(mockSupplierResponse),
      update: jest.fn().mockResolvedValue(mockSupplierResponse),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        { provide: SuppliersService, useValue: mockSuppliersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuppliersController>(SuppliersController);
    suppliersService = module.get(SuppliersService);

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
    it('should parse page and limit from strings', async () => {
      await controller.findAll('2', '20');

      expect(suppliersService.findAll).toHaveBeenCalledWith(2, 20, undefined, undefined);
    });

    it('should default page to 1 and limit to 10', async () => {
      await controller.findAll();

      expect(suppliersService.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined);
    });

    it('should clamp page to minimum 1', async () => {
      await controller.findAll('-5', '10');

      expect(suppliersService.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined);
    });

    it('should clamp limit to maximum 100', async () => {
      await controller.findAll('1', '500');

      expect(suppliersService.findAll).toHaveBeenCalledWith(1, 100, undefined, undefined);
    });

    it('should default limit to 10 when value is 0 (falsy)', async () => {
      await controller.findAll('1', '0');

      // parseInt('0') = 0, which is falsy, so || 10 gives 10
      expect(suppliersService.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined);
    });

    it('should pass trimmed search query', async () => {
      await controller.findAll('1', '10', '  ABC  ');

      expect(suppliersService.findAll).toHaveBeenCalledWith(1, 10, 'ABC', undefined);
    });

    it('should pass undefined for empty search', async () => {
      await controller.findAll('1', '10', '   ');

      expect(suppliersService.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined);
    });

    it('should pass status filter', async () => {
      await controller.findAll('1', '10', undefined, CustomerStatus.ACTIVE);

      expect(suppliersService.findAll).toHaveBeenCalledWith(
        1, 10, undefined, CustomerStatus.ACTIVE,
      );
    });

    it('should handle invalid page string gracefully', async () => {
      await controller.findAll('abc', '10');

      expect(suppliersService.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined);
    });
  });

  // ─── GETSTATS ──────────────────────────────────────────────────
  describe('getStats', () => {
    it('should delegate to service', async () => {
      const result = await controller.getStats();

      expect(result).toEqual(mockStatsResponse);
      expect(suppliersService.getStats).toHaveBeenCalled();
    });
  });

  // ─── SEARCH ────────────────────────────────────────────────────
  describe('search', () => {
    it('should delegate with trimmed query', async () => {
      await controller.search(' test ');

      expect(suppliersService.search).toHaveBeenCalledWith('test');
    });

    it('should pass empty string when q is undefined', async () => {
      await controller.search();

      expect(suppliersService.search).toHaveBeenCalledWith('');
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should delegate to service', async () => {
      const result = await controller.findOne('supplier-123');

      expect(result).toEqual(mockSupplierResponse);
      expect(suppliersService.findOne).toHaveBeenCalledWith('supplier-123');
    });

    it('should propagate NotFoundException', async () => {
      (suppliersService.findOne as jest.Mock).mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: 'Test Supplier',
      documentType: 'NIT' as any,
      documentNumber: '900123456-1',
      paymentTerms: 'NET_30' as any,
    };

    it('should delegate to service', async () => {
      const result = await controller.create(createDto);

      expect(result).toEqual(mockSupplierResponse);
      expect(suppliersService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate ConflictException', async () => {
      (suppliersService.create as jest.Mock).mockRejectedValue(
        new ConflictException(),
      );

      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────
  describe('update', () => {
    it('should delegate to service with id and dto', async () => {
      const dto = { name: 'Updated' };

      const result = await controller.update('supplier-123', dto);

      expect(result).toEqual(mockSupplierResponse);
      expect(suppliersService.update).toHaveBeenCalledWith('supplier-123', dto);
    });

    it('should propagate NotFoundException', async () => {
      (suppliersService.update as jest.Mock).mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.update('invalid-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── DELETE ────────────────────────────────────────────────────
  describe('delete', () => {
    it('should delegate to service', async () => {
      await controller.delete('supplier-123');

      expect(suppliersService.delete).toHaveBeenCalledWith('supplier-123');
    });

    it('should propagate BadRequestException', async () => {
      (suppliersService.delete as jest.Mock).mockRejectedValue(
        new BadRequestException(),
      );

      await expect(controller.delete('supplier-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
