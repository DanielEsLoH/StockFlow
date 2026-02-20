import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CustomerStatus, DocumentType, PaymentTerms } from '@prisma/client';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';

const mockTenantId = 'tenant-123';

const mockSupplier = {
  id: 'supplier-123',
  tenantId: mockTenantId,
  name: 'Distribuidora ABC',
  email: 'abc@test.com',
  phone: '3001234567',
  documentType: DocumentType.NIT,
  documentNumber: '900123456-1',
  address: 'Calle 123',
  city: 'Bogota',
  state: 'Cundinamarca',
  businessName: 'Distribuidora ABC S.A.S.',
  taxId: '900123456-1',
  notes: null,
  status: CustomerStatus.ACTIVE,
  paymentTerms: PaymentTerms.NET_30,
  contactName: 'Carlos',
  contactPhone: '3009876543',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  _count: { purchaseOrders: 3 },
  purchaseOrders: [{ total: 500 }, { total: 300 }, { total: 200 }],
};

const mockSupplier2 = {
  ...mockSupplier,
  id: 'supplier-456',
  name: 'Proveedor XYZ',
  documentNumber: '800654321-0',
  _count: { purchaseOrders: 0 },
  purchaseOrders: [],
};

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      supplier: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      purchaseOrder: {
        count: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ─── FINDALL ───────────────────────────────────────────────────
  describe('findAll', () => {
    beforeEach(() => {
      (prismaService.supplier.findMany as jest.Mock).mockResolvedValue([mockSupplier]);
      (prismaService.supplier.count as jest.Mock).mockResolvedValue(1);
    });

    it('should return paginated suppliers with default params', async () => {
      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate correct skip for page 2', async () => {
      await service.findAll(2, 10);

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should return empty data when no suppliers exist', async () => {
      (prismaService.supplier.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.supplier.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should search by name and document number', async () => {
      await service.findAll(1, 10, 'ABC');

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'ABC', mode: 'insensitive' } },
              { documentNumber: { contains: 'ABC', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      await service.findAll(1, 10, undefined, CustomerStatus.ACTIVE);

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CustomerStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should order by name ascending', async () => {
      await service.findAll();

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should scope to tenant', async () => {
      await service.findAll();

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should map totalOrders and totalPurchased from relations', async () => {
      const result = await service.findAll();

      expect(result.data[0].totalOrders).toBe(3);
      expect(result.data[0].totalPurchased).toBe(1000);
    });
  });

  // ─── GETSTATS ──────────────────────────────────────────────────
  describe('getStats', () => {
    it('should return total, active, and inactive counts', async () => {
      (prismaService.supplier.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // active
        .mockResolvedValueOnce(3); // inactive

      const result = await service.getStats();

      expect(result).toEqual({ total: 10, active: 7, inactive: 3 });
    });

    it('should scope all queries to tenant', async () => {
      (prismaService.supplier.count as jest.Mock).mockResolvedValue(0);

      await service.getStats();

      expect(prismaService.supplier.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
      expect(prismaService.supplier.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, status: CustomerStatus.ACTIVE },
      });
      expect(prismaService.supplier.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, status: CustomerStatus.INACTIVE },
      });
    });

    it('should return zeros when no suppliers exist', async () => {
      (prismaService.supplier.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({ total: 0, active: 0, inactive: 0 });
    });
  });

  // ─── SEARCH ────────────────────────────────────────────────────
  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const result = await service.search('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const result = await service.search('   ');
      expect(result).toEqual([]);
    });

    it('should search active suppliers by name and document', async () => {
      (prismaService.supplier.findMany as jest.Mock).mockResolvedValue([mockSupplier]);

      const result = await service.search('ABC');

      expect(result).toHaveLength(1);
      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: CustomerStatus.ACTIVE,
            OR: [
              { name: { contains: 'ABC', mode: 'insensitive' } },
              { documentNumber: { contains: 'ABC', mode: 'insensitive' } },
            ],
          }),
          take: 10,
        }),
      );
    });

    it('should limit results to 10', async () => {
      (prismaService.supplier.findMany as jest.Mock).mockResolvedValue([]);

      await service.search('test');

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return a supplier with purchase order summary', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);

      const result = await service.findOne('supplier-123');

      expect(result.id).toBe('supplier-123');
      expect(result.totalOrders).toBe(3);
      expect(result.totalPurchased).toBe(1000);
    });

    it('should throw NotFoundException when supplier not found', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should scope query to tenant', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);

      await service.findOne('supplier-123');

      expect(prismaService.supplier.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'supplier-123', tenantId: mockTenantId },
        }),
      );
    });
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: ' Distribuidora ABC ',
      documentType: DocumentType.NIT,
      documentNumber: ' 900123456-1 ',
      paymentTerms: PaymentTerms.NET_30,
    };

    beforeEach(() => {
      (prismaService.supplier.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.supplier.create as jest.Mock).mockResolvedValue(mockSupplier);
    });

    it('should create a supplier with ACTIVE status', async () => {
      await service.create(createDto);

      expect(prismaService.supplier.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          status: CustomerStatus.ACTIVE,
        }),
      });
    });

    it('should trim name and document number', async () => {
      await service.create(createDto);

      expect(prismaService.supplier.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Distribuidora ABC',
          documentNumber: '900123456-1',
        }),
      });
    });

    it('should throw ConflictException for duplicate document number', async () => {
      (prismaService.supplier.findUnique as jest.Mock).mockResolvedValue(mockSupplier);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'El numero de documento ya existe',
      );
    });

    it('should check uniqueness with compound key', async () => {
      await service.create(createDto);

      expect(prismaService.supplier.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_documentNumber: {
            tenantId: mockTenantId,
            documentNumber: '900123456-1',
          },
        },
      });
    });

    it('should log after successful creation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.create(createDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Supplier created'),
      );
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (prismaService.supplier.update as jest.Mock).mockResolvedValue(mockSupplier);
    });

    it('should update supplier fields', async () => {
      await service.update('supplier-123', { name: 'New Name' });

      expect(prismaService.supplier.update).toHaveBeenCalledWith({
        where: { id: 'supplier-123' },
        data: expect.objectContaining({ name: 'New Name' }),
      });
    });

    it('should throw NotFoundException when supplier not found', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(NotFoundException);
    });

    it('should check uniqueness when document number changes', async () => {
      (prismaService.supplier.findUnique as jest.Mock).mockResolvedValue(null);

      await service.update('supplier-123', { documentNumber: '800999999-0' });

      expect(prismaService.supplier.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_documentNumber: {
            tenantId: mockTenantId,
            documentNumber: '800999999-0',
          },
        },
      });
    });

    it('should throw ConflictException when new document number already exists', async () => {
      (prismaService.supplier.findUnique as jest.Mock).mockResolvedValue(mockSupplier2);

      await expect(
        service.update('supplier-123', { documentNumber: '800654321-0' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should skip uniqueness check when document number is unchanged', async () => {
      await service.update('supplier-123', { documentNumber: '900123456-1' });

      expect(prismaService.supplier.findUnique).not.toHaveBeenCalled();
    });

    it('should update optional fields when provided', async () => {
      await service.update('supplier-123', {
        email: 'new@test.com',
        phone: '3005555555',
        contactName: 'Pedro',
      });

      expect(prismaService.supplier.update).toHaveBeenCalledWith({
        where: { id: 'supplier-123' },
        data: expect.objectContaining({
          email: 'new@test.com',
          phone: '3005555555',
          contactName: 'Pedro',
        }),
      });
    });
  });

  // ─── DELETE ────────────────────────────────────────────────────
  describe('delete', () => {
    beforeEach(() => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (prismaService.purchaseOrder.count as jest.Mock).mockResolvedValue(0);
    });

    it('should delete a supplier with no purchase orders', async () => {
      await service.delete('supplier-123');

      expect(prismaService.supplier.delete).toHaveBeenCalledWith({
        where: { id: 'supplier-123' },
      });
    });

    it('should throw NotFoundException when supplier not found', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when purchase orders exist', async () => {
      (prismaService.purchaseOrder.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('supplier-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include purchase order count in error message', async () => {
      (prismaService.purchaseOrder.count as jest.Mock).mockResolvedValue(3);

      await expect(service.delete('supplier-123')).rejects.toThrow(
        '3 orden(es)',
      );
    });

    it('should scope lookup to tenant', async () => {
      await service.delete('supplier-123');

      expect(prismaService.supplier.findFirst).toHaveBeenCalledWith({
        where: { id: 'supplier-123', tenantId: mockTenantId },
      });
    });
  });

  // ─── MAPTORESPONSE ─────────────────────────────────────────────
  describe('mapToSupplierResponse', () => {
    it('should compute isActive from status', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);

      const result = await service.findOne('supplier-123');

      expect(result.isActive).toBe(true);
    });

    it('should set isActive false for INACTIVE status', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue({
        ...mockSupplier,
        status: CustomerStatus.INACTIVE,
      });

      const result = await service.findOne('supplier-123');

      expect(result.isActive).toBe(false);
    });

    it('should default totalOrders to 0 when _count is missing', async () => {
      const { _count, ...supplierWithoutCount } = mockSupplier;
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(
        supplierWithoutCount,
      );

      const result = await service.findOne('supplier-123');

      expect(result.totalOrders).toBe(0);
    });

    it('should default totalPurchased to 0 when purchaseOrders is missing', async () => {
      const { purchaseOrders, ...supplierWithoutPOs } = mockSupplier;
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(
        supplierWithoutPOs,
      );

      const result = await service.findOne('supplier-123');

      expect(result.totalPurchased).toBe(0);
    });
  });

  // ─── TENANT ISOLATION ──────────────────────────────────────────
  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.supplier.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.supplier.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope search to tenant', async () => {
      (prismaService.supplier.findMany as jest.Mock).mockResolvedValue([]);

      await service.search('test');

      expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope delete to tenant', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (prismaService.purchaseOrder.count as jest.Mock).mockResolvedValue(0);

      await service.delete('supplier-123');

      expect(prismaService.supplier.findFirst).toHaveBeenCalledWith({
        where: { id: 'supplier-123', tenantId: mockTenantId },
      });
    });
  });
});
