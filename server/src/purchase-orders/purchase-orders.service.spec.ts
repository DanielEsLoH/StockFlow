import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PurchaseOrderStatus, MovementType, TaxCategory } from '@prisma/client';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingBridgeService } from '../accounting';

const mockTenantId = 'tenant-123';
const mockUserId = 'user-123';

const mockSupplier = {
  id: 'supplier-123',
  tenantId: mockTenantId,
  name: 'Proveedor Test',
  documentType: 'NIT',
  documentNumber: '900123456-1',
  status: 'ACTIVE',
};

const mockWarehouse = {
  id: 'warehouse-123',
  tenantId: mockTenantId,
  name: 'Bodega Principal',
  code: 'BDG-001',
  isActive: true,
};

const mockProduct1 = {
  id: 'product-1',
  tenantId: mockTenantId,
  sku: 'SKU-001',
  name: 'Producto 1',
  costPrice: { toNumber: () => 40 },
  stock: 50,
  taxCategory: TaxCategory.GRAVADO_19,
};

const mockProduct2 = {
  id: 'product-2',
  tenantId: mockTenantId,
  sku: 'SKU-002',
  name: 'Producto 2',
  costPrice: { toNumber: () => 80 },
  stock: 30,
  taxCategory: TaxCategory.GRAVADO_5,
};

const mockCreateDto = {
  supplierId: 'supplier-123',
  warehouseId: 'warehouse-123',
  items: [
    { productId: 'product-1', quantity: 10, unitPrice: 50 },
    { productId: 'product-2', quantity: 5, unitPrice: 100, taxRate: 5, discount: 10 },
  ],
  notes: 'Test PO',
};

const basePurchaseOrder = {
  id: 'po-123',
  tenantId: mockTenantId,
  supplierId: 'supplier-123',
  userId: mockUserId,
  warehouseId: 'warehouse-123',
  purchaseOrderNumber: 'OC-00001',
  status: PurchaseOrderStatus.DRAFT,
  paymentStatus: 'PENDING',
  subtotal: { toNumber: () => 1000 },
  tax: { toNumber: () => 120 },
  discount: { toNumber: () => 10 },
  total: { toNumber: () => 1110 },
  issueDate: new Date('2025-01-15'),
  expectedDeliveryDate: null,
  receivedDate: null,
  notes: 'Test PO',
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15'),
};

