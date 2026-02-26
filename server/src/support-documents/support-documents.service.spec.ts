import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupportDocumentStatus } from '@prisma/client';
import { SupportDocumentsService } from './support-documents.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';

describe('SupportDocumentsService', () => {
  let service: SupportDocumentsService;
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const now = new Date('2026-02-25T12:00:00.000Z');

  const mockItem = {
    id: 'item-1',
    supportDocumentId: 'sd-1',
    description: 'Servicio de transporte',
    quantity: 2,
    unitPrice: 100000,
    taxRate: 0,
    subtotal: 200000,
    tax: 0,
    total: 200000,
  };

  const mockSupplier = {
    id: 'supplier-1',
    name: 'Juan Carlos Perez',
    documentNumber: '1234567890',
  };

  const mockUser = {
    id: mockUserId,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
  };

  const mockDocument = {
    id: 'sd-1',
    tenantId: mockTenantId,
    supplierId: 'supplier-1',
    userId: mockUserId,
    documentNumber: 'DS-00001',
    issueDate: now,
    supplierName: 'Juan Carlos Perez',
    supplierDocument: '1234567890',
    supplierDocType: 'CC',
    subtotal: 200000,
    tax: 0,
    withholdings: 0,
    total: 200000,
    status: SupportDocumentStatus.DRAFT,
    dianCude: null,
    dianXml: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };

  const mockDocumentWithRelations = {
    ...mockDocument,
    items: [mockItem],
    supplier: mockSupplier,
    user: mockUser,
  };

  let mockPrismaService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService = {
      supportDocument: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      supportDocumentItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((fn) => fn(mockPrismaService)),
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportDocumentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<SupportDocumentsService>(SupportDocumentsService);
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

  describe('create', () => {
    const createDto = {
      supplierId: 'supplier-1',
      supplierName: 'Juan Carlos Perez',
      supplierDocument: '1234567890',
      supplierDocType: 'CC',
      notes: 'Test note',
      items: [
        {
          description: 'Servicio de transporte',
          quantity: 2,
          unitPrice: 100000,
          taxRate: 0,
        },
      ],
    };

    it('should create a support document with calculated totals', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      // generateDocumentNumber: findFirst returns null (first document)
      (
        mockPrismaService.supportDocument.findFirst as jest.Mock
      ).mockResolvedValue(null);
      (
        mockPrismaService.supportDocument.create as jest.Mock
      ).mockResolvedValue(mockDocument);
      (
        mockPrismaService.supportDocumentItem.createMany as jest.Mock
      ).mockResolvedValue({ count: 1 });
      (
        mockPrismaService.supportDocument.findUnique as jest.Mock
      ).mockResolvedValue(mockDocumentWithRelations);

      const result = await service.create(createDto, mockUserId);

      expect(result.id).toBe('sd-1');
      expect(result.documentNumber).toBe('DS-00001');
      expect(result.subtotal).toBe(200000);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(200000);
      expect(result.status).toBe(SupportDocumentStatus.DRAFT);
      expect(result.items).toHaveLength(1);
      expect(result.supplier).toEqual({
        id: 'supplier-1',
        name: 'Juan Carlos Perez',
        documentNumber: '1234567890',
      });
      expect(result.user).toEqual({
        id: mockUserId,
        name: 'Admin User',
        email: 'admin@test.com',
      });
    });

    it('should calculate item totals with tax', async () => {
      const dtoWithTax = {
        ...createDto,
        supplierId: undefined,
        items: [
          {
            description: 'Item con IVA',
            quantity: 1,
            unitPrice: 100000,
            taxRate: 19,
          },
        ],
      };

      // No supplier validation needed
      (
        mockPrismaService.supportDocument.findFirst as jest.Mock
      ).mockResolvedValue(null);
      (
        mockPrismaService.supportDocument.create as jest.Mock
      ).mockResolvedValue(mockDocument);
      (
        mockPrismaService.supportDocumentItem.createMany as jest.Mock
      ).mockResolvedValue({ count: 1 });

      const docWithTax = {
        ...mockDocument,
        subtotal: 100000,
        tax: 19000,
        total: 119000,
        items: [
          {
            id: 'item-2',
            supportDocumentId: 'sd-1',
            description: 'Item con IVA',
            quantity: 1,
            unitPrice: 100000,
            taxRate: 19,
            subtotal: 100000,
            tax: 19000,
            total: 119000,
          },
        ],
        supplier: null,
        user: mockUser,
      };
      (
        mockPrismaService.supportDocument.findUnique as jest.Mock
      ).mockResolvedValue(docWithTax);

      const result = await service.create(dtoWithTax, mockUserId);

      expect(result.subtotal).toBe(100000);
      expect(result.tax).toBe(19000);
      expect(result.total).toBe(119000);
    });

    it('should throw NotFoundException when supplier not found', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate sequential document numbers', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      // Last document has DS-00005
      (
        mockPrismaService.supportDocument.findFirst as jest.Mock
      ).mockResolvedValue({
        documentNumber: 'DS-00005',
      });
      (
        mockPrismaService.supportDocument.create as jest.Mock
      ).mockImplementation(({ data }) => {
        expect(data.documentNumber).toBe('DS-00006');
        return Promise.resolve({ ...mockDocument, documentNumber: 'DS-00006' });
      });
      (
        mockPrismaService.supportDocumentItem.createMany as jest.Mock
      ).mockResolvedValue({ count: 1 });
      (
        mockPrismaService.supportDocument.findUnique as jest.Mock
      ).mockResolvedValue({
        ...mockDocumentWithRelations,
        documentNumber: 'DS-00006',
      });

      const result = await service.create(createDto, mockUserId);

      expect(result.documentNumber).toBe('DS-00006');
    });

    it('should throw BadRequestException when transaction returns null', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (
        mockPrismaService.supportDocument.findFirst as jest.Mock
      ).mockResolvedValue(null);
      (
        mockPrismaService.supportDocument.create as jest.Mock
      ).mockResolvedValue(mockDocument);
      (
        mockPrismaService.supportDocumentItem.createMany as jest.Mock
      ).mockResolvedValue({ count: 1 });
      (
        mockPrismaService.supportDocument.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip supplier validation when supplierId not provided', async () => {
      const dtoWithoutSupplier = {
        ...createDto,
        supplierId: undefined,
      };

      (
        mockPrismaService.supportDocument.findFirst as jest.Mock
      ).mockResolvedValue(null);
      (
        mockPrismaService.supportDocument.create as jest.Mock
      ).mockResolvedValue(mockDocument);
      (
        mockPrismaService.supportDocumentItem.createMany as jest.Mock
      ).mockResolvedValue({ count: 1 });
      (
        mockPrismaService.supportDocument.findUnique as jest.Mock
      ).mockResolvedValue({
        ...mockDocumentWithRelations,
        supplierId: null,
        supplier: null,
      });

      await service.create(dtoWithoutSupplier, mockUserId);

      expect(prisma.supplier.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated documents with defaults', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([
        { ...mockDocument, supplier: mockSupplier, user: mockUser },
      ]);
      (prisma.supportDocument.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prisma.supportDocument.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, user: true },
      });
    });

    it('should apply status filter', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supportDocument.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ status: SupportDocumentStatus.DRAFT });

      expect(prisma.supportDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            status: SupportDocumentStatus.DRAFT,
          },
        }),
      );
    });

    it('should apply supplierName filter with insensitive contains', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supportDocument.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ supplierName: 'Juan' });

      expect(prisma.supportDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            supplierName: { contains: 'Juan', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should apply supplierDocument filter', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supportDocument.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ supplierDocument: '1234567890' });

      expect(prisma.supportDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            supplierDocument: '1234567890',
          },
        }),
      );
    });

    it('should apply date range filters', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supportDocument.count as jest.Mock).mockResolvedValue(0);

      const fromDate = new Date('2026-01-01');
      const toDate = new Date('2026-12-31');

      await service.findAll({ fromDate, toDate });

      expect(prisma.supportDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            issueDate: { gte: fromDate, lte: toDate },
          },
        }),
      );
    });

    it('should paginate correctly', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supportDocument.count as jest.Mock).mockResolvedValue(25);

      const result = await service.findAll({ page: 3, limit: 5 });

      expect(result.meta).toEqual({
        total: 25,
        page: 3,
        limit: 5,
        totalPages: 5,
      });
      expect(prisma.supportDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        }),
      );
    });

    it('should return zero totalPages when no results', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supportDocument.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a document with items and relations', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDocumentWithRelations,
      );

      const result = await service.findOne('sd-1');

      expect(result.id).toBe('sd-1');
      expect(result.items).toHaveLength(1);
      expect(result.supplier).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user!.name).toBe('Admin User');
      expect(prisma.supportDocument.findFirst).toHaveBeenCalledWith({
        where: { id: 'sd-1', tenantId: mockTenantId },
        include: { items: true, supplier: true, user: true },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update document fields', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDocument,
      );

      const updatedDoc = {
        ...mockDocumentWithRelations,
        supplierName: 'Pedro Lopez',
        notes: 'Updated notes',
      };
      (
        mockPrismaService.supportDocument.update as jest.Mock
      ).mockResolvedValue(updatedDoc);

      const result = await service.update('sd-1', {
        supplierName: 'Pedro Lopez',
        notes: 'Updated notes',
      });

      expect(result.supplierName).toBe('Pedro Lopez');
      expect(result.notes).toBe('Updated notes');
    });

    it('should replace items and recalculate totals when items provided', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDocument,
      );
      (
        mockPrismaService.supportDocumentItem.deleteMany as jest.Mock
      ).mockResolvedValue({ count: 1 });
      (
        mockPrismaService.supportDocumentItem.createMany as jest.Mock
      ).mockResolvedValue({ count: 1 });

      const updatedDoc = {
        ...mockDocumentWithRelations,
        subtotal: 300000,
        tax: 57000,
        total: 357000,
        items: [
          {
            ...mockItem,
            quantity: 3,
            unitPrice: 100000,
            taxRate: 19,
            subtotal: 300000,
            tax: 57000,
            total: 357000,
          },
        ],
      };
      (
        mockPrismaService.supportDocument.update as jest.Mock
      ).mockResolvedValue(updatedDoc);

      const result = await service.update('sd-1', {
        items: [
          {
            description: 'Servicio actualizado',
            quantity: 3,
            unitPrice: 100000,
            taxRate: 19,
          },
        ],
      });

      expect(result.subtotal).toBe(300000);
      expect(result.tax).toBe(57000);
      expect(result.total).toBe(357000);
      expect(
        mockPrismaService.supportDocumentItem.deleteMany,
      ).toHaveBeenCalledWith({
        where: { supportDocumentId: 'sd-1' },
      });
    });

    it('should throw NotFoundException when document not found', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { notes: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when document is not DRAFT', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        status: SupportDocumentStatus.GENERATED,
      });

      await expect(
        service.update('sd-1', { notes: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when supplierId is invalid', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDocument,
      );
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('sd-1', { supplierId: 'invalid-supplier' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a DRAFT document', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDocument,
      );
      (prisma.supportDocument.delete as jest.Mock).mockResolvedValue(
        mockDocument,
      );

      await service.remove('sd-1');

      expect(prisma.supportDocument.delete).toHaveBeenCalledWith({
        where: { id: 'sd-1' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when document is not DRAFT', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        status: SupportDocumentStatus.GENERATED,
      });

      await expect(service.remove('sd-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when document is SENT', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        status: SupportDocumentStatus.SENT,
      });

      await expect(service.remove('sd-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generate', () => {
    it('should transition DRAFT to GENERATED', async () => {
      const draftWithItems = {
        ...mockDocument,
        items: [mockItem],
      };
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(
        draftWithItems,
      );

      const generatedDoc = {
        ...mockDocumentWithRelations,
        status: SupportDocumentStatus.GENERATED,
      };
      (prisma.supportDocument.update as jest.Mock).mockResolvedValue(
        generatedDoc,
      );

      const result = await service.generate('sd-1');

      expect(result.status).toBe(SupportDocumentStatus.GENERATED);
      expect(prisma.supportDocument.update).toHaveBeenCalledWith({
        where: { id: 'sd-1' },
        data: { status: SupportDocumentStatus.GENERATED },
        include: { items: true, supplier: true, user: true },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.generate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when document is not DRAFT', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        status: SupportDocumentStatus.GENERATED,
        items: [mockItem],
      });

      await expect(service.generate('sd-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when document has no items', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        items: [],
      });

      await expect(service.generate('sd-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when items is undefined', async () => {
      (prisma.supportDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        items: undefined,
      });

      await expect(service.generate('sd-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([
        { status: SupportDocumentStatus.DRAFT, total: 100000 },
        { status: SupportDocumentStatus.DRAFT, total: 200000 },
        { status: SupportDocumentStatus.GENERATED, total: 150000 },
        { status: SupportDocumentStatus.SENT, total: 300000 },
      ]);

      const result = await service.getStats();

      expect(result.totalDocuments).toBe(4);
      expect(result.totalValue).toBe(750000);
      expect(result.documentsByStatus).toEqual({
        [SupportDocumentStatus.DRAFT]: 2,
        [SupportDocumentStatus.GENERATED]: 1,
        [SupportDocumentStatus.SENT]: 1,
        [SupportDocumentStatus.ACCEPTED]: 0,
        [SupportDocumentStatus.REJECTED]: 0,
      });
    });

    it('should return zeros when no documents exist', async () => {
      (prisma.supportDocument.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalDocuments).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.documentsByStatus).toEqual({
        [SupportDocumentStatus.DRAFT]: 0,
        [SupportDocumentStatus.GENERATED]: 0,
        [SupportDocumentStatus.SENT]: 0,
        [SupportDocumentStatus.ACCEPTED]: 0,
        [SupportDocumentStatus.REJECTED]: 0,
      });
    });
  });
});