const mockPurchaseOrderWithRelations = {
  ...basePurchaseOrder,
  items: [
    {
      id: 'item-1',
      purchaseOrderId: 'po-123',
      productId: 'product-1',
      quantity: 10,
      unitPrice: { toNumber: () => 50 },
      taxRate: { toNumber: () => 19 },
      taxCategory: TaxCategory.GRAVADO_19,
      discount: { toNumber: () => 0 },
      subtotal: { toNumber: () => 500 },
      tax: { toNumber: () => 95 },
      total: { toNumber: () => 595 },
      createdAt: new Date('2025-01-15'),
      product: mockProduct1,
    },
    {
      id: 'item-2',
      purchaseOrderId: 'po-123',
      productId: 'product-2',
      quantity: 5,
      unitPrice: { toNumber: () => 100 },
      taxRate: { toNumber: () => 5 },
      taxCategory: TaxCategory.GRAVADO_5,
      discount: { toNumber: () => 10 },
      subtotal: { toNumber: () => 500 },
      tax: { toNumber: () => 25 },
      total: { toNumber: () => 515 },
      createdAt: new Date('2025-01-15'),
      product: mockProduct2,
    },
  ],
  supplier: mockSupplier,
  user: { id: mockUserId, firstName: 'Juan', lastName: 'Perez', email: 'juan@test.com' },
  warehouse: mockWarehouse,
  movements: [],
  _count: { items: 2 },
};

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let accountingBridgeService: jest.Mocked<AccountingBridgeService>;

  // Transaction mock helpers
  let mockTx: Record<string, Record<string, jest.Mock>>;

  const createMockTx = () => ({
    purchaseOrder: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    purchaseOrderItem: {
      createMany: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    warehouseStock: {
      upsert: jest.fn(),
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx = createMockTx();

    const mockPrismaService = {
      supplier: {
        findFirst: jest.fn(),
      },
      warehouse: {
        findFirst: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      purchaseOrder: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      purchaseOrderItem: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      }),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockAccountingBridgeService = {
      onPurchaseReceived: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: AccountingBridgeService, useValue: mockAccountingBridgeService },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);
    accountingBridgeService = module.get(AccountingBridgeService);

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

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    beforeEach(() => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(mockWarehouse);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct1, mockProduct2]);

      mockTx.purchaseOrder.findFirst.mockResolvedValue(null); // no existing POs
      mockTx.purchaseOrder.create.mockResolvedValue({ id: 'po-123' });
      mockTx.purchaseOrderItem.createMany.mockResolvedValue({ count: 2 });
      mockTx.purchaseOrder.findUnique.mockResolvedValue(mockPurchaseOrderWithRelations);
    });

    it('should create a purchase order in DRAFT status', async () => {
      const result = await service.create(mockCreateDto, mockUserId);

      expect(result.status).toBe(PurchaseOrderStatus.DRAFT);
      expect(result.id).toBe('po-123');
    });

    it('should validate supplier belongs to tenant', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        'Proveedor no encontrado',
      );
    });

    it('should validate warehouse belongs to tenant', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        'Bodega no encontrada',
      );
    });

    it('should validate all products exist', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct1]);
      // product-2 is missing

      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        'Producto no encontrado: product-2',
      );
    });

    it('should calculate item subtotal, tax, and total correctly', async () => {
      await service.create(mockCreateDto, mockUserId);

      // Verify the createMany call items
      const createManyCall = mockTx.purchaseOrderItem.createMany.mock.calls[0][0];
      const items = createManyCall.data;

      // Item 1: qty 10, price 50 → subtotal 500, tax 19% = 95, discount 0 → total 595
      expect(items[0].subtotal).toBe(500);
      expect(items[0].tax).toBe(95);
      expect(items[0].total).toBe(595);

      // Item 2: qty 5, price 100 → subtotal 500, tax 5% = 25, discount 10 → total 515
      expect(items[1].subtotal).toBe(500);
      expect(items[1].tax).toBe(25);
      expect(items[1].total).toBe(515);
    });

    it('should default taxRate to 19 when not specified', async () => {
      await service.create(mockCreateDto, mockUserId);

      const createManyCall = mockTx.purchaseOrderItem.createMany.mock.calls[0][0];
      expect(createManyCall.data[0].taxRate).toBe(19);
    });

    it('should use provided taxRate when specified', async () => {
      await service.create(mockCreateDto, mockUserId);

      const createManyCall = mockTx.purchaseOrderItem.createMany.mock.calls[0][0];
      expect(createManyCall.data[1].taxRate).toBe(5);
    });

    it('should default discount to 0 when not specified', async () => {
      await service.create(mockCreateDto, mockUserId);

      const createManyCall = mockTx.purchaseOrderItem.createMany.mock.calls[0][0];
      expect(createManyCall.data[0].discount).toBe(0);
    });

    it('should calculate aggregate PO totals from items', async () => {
      await service.create(mockCreateDto, mockUserId);

      const createCall = mockTx.purchaseOrder.create.mock.calls[0][0];
      // subtotal: 500 + 500 = 1000, tax: 95 + 25 = 120, discount: 0 + 10 = 10, total: 1000 + 120 - 10 = 1110
      expect(createCall.data.subtotal).toBe(1000);
      expect(createCall.data.tax).toBe(120);
      expect(createCall.data.discount).toBe(10);
      expect(createCall.data.total).toBe(1110);
    });

    it('should generate OC-00001 when no previous POs exist', async () => {
      mockTx.purchaseOrder.findFirst.mockResolvedValue(null);

      await service.create(mockCreateDto, mockUserId);

      const createCall = mockTx.purchaseOrder.create.mock.calls[0][0];
      expect(createCall.data.purchaseOrderNumber).toBe('OC-00001');
    });

    it('should increment PO number based on last existing PO', async () => {
      mockTx.purchaseOrder.findFirst.mockResolvedValue({
        purchaseOrderNumber: 'OC-00042',
      });

      await service.create(mockCreateDto, mockUserId);

      const createCall = mockTx.purchaseOrder.create.mock.calls[0][0];
      expect(createCall.data.purchaseOrderNumber).toBe('OC-00043');
    });

    it('should use transaction for atomicity', async () => {
      await service.create(mockCreateDto, mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if transaction returns null', async () => {
      mockTx.purchaseOrder.findUnique.mockResolvedValue(null);

      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set expectedDeliveryDate when provided', async () => {
      const date = new Date('2025-06-01');
      const dto = { ...mockCreateDto, expectedDeliveryDate: date };

      await service.create(dto, mockUserId);

      const createCall = mockTx.purchaseOrder.create.mock.calls[0][0];
      expect(createCall.data.expectedDeliveryDate).toEqual(date);
    });

    it('should use product taxCategory as fallback when item has no taxCategory', async () => {
      await service.create(mockCreateDto, mockUserId);

      const createManyCall = mockTx.purchaseOrderItem.createMany.mock.calls[0][0];
      // Item 1 has no taxCategory → uses product's GRAVADO_19
      expect(createManyCall.data[0].taxCategory).toBe(TaxCategory.GRAVADO_19);
    });

    it('should require tenant context', async () => {
      (tenantContextService.requireTenantId as jest.Mock).mockImplementation(() => {
        throw new Error('Tenant not found');
      });

      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        'Tenant not found',
      );
    });

    it('should log after successful creation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.create(mockCreateDto, mockUserId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Purchase order created'),
      );
    });
  });

  // ─── FINDALL ───────────────────────────────────────────────────
  describe('findAll', () => {
    beforeEach(() => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([
        mockPurchaseOrderWithRelations,
      ]);
      (prismaService.purchaseOrder.count as jest.Mock).mockResolvedValue(1);
    });

    it('should return paginated purchase orders with default params', async () => {
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
      await service.findAll({ page: 2, limit: 10 });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should return empty data when no POs exist', async () => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.purchaseOrder.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should filter by status when provided', async () => {
      await service.findAll({ status: PurchaseOrderStatus.CONFIRMED });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: PurchaseOrderStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('should filter by supplierId when provided', async () => {
      await service.findAll({ supplierId: 'supplier-123' });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supplierId: 'supplier-123',
          }),
        }),
      );
    });

    it('should filter by warehouseId when provided', async () => {
      await service.findAll({ warehouseId: 'warehouse-123' });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: 'warehouse-123',
          }),
        }),
      );
    });

    it('should filter by fromDate when provided', async () => {
      const fromDate = new Date('2025-01-01');
      await service.findAll({ fromDate });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: { gte: fromDate },
          }),
        }),
      );
    });

    it('should filter by both fromDate and toDate when provided', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-12-31');
      await service.findAll({ fromDate, toDate });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: { gte: fromDate, lte: toDate },
          }),
        }),
      );
    });

    it('should search by PO number and supplier name', async () => {
      await service.findAll({ search: 'OC-00001' });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { purchaseOrderNumber: { contains: 'OC-00001', mode: 'insensitive' } },
              { supplier: { name: { contains: 'OC-00001', mode: 'insensitive' } } },
            ],
          }),
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      await service.findAll();

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should scope queries to tenant', async () => {
      await service.findAll();

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return a purchase order with full relations', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      const result = await service.findOne('po-123');

      expect(result.id).toBe('po-123');
      expect(result.items).toBeDefined();
      expect(result.supplier).toBeDefined();
      expect(result.warehouse).toBeDefined();
    });

    it('should throw NotFoundException when PO not found', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Orden de compra no encontrada',
      );
    });

    it('should scope query to tenant', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      await service.findOne('po-123');

      expect(prismaService.purchaseOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-123', tenantId: mockTenantId },
        }),
      );
    });

    it('should map Decimal fields to numbers in response', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      const result = await service.findOne('po-123');

      expect(typeof result.subtotal).toBe('number');
      expect(typeof result.tax).toBe('number');
      expect(typeof result.total).toBe('number');
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.DRAFT,
      });
      (prismaService.purchaseOrder.update as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );
    });

    it('should update a DRAFT purchase order', async () => {
      const result = await service.update('po-123', { notes: 'Updated notes' });

      expect(result.id).toBe('po-123');
      expect(prismaService.purchaseOrder.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when PO not found', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when PO is not DRAFT', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.SENT,
      });

      await expect(service.update('po-123', {})).rejects.toThrow(ConflictException);
      await expect(service.update('po-123', {})).rejects.toThrow(
        'Solo se pueden editar ordenes de compra en estado borrador',
      );
    });

    it('should validate supplier when supplierId is provided', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('po-123', { supplierId: 'invalid-supplier' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate warehouse when warehouseId is provided', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('po-123', { warehouseId: 'invalid-warehouse' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should recalculate totals when items are provided', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct1]);

      await service.update('po-123', {
        items: [{ productId: 'product-1', quantity: 20, unitPrice: 30 }],
      });

      const updateCall = (prismaService.purchaseOrder.update as jest.Mock).mock.calls[0][0];
      // qty 20, price 30 → subtotal 600, tax 19% = 114, discount 0 → total 714
      expect(updateCall.data.subtotal).toBe(600);
      expect(updateCall.data.tax).toBe(114);
      expect(updateCall.data.total).toBe(714);
    });

    it('should validate products when items are provided', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.update('po-123', {
          items: [{ productId: 'invalid-product', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should replace items with deleteMany + createMany', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct1]);

      await service.update('po-123', {
        items: [{ productId: 'product-1', quantity: 5, unitPrice: 40 }],
      });

      const updateCall = (prismaService.purchaseOrder.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.items).toEqual(
        expect.objectContaining({
          deleteMany: {},
          createMany: expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                productId: 'product-1',
                quantity: 5,
                unitPrice: 40,
              }),
            ]),
          }),
        }),
      );
    });

    it('should update notes without affecting items', async () => {
      await service.update('po-123', { notes: 'New notes' });

      const updateCall = (prismaService.purchaseOrder.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.notes).toBe('New notes');
      expect(updateCall.data.items).toBeUndefined();
    });

    it('should update expectedDeliveryDate', async () => {
      const date = new Date('2025-06-15');

      await service.update('po-123', { expectedDeliveryDate: date });

      const updateCall = (prismaService.purchaseOrder.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.expectedDeliveryDate).toEqual(date);
    });
  });

  // ─── REMOVE ────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delete a DRAFT purchase order', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.DRAFT,
      });

      await service.remove('po-123');

      expect(prismaService.purchaseOrder.delete).toHaveBeenCalledWith({
        where: { id: 'po-123' },
      });
    });

    it('should throw NotFoundException when PO not found', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when PO is not DRAFT', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.CONFIRMED,
      });

      await expect(service.remove('po-123')).rejects.toThrow(ConflictException);
      await expect(service.remove('po-123')).rejects.toThrow(
        'Solo se pueden eliminar ordenes de compra en estado borrador',
      );
    });
  });

  // ─── SEND ──────────────────────────────────────────────────────
  describe('send', () => {
    it('should change status from DRAFT to SENT', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.DRAFT,
      });
      (prismaService.purchaseOrder.update as jest.Mock).mockResolvedValue({
        ...mockPurchaseOrderWithRelations,
        status: PurchaseOrderStatus.SENT,
      });

      const result = await service.send('po-123');

      expect(prismaService.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PurchaseOrderStatus.SENT },
        }),
      );
      expect(result.status).toBe(PurchaseOrderStatus.SENT);
    });

    it('should throw NotFoundException when PO not found', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.send('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when PO is not DRAFT', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.CONFIRMED,
      });

      await expect(service.send('po-123')).rejects.toThrow(ConflictException);
      await expect(service.send('po-123')).rejects.toThrow(
        'Solo se pueden enviar ordenes de compra en estado borrador',
      );
    });
  });

  // ─── CONFIRM ───────────────────────────────────────────────────
  describe('confirm', () => {
    it('should change status from SENT to CONFIRMED', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.SENT,
      });
      (prismaService.purchaseOrder.update as jest.Mock).mockResolvedValue({
        ...mockPurchaseOrderWithRelations,
        status: PurchaseOrderStatus.CONFIRMED,
      });

      const result = await service.confirm('po-123');

      expect(prismaService.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PurchaseOrderStatus.CONFIRMED },
        }),
      );
      expect(result.status).toBe(PurchaseOrderStatus.CONFIRMED);
    });

    it('should throw NotFoundException when PO not found', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.confirm('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when PO is not SENT', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.DRAFT,
      });

      await expect(service.confirm('po-123')).rejects.toThrow(ConflictException);
      await expect(service.confirm('po-123')).rejects.toThrow(
        'Solo se pueden confirmar ordenes de compra en estado enviada',
      );
    });
  });

  // ─── RECEIVE (critical path) ───────────────────────────────────
  describe('receive', () => {
    const confirmedPO = {
      ...basePurchaseOrder,
      status: PurchaseOrderStatus.CONFIRMED,
      items: [
        {
          id: 'item-1',
          purchaseOrderId: 'po-123',
          productId: 'product-1',
          quantity: 10,
          unitPrice: 50,
          product: mockProduct1,
        },
        {
          id: 'item-2',
          purchaseOrderId: 'po-123',
          productId: 'product-2',
          quantity: 5,
          unitPrice: 100,
          product: mockProduct2,
        },
      ],
    };

    const receivedPO = {
      ...mockPurchaseOrderWithRelations,
      status: PurchaseOrderStatus.RECEIVED,
      receivedDate: new Date(),
    };

    beforeEach(() => {
      mockTx.purchaseOrder.findFirst.mockResolvedValue(confirmedPO);
      mockTx.stockMovement.create.mockResolvedValue({});
      mockTx.product.update.mockResolvedValue({});
      mockTx.warehouseStock.upsert.mockResolvedValue({});
      mockTx.purchaseOrder.update.mockResolvedValue(receivedPO);
    });

    it('should change status from CONFIRMED to RECEIVED', async () => {
      const result = await service.receive('po-123', mockUserId);

      expect(result.status).toBe(PurchaseOrderStatus.RECEIVED);
      expect(mockTx.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PurchaseOrderStatus.RECEIVED,
          }),
        }),
      );
    });

    it('should create a stock movement per item', async () => {
      await service.receive('po-123', mockUserId);

      expect(mockTx.stockMovement.create).toHaveBeenCalledTimes(2);

      expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          productId: 'product-1',
          type: MovementType.PURCHASE,
          quantity: 10,
          userId: mockUserId,
        }),
      });

      expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'product-2',
          quantity: 5,
        }),
      });
    });

    it('should update product costPrice to purchase unitPrice', async () => {
      await service.receive('po-123', mockUserId);

      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { costPrice: 50 },
      });

      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'product-2' },
        data: { costPrice: 100 },
      });
    });

    it('should upsert warehouse stock with increment', async () => {
      await service.receive('po-123', mockUserId);

      expect(mockTx.warehouseStock.upsert).toHaveBeenCalledTimes(2);

      expect(mockTx.warehouseStock.upsert).toHaveBeenCalledWith({
        where: {
          warehouseId_productId: {
            warehouseId: 'warehouse-123',
            productId: 'product-1',
          },
        },
        create: expect.objectContaining({
          tenantId: mockTenantId,
          warehouseId: 'warehouse-123',
          productId: 'product-1',
          quantity: 10,
        }),
        update: { quantity: { increment: 10 } },
      });
    });

    it('should update product global stock with increment', async () => {
      await service.receive('po-123', mockUserId);

      // product.update is called twice per item: once for costPrice, once for stock
      const productUpdateCalls = mockTx.product.update.mock.calls;
      const stockUpdateCalls = productUpdateCalls.filter(
        (call) => call[0].data.stock !== undefined,
      );

      expect(stockUpdateCalls).toHaveLength(2);
      expect(stockUpdateCalls[0][0]).toEqual({
        where: { id: 'product-1' },
        data: { stock: { increment: 10 } },
      });
    });

    it('should set receivedDate on the purchase order', async () => {
      await service.receive('po-123', mockUserId);

      expect(mockTx.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receivedDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when PO not found', async () => {
      mockTx.purchaseOrder.findFirst.mockResolvedValue(null);

      await expect(service.receive('invalid-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when PO is not CONFIRMED', async () => {
      mockTx.purchaseOrder.findFirst.mockResolvedValue({
        ...confirmedPO,
        status: PurchaseOrderStatus.DRAFT,
      });

      await expect(service.receive('po-123', mockUserId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.receive('po-123', mockUserId)).rejects.toThrow(
        'Solo se pueden recibir ordenes de compra en estado confirmada',
      );
    });

    it('should call accountingBridge.onPurchaseReceived (non-blocking)', async () => {
      await service.receive('po-123', mockUserId);

      expect(accountingBridgeService.onPurchaseReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          purchaseOrderId: 'po-123',
        }),
      );
    });

    it('should not throw if accountingBridge fails', async () => {
      (accountingBridgeService.onPurchaseReceived as jest.Mock).mockRejectedValue(
        new Error('Accounting error'),
      );

      // Should not throw — the .catch(() => {}) silences the error
      const result = await service.receive('po-123', mockUserId);
      expect(result).toBeDefined();
    });

    it('should include stock movement reason with PO number', async () => {
      await service.receive('po-123', mockUserId);

      expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: expect.stringContaining('OC-00001'),
        }),
      });
    });

    it('should run all operations inside a transaction', async () => {
      await service.receive('po-123', mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ─── CANCEL ────────────────────────────────────────────────────
  describe('cancel', () => {
    it('should cancel a DRAFT purchase order', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.DRAFT,
      });
      (prismaService.purchaseOrder.update as jest.Mock).mockResolvedValue({
        ...mockPurchaseOrderWithRelations,
        status: PurchaseOrderStatus.CANCELLED,
      });

      const result = await service.cancel('po-123');

      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED);
    });

    it('should cancel a SENT purchase order', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.SENT,
      });
      (prismaService.purchaseOrder.update as jest.Mock).mockResolvedValue({
        ...mockPurchaseOrderWithRelations,
        status: PurchaseOrderStatus.CANCELLED,
      });

      const result = await service.cancel('po-123');

      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED);
    });

    it('should cancel a CONFIRMED purchase order', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.CONFIRMED,
      });
      (prismaService.purchaseOrder.update as jest.Mock).mockResolvedValue({
        ...mockPurchaseOrderWithRelations,
        status: PurchaseOrderStatus.CANCELLED,
      });

      const result = await service.cancel('po-123');

      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED);
    });

    it('should throw ConflictException for RECEIVED PO', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.RECEIVED,
      });

      await expect(service.cancel('po-123')).rejects.toThrow(ConflictException);
      await expect(service.cancel('po-123')).rejects.toThrow(
        'No se puede cancelar una orden de compra ya recibida',
      );
    });

    it('should throw ConflictException for already CANCELLED PO', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.CANCELLED,
      });

      await expect(service.cancel('po-123')).rejects.toThrow(ConflictException);
      await expect(service.cancel('po-123')).rejects.toThrow(
        'La orden de compra ya esta cancelada',
      );
    });

    it('should throw NotFoundException when PO not found', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── GETSTATS ──────────────────────────────────────────────────
  describe('getStats', () => {
    it('should return correct counts by status', async () => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([
        { status: PurchaseOrderStatus.DRAFT, total: 100 },
        { status: PurchaseOrderStatus.DRAFT, total: 200 },
        { status: PurchaseOrderStatus.SENT, total: 300 },
        { status: PurchaseOrderStatus.RECEIVED, total: 500 },
      ]);

      const result = await service.getStats();

      expect(result.totalPurchaseOrders).toBe(4);
      expect(result.purchaseOrdersByStatus.DRAFT).toBe(2);
      expect(result.purchaseOrdersByStatus.SENT).toBe(1);
      expect(result.purchaseOrdersByStatus.RECEIVED).toBe(1);
      expect(result.purchaseOrdersByStatus.CONFIRMED).toBe(0);
      expect(result.purchaseOrdersByStatus.CANCELLED).toBe(0);
    });

    it('should calculate totalValue from all POs', async () => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([
        { status: PurchaseOrderStatus.DRAFT, total: 100 },
        { status: PurchaseOrderStatus.RECEIVED, total: 500 },
      ]);

      const result = await service.getStats();

      expect(result.totalValue).toBe(600);
    });

    it('should calculate totalReceived only from RECEIVED POs', async () => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([
        { status: PurchaseOrderStatus.DRAFT, total: 100 },
        { status: PurchaseOrderStatus.RECEIVED, total: 500 },
        { status: PurchaseOrderStatus.RECEIVED, total: 300 },
      ]);

      const result = await service.getStats();

      expect(result.totalReceived).toBe(800);
    });

    it('should scope to tenant', async () => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);

      await service.getStats();

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: { status: true, total: true },
      });
    });

    it('should return zeros when no POs exist', async () => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalPurchaseOrders).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.totalReceived).toBe(0);
    });
  });

  // ─── MAPTORESPONSE ─────────────────────────────────────────────
  describe('mapToResponse', () => {
    it('should convert Decimal fields to numbers', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      const result = await service.findOne('po-123');

      expect(typeof result.subtotal).toBe('number');
      expect(typeof result.tax).toBe('number');
      expect(typeof result.discount).toBe('number');
      expect(typeof result.total).toBe('number');
    });

    it('should map item Decimal fields to numbers', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      const result = await service.findOne('po-123');

      expect(result.items).toBeDefined();
      expect(typeof result.items![0].unitPrice).toBe('number');
      expect(typeof result.items![0].subtotal).toBe('number');
      expect(typeof result.items![0].tax).toBe('number');
    });

    it('should map supplier when included', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      const result = await service.findOne('po-123');

      expect(result.supplier).toEqual({
        id: 'supplier-123',
        name: 'Proveedor Test',
        documentNumber: '900123456-1',
      });
    });

    it('should map user with full name', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      const result = await service.findOne('po-123');

      expect(result.user).toEqual({
        id: mockUserId,
        name: 'Juan Perez',
        email: 'juan@test.com',
      });
    });

    it('should map warehouse when included', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      const result = await service.findOne('po-123');

      expect(result.warehouse).toEqual({
        id: 'warehouse-123',
        name: 'Bodega Principal',
        code: 'BDG-001',
      });
    });

    it('should not include items when not in source', async () => {
      const poWithoutRelations = { ...basePurchaseOrder };
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        poWithoutRelations,
      );

      const result = await service.findOne('po-123');

      expect(result.items).toBeUndefined();
    });

    it('should map _count when included', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      const result = await service.findOne('po-123');

      expect(result._count).toEqual({ items: 2 });
    });

    it('should handle item without product gracefully', async () => {
      const poWithNullProduct = {
        ...mockPurchaseOrderWithRelations,
        items: [
          {
            ...mockPurchaseOrderWithRelations.items[0],
            product: null,
          },
        ],
      };
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        poWithNullProduct,
      );

      const result = await service.findOne('po-123');

      expect(result.items![0].product).toBeUndefined();
    });
  });

  // ─── TENANT ISOLATION ──────────────────────────────────────────
  describe('tenant isolation', () => {
    it('should scope findAll queries to tenant', async () => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.purchaseOrder.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      await service.findOne('po-123');

      expect(prismaService.purchaseOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-123', tenantId: mockTenantId },
        }),
      );
    });

    it('should scope remove lookup to tenant', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.DRAFT,
      });

      await service.remove('po-123');

      expect(prismaService.purchaseOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-123', tenantId: mockTenantId },
        }),
      );
    });

    it('should scope send lookup to tenant', async () => {
      (prismaService.purchaseOrder.findFirst as jest.Mock).mockResolvedValue({
        ...basePurchaseOrder,
        status: PurchaseOrderStatus.DRAFT,
      });
      (prismaService.purchaseOrder.update as jest.Mock).mockResolvedValue(
        mockPurchaseOrderWithRelations,
      );

      await service.send('po-123');

      expect(prismaService.purchaseOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-123', tenantId: mockTenantId },
        }),
      );
    });

    it('should scope supplier validation to tenant in create', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(mockWarehouse);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct1, mockProduct2]);
      mockTx.purchaseOrder.findFirst.mockResolvedValue(null);
      mockTx.purchaseOrder.create.mockResolvedValue({ id: 'po-123' });
      mockTx.purchaseOrderItem.createMany.mockResolvedValue({ count: 2 });
      mockTx.purchaseOrder.findUnique.mockResolvedValue(mockPurchaseOrderWithRelations);

      await service.create(mockCreateDto, mockUserId);

      expect(prismaService.supplier.findFirst).toHaveBeenCalledWith({
        where: { id: 'supplier-123', tenantId: mockTenantId },
      });
    });
  });
});
