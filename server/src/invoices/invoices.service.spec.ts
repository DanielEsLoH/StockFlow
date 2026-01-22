/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import type {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  FilterInvoicesDto,
} from './dto';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockProduct = {
    id: 'product-123',
    tenantId: mockTenantId,
    sku: 'SKU-001',
    name: 'Test Product',
    description: 'A test product',
    stock: 100,
    minStock: 10,
    price: 99.99,
    cost: 50.0,
    categoryId: 'category-123',
    warehouseId: 'warehouse-123',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCustomer = {
    id: 'customer-123',
    tenantId: mockTenantId,
    name: 'Juan Perez',
    email: 'juan.perez@example.com',
    phone: '+573001234567',
  };

  const mockUser = {
    id: mockUserId,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
  };

  const mockInvoiceItem = {
    id: 'item-123',
    invoiceId: 'invoice-123',
    productId: mockProduct.id,
    quantity: 2,
    unitPrice: 99.99,
    taxRate: 19,
    discount: 0,
    subtotal: 199.98,
    tax: 37.9962,
    total: 237.9762,
    createdAt: new Date('2024-01-01'),
    product: {
      id: mockProduct.id,
      sku: mockProduct.sku,
      name: mockProduct.name,
    },
  };

  const mockInvoice = {
    id: 'invoice-123',
    tenantId: mockTenantId,
    customerId: mockCustomer.id,
    userId: mockUserId,
    invoiceNumber: 'INV-00001',
    subtotal: 199.98,
    tax: 37.9962,
    discount: 0,
    total: 237.9762,
    issueDate: new Date('2024-01-01'),
    dueDate: new Date('2024-01-31'),
    status: InvoiceStatus.DRAFT,
    paymentStatus: PaymentStatus.UNPAID,
    notes: 'Test invoice',
    dianCufe: null,
    dianXml: null,
    dianPdf: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    items: [mockInvoiceItem],
    customer: mockCustomer,
    user: mockUser,
  };

  const mockInvoice2 = {
    ...mockInvoice,
    id: 'invoice-456',
    invoiceNumber: 'INV-00002',
    status: InvoiceStatus.SENT,
  };

  const mockTenant = {
    id: mockTenantId,
    name: 'Test Tenant',
    maxInvoices: 100,
  };

  // Mock transaction helper
  const createMockTransaction = () => {
    const txMock = {
      invoice: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      invoiceItem: {
        create: jest.fn(),
        createMany: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    return txMock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      invoice: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      invoiceItem: {
        create: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
      getTenant: jest.fn().mockResolvedValue(mockTenant),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output during tests
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

  describe('findAll', () => {
    beforeEach(() => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        mockInvoice,
        mockInvoice2,
      ]);
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated invoices', async () => {
      const result = await service.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        mockInvoice,
      ]);
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll({});

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no invoices exist', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.findAll({});

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should order invoices by createdAt descending', async () => {
      await service.findAll({});

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    describe('filters', () => {
      it('should filter by status', async () => {
        const filters: FilterInvoicesDto = { status: InvoiceStatus.DRAFT };

        await service.findAll(filters);

        expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              status: InvoiceStatus.DRAFT,
            }),
          }),
        );
      });

      it('should filter by paymentStatus', async () => {
        const filters: FilterInvoicesDto = {
          paymentStatus: PaymentStatus.UNPAID,
        };

        await service.findAll(filters);

        expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              paymentStatus: PaymentStatus.UNPAID,
            }),
          }),
        );
      });

      it('should filter by customerId', async () => {
        const filters: FilterInvoicesDto = { customerId: mockCustomer.id };

        await service.findAll(filters);

        expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              customerId: mockCustomer.id,
            }),
          }),
        );
      });

      it('should filter by fromDate', async () => {
        const fromDate = new Date('2024-01-01');
        const filters: FilterInvoicesDto = { fromDate };

        await service.findAll(filters);

        expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              issueDate: { gte: fromDate },
            }),
          }),
        );
      });

      it('should filter by toDate', async () => {
        const toDate = new Date('2024-12-31');
        const filters: FilterInvoicesDto = { toDate };

        await service.findAll(filters);

        expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              issueDate: { lte: toDate },
            }),
          }),
        );
      });

      it('should filter by date range (fromDate and toDate)', async () => {
        const fromDate = new Date('2024-01-01');
        const toDate = new Date('2024-12-31');
        const filters: FilterInvoicesDto = { fromDate, toDate };

        await service.findAll(filters);

        expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              issueDate: { gte: fromDate, lte: toDate },
            }),
          }),
        );
      });

      it('should combine multiple filters', async () => {
        const filters: FilterInvoicesDto = {
          status: InvoiceStatus.SENT,
          paymentStatus: PaymentStatus.PAID,
          customerId: mockCustomer.id,
        };

        await service.findAll(filters);

        expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              status: InvoiceStatus.SENT,
              paymentStatus: PaymentStatus.PAID,
              customerId: mockCustomer.id,
            }),
          }),
        );
      });
    });

    it('should include customer and user relations', async () => {
      await service.findAll({});

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            customer: true,
            user: true,
          },
        }),
      );
    });

    it('should scope findAll to tenant', async () => {
      await service.findAll({});

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
      expect(prismaService.invoice.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: mockTenantId }),
      });
    });
  });

  describe('findOne', () => {
    it('should return an invoice with items by id', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      const result = await service.findOne('invoice-123');

      expect(result.id).toBe('invoice-123');
      expect(result.invoiceNumber).toBe('INV-00001');
      expect(result.items).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
        },
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct Spanish message', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Factura no encontrada',
      );
    });

    it('should include customer relation in response', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      const result = await service.findOne('invoice-123');

      expect(result.customer).toBeDefined();
      expect(result.customer?.name).toBe('Juan Perez');
    });

    it('should include user relation in response', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      const result = await service.findOne('invoice-123');

      expect(result.user).toBeDefined();
      expect(result.user?.name).toBe('Admin User');
      expect(result.user?.email).toBe('admin@example.com');
    });

    it('should require tenant context', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      await service.findOne('invoice-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      await service.findOne('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: expect.any(Object),
      });
    });
  });

  describe('create', () => {
    const createDto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      items: [
        {
          productId: mockProduct.id,
          quantity: 2,
          unitPrice: 99.99,
          taxRate: 19,
          discount: 0,
        },
      ],
      dueDate: new Date('2024-01-31'),
      notes: 'Test invoice',
    };

    beforeEach(() => {
      // Mock customer validation
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      // Mock product validation (batched query)
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
      ]);
      // Mock no existing invoices for number generation
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);
      // Mock monthly count
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      // Mock transaction
      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );
    });

    it('should create a new invoice', async () => {
      const result = await service.create(createDto, mockUserId);

      expect(result.id).toBeDefined();
      expect(result.invoiceNumber).toBe('INV-00001');
      expect(result.status).toBe(InvoiceStatus.DRAFT);
      expect(result.paymentStatus).toBe(PaymentStatus.UNPAID);
    });

    it('should generate invoice number', async () => {
      await service.create(createDto, mockUserId);

      const txCallback = (prismaService.$transaction as jest.Mock).mock
        .calls[0][0];
      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);

      await txCallback(txMock);

      expect(txMock.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: 'INV-00001',
          }),
        }),
      );
    });

    it('should calculate item totals correctly', async () => {
      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(createDto, mockUserId);

      // subtotal = 2 * 99.99 = 199.98
      // tax = 199.98 * 0.19 = 37.9962
      // total = 199.98 + 37.9962 - 0 = 237.9762
      expect(txMock.invoiceItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            productId: mockProduct.id,
            quantity: 2,
            unitPrice: 99.99,
            taxRate: 19,
            discount: 0,
            subtotal: 199.98,
            tax: expect.closeTo(37.9962, 2),
            total: expect.closeTo(237.9762, 2),
          }),
        ]),
      });
    });

    it('should calculate invoice totals correctly', async () => {
      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(createDto, mockUserId);

      expect(txMock.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 199.98,
            tax: expect.closeTo(37.9962, 2),
            discount: 0,
            total: expect.closeTo(237.9762, 2),
          }),
        }),
      );
    });

    it('should reduce stock for products', async () => {
      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(createDto, mockUserId);

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        data: {
          stock: {
            decrement: 2,
          },
        },
      });
    });

    it('should create stock movements', async () => {
      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(createDto, mockUserId);

      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          productId: mockProduct.id,
          userId: mockUserId,
          type: 'SALE',
          quantity: -2,
          reason: expect.stringContaining('Venta - Factura'),
        }),
      });
    });

    it('should validate product exists', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message for product not found', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        `Producto no encontrado: ${mockProduct.id}`,
      );
    });

    it('should validate product has sufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        lowStockProduct,
      ]);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        lowStockProduct,
      ]);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        `Stock insuficiente para el producto: ${mockProduct.name}`,
      );
    });

    it('should check monthly limit', async () => {
      await service.create(createDto, mockUserId);

      expect(tenantContextService.getTenant).toHaveBeenCalled();
      expect(prismaService.invoice.count).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when monthly limit reached', async () => {
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: 10,
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(10);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException with correct message for limit reached', async () => {
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: 10,
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(10);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        'Límite mensual de facturas alcanzado',
      );
    });

    it('should validate customer exists if customerId provided', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow creation without customerId', async () => {
      const dtoWithoutCustomer: CreateInvoiceDto = {
        items: createDto.items,
      };

      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        customerId: null,
        customer: null,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        customerId: null,
        customer: null,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      const result = await service.create(dtoWithoutCustomer, mockUserId);

      expect(result.customerId).toBeNull();
      expect(prismaService.customer.findFirst).not.toHaveBeenCalled();
    });

    it('should use default tax rate of 19 if not provided', async () => {
      const dtoWithoutTax: CreateInvoiceDto = {
        items: [
          {
            productId: mockProduct.id,
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(dtoWithoutTax, mockUserId);

      expect(txMock.invoiceItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            taxRate: 19,
          }),
        ]),
      });
    });

    it('should use default discount of 0 if not provided', async () => {
      const dtoWithoutDiscount: CreateInvoiceDto = {
        items: [
          {
            productId: mockProduct.id,
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(dtoWithoutDiscount, mockUserId);

      expect(txMock.invoiceItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            discount: 0,
          }),
        ]),
      });
    });

    it('should require tenant context', async () => {
      await service.create(createDto, mockUserId);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should include tenantId in created invoice', async () => {
      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(createDto, mockUserId);

      expect(txMock.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateInvoiceDto = {
      notes: 'Updated notes',
      dueDate: new Date('2024-02-28'),
    };

    beforeEach(() => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.invoice.update as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        notes: 'Updated notes',
        dueDate: new Date('2024-02-28'),
      });
    });

    it('should update a DRAFT invoice', async () => {
      const result = await service.update('invoice-123', updateDto);

      expect(result.notes).toBe('Updated notes');
      expect(prismaService.invoice.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'Factura no encontrada',
      );
    });

    it('should throw BadRequestException for non-DRAFT invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(service.update('invoice-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct Spanish message for non-DRAFT', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(service.update('invoice-123', updateDto)).rejects.toThrow(
        'Solo se pueden modificar facturas en borrador',
      );
    });

    it('should update only provided fields', async () => {
      const partialUpdate: UpdateInvoiceDto = { notes: 'Only notes' };

      await service.update('invoice-123', partialUpdate);

      expect(prismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: { notes: 'Only notes' },
        include: expect.any(Object),
      });
    });

    it('should require tenant context', async () => {
      await service.update('invoice-123', updateDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope update to tenant', async () => {
      await service.update('invoice-123', updateDto);

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
      });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        items: [{ ...mockInvoiceItem, product: mockProduct }],
      });

      const txMock = createMockTransaction();
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );
    });

    it('should delete a DRAFT invoice', async () => {
      await service.delete('invoice-123');

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Factura no encontrada',
      );
    });

    it('should throw BadRequestException for non-DRAFT invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
        items: [],
      });

      await expect(service.delete('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct Spanish message for non-DRAFT', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
        items: [],
      });

      await expect(service.delete('invoice-123')).rejects.toThrow(
        'Solo se pueden eliminar facturas en borrador',
      );
    });

    it('should restore stock for items with productId', async () => {
      const txMock = createMockTransaction();
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.delete('invoice-123');

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        data: {
          stock: {
            increment: mockInvoiceItem.quantity,
          },
        },
      });
    });

    it('should create return stock movements', async () => {
      const txMock = createMockTransaction();
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.delete('invoice-123');

      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          productId: mockProduct.id,
          type: 'RETURN',
          quantity: mockInvoiceItem.quantity,
          reason: expect.stringContaining('Eliminación de factura borrador'),
        }),
      });
    });

    it('should delete invoice items before invoice', async () => {
      const txMock = createMockTransaction();
      const callOrder: string[] = [];
      txMock.invoiceItem.deleteMany.mockImplementation(() => {
        callOrder.push('deleteItems');
        return Promise.resolve();
      });
      txMock.invoice.delete.mockImplementation(() => {
        callOrder.push('deleteInvoice');
        return Promise.resolve();
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.delete('invoice-123');

      expect(callOrder.indexOf('deleteItems')).toBeLessThan(
        callOrder.indexOf('deleteInvoice'),
      );
    });

    it('should require tenant context', async () => {
      await service.delete('invoice-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope delete to tenant', async () => {
      await service.delete('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: { items: true },
      });
    });
  });

  describe('send', () => {
    beforeEach(() => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.invoice.update as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });
    });

    it('should change DRAFT invoice to SENT', async () => {
      const result = await service.send('invoice-123');

      expect(result.status).toBe(InvoiceStatus.SENT);
      expect(prismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: { status: InvoiceStatus.SENT },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.send('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.send('nonexistent')).rejects.toThrow(
        'Factura no encontrada',
      );
    });

    it('should throw BadRequestException for non-DRAFT invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(service.send('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct Spanish message for non-DRAFT', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(service.send('invoice-123')).rejects.toThrow(
        'Solo se pueden enviar facturas en borrador',
      );
    });

    it('should require tenant context', async () => {
      await service.send('invoice-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope send to tenant', async () => {
      await service.send('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
      });
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
        items: [{ ...mockInvoiceItem, product: mockProduct }],
      });

      const txMock = createMockTransaction();
      txMock.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );
    });

    it('should cancel an invoice', async () => {
      const result = await service.cancel('invoice-123');

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should restore stock for cancelled invoice', async () => {
      const txMock = createMockTransaction();
      txMock.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.cancel('invoice-123');

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        data: {
          stock: {
            increment: mockInvoiceItem.quantity,
          },
        },
      });
    });

    it('should create return stock movements on cancel', async () => {
      const txMock = createMockTransaction();
      txMock.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.cancel('invoice-123');

      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          productId: mockProduct.id,
          type: 'RETURN',
          quantity: mockInvoiceItem.quantity,
          reason: expect.stringContaining('Cancelación de factura'),
        }),
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(
        'Factura no encontrada',
      );
    });

    it('should throw BadRequestException for already cancelled invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
        items: [],
      });

      await expect(service.cancel('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for void invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.VOID,
        items: [],
      });

      await expect(service.cancel('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct Spanish message for already cancelled', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
        items: [],
      });

      await expect(service.cancel('invoice-123')).rejects.toThrow(
        'La factura ya está cancelada o anulada',
      );
    });

    it('should require tenant context', async () => {
      await service.cancel('invoice-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope cancel to tenant', async () => {
      await service.cancel('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate INV-00001 for first invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.generateInvoiceNumber();

      expect(result).toBe('INV-00001');
    });

    it('should generate consecutive numbers', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        invoiceNumber: 'INV-00005',
      });

      const result = await service.generateInvoiceNumber();

      expect(result).toBe('INV-00006');
    });

    it('should handle large invoice numbers', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        invoiceNumber: 'INV-99999',
      });

      const result = await service.generateInvoiceNumber();

      expect(result).toBe('INV-100000');
    });

    it('should query for last invoice in tenant', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await service.generateInvoiceNumber();

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      });
    });

    it('should require tenant context', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await service.generateInvoiceNumber();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('checkMonthlyLimit', () => {
    it('should allow when under limit', async () => {
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: 100,
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(50);

      await expect(service.checkMonthlyLimit()).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when limit reached', async () => {
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: 10,
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(10);

      await expect(service.checkMonthlyLimit()).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException with correct message when limit reached', async () => {
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: 10,
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(10);

      await expect(service.checkMonthlyLimit()).rejects.toThrow(
        'Límite mensual de facturas alcanzado',
      );
    });

    it('should allow unlimited when maxInvoices is -1', async () => {
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: -1,
      });

      await expect(service.checkMonthlyLimit()).resolves.not.toThrow();
      expect(prismaService.invoice.count).not.toHaveBeenCalled();
    });

    it('should count invoices from start of month', async () => {
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: 100,
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.checkMonthlyLimit();

      expect(prismaService.invoice.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });

      const callArg = (prismaService.invoice.count as jest.Mock).mock
        .calls[0][0];
      const startDate = callArg.where.createdAt.gte as Date;
      expect(startDate.getDate()).toBe(1);
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);
    });
  });

  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({});

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
      expect(prismaService.invoice.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: mockTenantId }),
      });
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      await service.findOne('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: expect.any(Object),
      });
    });

    it('should scope create product validation to tenant', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
      ]);
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(
        {
          items: [{ productId: mockProduct.id, quantity: 1, unitPrice: 100 }],
        },
        mockUserId,
      );

      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: [mockProduct.id] }, tenantId: mockTenantId },
      });
    });

    it('should scope update check to tenant', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.invoice.update as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      await service.update('invoice-123', { notes: 'Updated' });

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
      });
    });

    it('should scope delete check to tenant', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        items: [],
      });

      const txMock = createMockTransaction();
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.delete('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: { items: true },
      });
    });

    it('should scope send check to tenant', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.invoice.update as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await service.send('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
      });
    });

    it('should scope cancel check to tenant', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
        items: [],
      });

      const txMock = createMockTransaction();
      txMock.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.cancel('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    it('should not allow access to invoices from other tenants', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('other-tenant-invoice')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('logging', () => {
    it('should log debug when listing invoices', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({});

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Listing invoices for tenant'),
      );
    });

    it('should log debug when finding invoice', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      await service.findOne('invoice-123');

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Finding invoice'),
      );
    });

    it('should log when invoice is created', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
      ]);
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      const txMock = createMockTransaction();
      txMock.invoice.create.mockResolvedValue({
        ...mockInvoice,
        items: undefined,
      });
      txMock.invoice.findUnique.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.create(
        {
          items: [{ productId: mockProduct.id, quantity: 1, unitPrice: 100 }],
        },
        mockUserId,
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice created'),
      );
    });

    it('should log when invoice is updated', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.invoice.update as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      await service.update('invoice-123', { notes: 'Updated' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice updated'),
      );
    });

    it('should log when invoice is deleted', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        items: [],
      });

      const txMock = createMockTransaction();
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.delete('invoice-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice deleted'),
      );
    });

    it('should log when invoice is sent', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.invoice.update as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await service.send('invoice-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice sent'),
      );
    });

    it('should log when invoice is cancelled', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
        items: [],
      });

      const txMock = createMockTransaction();
      txMock.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.cancel('invoice-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice cancelled'),
      );
    });

    it('should log warning when invoice not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.findOne('nonexistent');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice not found'),
      );
    });

    it('should log warning when monthly limit reached', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: 10,
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(10);

      try {
        await service.checkMonthlyLimit();
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Monthly invoice limit reached'),
      );
    });

    it('should log debug when generating invoice number', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await service.generateInvoiceNumber();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated invoice number'),
      );
    });

    it('should log debug when limit check passes', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (tenantContextService.getTenant as jest.Mock).mockResolvedValue({
        ...mockTenant,
        maxInvoices: 100,
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(50);

      await service.checkMonthlyLimit();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice limit check passed'),
      );
    });
  });

  describe('mapToInvoiceResponse', () => {
    it('should map invoice with all relations correctly', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      const result = await service.findOne('invoice-123');

      expect(result.id).toBe('invoice-123');
      expect(result.invoiceNumber).toBe('INV-00001');
      expect(result.status).toBe(InvoiceStatus.DRAFT);
      expect(result.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(result.customer?.name).toBe('Juan Perez');
      expect(result.user?.name).toBe('Admin User');
      expect(result.items).toHaveLength(1);
      expect(result.items?.[0].product?.name).toBe('Test Product');
    });

    it('should convert Decimal fields to numbers', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );

      const result = await service.findOne('invoice-123');

      expect(typeof result.subtotal).toBe('number');
      expect(typeof result.tax).toBe('number');
      expect(typeof result.discount).toBe('number');
      expect(typeof result.total).toBe('number');
    });

    it('should handle invoice without customer', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        customerId: null,
        customer: null,
      });

      const result = await service.findOne('invoice-123');

      expect(result.customerId).toBeNull();
      expect(result.customer).toBeUndefined();
    });

    it('should handle invoice item without product', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        items: [
          {
            ...mockInvoiceItem,
            productId: null,
            product: null,
          },
        ],
      });

      const result = await service.findOne('invoice-123');

      expect(result.items?.[0].productId).toBeNull();
      expect(result.items?.[0].product).toBeUndefined();
    });

    it('should handle invoice without user', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        userId: null,
        user: null,
      });

      const result = await service.findOne('invoice-123');

      expect(result.userId).toBeNull();
      expect(result.user).toBeUndefined();
    });

    it('should handle invoice without items array', async () => {
      const invoiceWithoutItems = { ...mockInvoice };
      delete (invoiceWithoutItems as Record<string, unknown>).items;

      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        invoiceWithoutItems,
      );

      const result = await service.findOne('invoice-123');

      expect(result.items).toBeUndefined();
    });

    it('should handle invoice with empty items array', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        items: [],
      });

      const result = await service.findOne('invoice-123');

      expect(result.items).toEqual([]);
    });
  });

  describe('addItem', () => {
    const addItemDto = {
      productId: 'product-456',
      quantity: 3,
      unitPrice: 50,
      taxRate: 19,
      discount: 0,
    };

    const mockProduct2 = {
      ...mockProduct,
      id: 'product-456',
      name: 'Test Product 2',
      stock: 50,
    };

    beforeEach(() => {
      // Mock invoice findFirst - DRAFT invoice
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      // Mock product findFirst
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct2,
      );

      // Setup transaction mock
      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([
        mockInvoiceItem,
        {
          ...mockInvoiceItem,
          id: 'item-456',
          productId: 'product-456',
          quantity: 3,
          unitPrice: 50,
          subtotal: 150,
          tax: 28.5,
          total: 178.5,
        },
      ]);
      txMock.invoice.update.mockResolvedValue({
        ...mockInvoice,
        subtotal: 349.98,
        tax: 66.4962,
        total: 416.4762,
        items: [mockInvoiceItem],
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );
    });

    it('should add an item to a DRAFT invoice', async () => {
      const result = await service.addItem(
        'invoice-123',
        addItemDto,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addItem('nonexistent', addItemDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addItem('nonexistent', addItemDto, mockUserId),
      ).rejects.toThrow('Factura no encontrada');
    });

    it('should throw BadRequestException for non-DRAFT invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(
        service.addItem('invoice-123', addItemDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for non-DRAFT', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(
        service.addItem('invoice-123', addItemDto, mockUserId),
      ).rejects.toThrow('Solo se pueden agregar items a facturas en borrador');
    });

    it('should throw NotFoundException when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addItem('invoice-123', addItemDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addItem('invoice-123', addItemDto, mockUserId),
      ).rejects.toThrow(`Producto no encontrado: ${addItemDto.productId}`);
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue({
        ...mockProduct2,
        stock: 2, // Less than requested quantity of 3
      });

      await expect(
        service.addItem('invoice-123', addItemDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for insufficient stock', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue({
        ...mockProduct2,
        stock: 2,
      });

      await expect(
        service.addItem('invoice-123', addItemDto, mockUserId),
      ).rejects.toThrow(
        `Stock insuficiente para el producto: ${mockProduct2.name}`,
      );
    });

    it('should create invoice item with correct calculations', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.addItem('invoice-123', addItemDto, mockUserId);

      // subtotal = 3 * 50 = 150
      // tax = 150 * 0.19 = 28.5
      // total = 150 + 28.5 - 0 = 178.5
      expect(txMock.invoiceItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invoiceId: 'invoice-123',
          productId: 'product-456',
          quantity: 3,
          unitPrice: 50,
          taxRate: 19,
          discount: 0,
          subtotal: 150,
          tax: 28.5,
          total: 178.5,
        }),
      });
    });

    it('should decrement product stock', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.addItem('invoice-123', addItemDto, mockUserId);

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: 'product-456' },
        data: {
          stock: {
            decrement: 3,
          },
        },
      });
    });

    it('should create stock movement', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.addItem('invoice-123', addItemDto, mockUserId);

      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          productId: 'product-456',
          userId: mockUserId,
          type: 'SALE',
          quantity: -3,
          invoiceId: 'invoice-123',
        }),
      });
    });

    it('should use default taxRate of 19 if not provided', async () => {
      const dtoWithoutTax = {
        productId: 'product-456',
        quantity: 3,
        unitPrice: 50,
      };

      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.addItem('invoice-123', dtoWithoutTax, mockUserId);

      expect(txMock.invoiceItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taxRate: 19,
        }),
      });
    });

    it('should use default discount of 0 if not provided', async () => {
      const dtoWithoutDiscount = {
        productId: 'product-456',
        quantity: 3,
        unitPrice: 50,
      };

      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.addItem('invoice-123', dtoWithoutDiscount, mockUserId);

      expect(txMock.invoiceItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          discount: 0,
        }),
      });
    });

    it('should recalculate invoice totals', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([
        { subtotal: 100, tax: 19, discount: 0 },
        { subtotal: 150, tax: 28.5, discount: 0 },
      ]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.addItem('invoice-123', addItemDto, mockUserId);

      expect(txMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: {
          subtotal: 250,
          tax: 47.5,
          discount: 0,
          total: 297.5,
        },
        include: expect.any(Object),
      });
    });

    it('should require tenant context', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.addItem('invoice-123', addItemDto, mockUserId);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope product check to tenant', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.create = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.addItem('invoice-123', addItemDto, mockUserId);

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-456', tenantId: mockTenantId },
      });
    });
  });

  describe('updateItem', () => {
    const updateItemDto = {
      quantity: 5,
      unitPrice: 75,
    };

    beforeEach(() => {
      // Mock invoice findFirst - DRAFT invoice
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      // Mock invoiceItem findFirst
      (prismaService.invoiceItem.findFirst as jest.Mock) = jest
        .fn()
        .mockResolvedValue({
          ...mockInvoiceItem,
          product: mockProduct,
        });
      // Mock product findUnique for stock check
      (prismaService.product.findUnique as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockProduct);

      // Setup transaction mock
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([
        {
          ...mockInvoiceItem,
          quantity: 5,
          subtotal: 375,
          tax: 71.25,
          total: 446.25,
        },
      ]);
      txMock.invoice.update.mockResolvedValue({
        ...mockInvoice,
        subtotal: 375,
        tax: 71.25,
        total: 446.25,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );
    });

    it('should update an item on a DRAFT invoice', async () => {
      const result = await service.updateItem(
        'invoice-123',
        'item-123',
        updateItemDto,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateItem(
          'nonexistent',
          'item-123',
          updateItemDto,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateItem(
          'nonexistent',
          'item-123',
          updateItemDto,
          mockUserId,
        ),
      ).rejects.toThrow('Factura no encontrada');
    });

    it('should throw BadRequestException for non-DRAFT invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(
        service.updateItem(
          'invoice-123',
          'item-123',
          updateItemDto,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for non-DRAFT', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(
        service.updateItem(
          'invoice-123',
          'item-123',
          updateItemDto,
          mockUserId,
        ),
      ).rejects.toThrow(
        'Solo se pueden modificar items de facturas en borrador',
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      (prismaService.invoiceItem.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.updateItem(
          'invoice-123',
          'nonexistent',
          updateItemDto,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for item not found', async () => {
      (prismaService.invoiceItem.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.updateItem(
          'invoice-123',
          'nonexistent',
          updateItemDto,
          mockUserId,
        ),
      ).rejects.toThrow('Item de factura no encontrado');
    });

    it('should throw BadRequestException for insufficient stock when increasing quantity', async () => {
      // Current quantity is 2, new quantity is 5, diff is 3
      // Product stock is 1 (less than diff of 3)
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue({
        ...mockProduct,
        stock: 1,
      });

      await expect(
        service.updateItem(
          'invoice-123',
          'item-123',
          { quantity: 5 },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for insufficient stock', async () => {
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue({
        ...mockProduct,
        stock: 1,
      });

      await expect(
        service.updateItem(
          'invoice-123',
          'item-123',
          { quantity: 5 },
          mockUserId,
        ),
      ).rejects.toThrow(
        `Stock insuficiente para el producto: ${mockProduct.name}`,
      );
    });

    it('should decrement stock when quantity increases', async () => {
      // Current quantity is 2, new quantity is 5, diff is +3
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.updateItem(
        'invoice-123',
        'item-123',
        { quantity: 5 },
        mockUserId,
      );

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        data: {
          stock: {
            decrement: 3, // 5 - 2 = 3
          },
        },
      });
    });

    it('should increment stock when quantity decreases', async () => {
      // Current quantity is 2, new quantity is 1, diff is -1
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.updateItem(
        'invoice-123',
        'item-123',
        { quantity: 1 },
        mockUserId,
      );

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        data: {
          stock: {
            increment: 1, // abs(1 - 2) = 1
          },
        },
      });
    });

    it('should create ADJUSTMENT stock movement when quantity changes', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.updateItem(
        'invoice-123',
        'item-123',
        { quantity: 5 },
        mockUserId,
      );

      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          productId: mockProduct.id,
          userId: mockUserId,
          type: 'ADJUSTMENT',
          quantity: -3, // Negative of the diff (5 - 2 = 3)
          invoiceId: 'invoice-123',
        }),
      });
    });

    it('should not update stock when quantity is unchanged', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      // Only updating unitPrice, not quantity
      await service.updateItem(
        'invoice-123',
        'item-123',
        { unitPrice: 100 },
        mockUserId,
      );

      // product.update should not be called since quantity didn't change
      expect(txMock.product.update).not.toHaveBeenCalled();
      expect(txMock.stockMovement.create).not.toHaveBeenCalled();
    });

    it('should recalculate item totals correctly', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.updateItem(
        'invoice-123',
        'item-123',
        { quantity: 5, unitPrice: 75 },
        mockUserId,
      );

      // subtotal = 5 * 75 = 375
      // tax = 375 * 0.19 = 71.25
      // total = 375 + 71.25 - 0 = 446.25
      expect(txMock.invoiceItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: expect.objectContaining({
          quantity: 5,
          unitPrice: 75,
          subtotal: 375,
          tax: 71.25,
          total: 446.25,
        }),
      });
    });

    it('should keep existing values when not provided in dto', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      // Only update quantity, keep other values
      await service.updateItem(
        'invoice-123',
        'item-123',
        { quantity: 3 },
        mockUserId,
      );

      expect(txMock.invoiceItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: expect.objectContaining({
          quantity: 3,
          unitPrice: Number(mockInvoiceItem.unitPrice),
          taxRate: Number(mockInvoiceItem.taxRate),
          discount: Number(mockInvoiceItem.discount),
        }),
      });
    });

    it('should recalculate invoice totals', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([{ subtotal: 375, tax: 71.25, discount: 5 }]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.updateItem(
        'invoice-123',
        'item-123',
        updateItemDto,
        mockUserId,
      );

      expect(txMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: {
          subtotal: 375,
          tax: 71.25,
          discount: 5,
          total: 441.25, // 375 + 71.25 - 5
        },
        include: expect.any(Object),
      });
    });

    it('should require tenant context', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.update = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([mockInvoiceItem]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.updateItem(
        'invoice-123',
        'item-123',
        updateItemDto,
        mockUserId,
      );

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('deleteItem', () => {
    beforeEach(() => {
      // Mock invoice findFirst - DRAFT invoice
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      // Mock invoiceItem findFirst
      (prismaService.invoiceItem.findFirst as jest.Mock) = jest
        .fn()
        .mockResolvedValue({
          ...mockInvoiceItem,
          product: mockProduct,
        });

      // Setup transaction mock
      const txMock = createMockTransaction();
      txMock.invoiceItem.delete = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([]);
      txMock.invoice.update.mockResolvedValue({
        ...mockInvoice,
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        items: [],
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );
    });

    it('should delete an item from a DRAFT invoice', async () => {
      const result = await service.deleteItem(
        'invoice-123',
        'item-123',
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteItem('nonexistent', 'item-123', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteItem('nonexistent', 'item-123', mockUserId),
      ).rejects.toThrow('Factura no encontrada');
    });

    it('should throw BadRequestException for non-DRAFT invoice', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(
        service.deleteItem('invoice-123', 'item-123', mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for non-DRAFT', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(
        service.deleteItem('invoice-123', 'item-123', mockUserId),
      ).rejects.toThrow(
        'Solo se pueden eliminar items de facturas en borrador',
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      (prismaService.invoiceItem.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.deleteItem('invoice-123', 'nonexistent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for item not found', async () => {
      (prismaService.invoiceItem.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.deleteItem('invoice-123', 'nonexistent', mockUserId),
      ).rejects.toThrow('Item de factura no encontrado');
    });

    it('should restore product stock', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.delete = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.deleteItem('invoice-123', 'item-123', mockUserId);

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        data: {
          stock: {
            increment: mockInvoiceItem.quantity,
          },
        },
      });
    });

    it('should create RETURN stock movement', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.delete = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.deleteItem('invoice-123', 'item-123', mockUserId);

      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          productId: mockProduct.id,
          userId: mockUserId,
          type: 'RETURN',
          quantity: mockInvoiceItem.quantity,
          invoiceId: 'invoice-123',
        }),
      });
    });

    it('should delete the invoice item', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.delete = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.deleteItem('invoice-123', 'item-123', mockUserId);

      expect(txMock.invoiceItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-123' },
      });
    });

    it('should recalculate invoice totals after deletion', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.delete = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest
        .fn()
        .mockResolvedValue([{ subtotal: 200, tax: 38, discount: 10 }]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.deleteItem('invoice-123', 'item-123', mockUserId);

      expect(txMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: {
          subtotal: 200,
          tax: 38,
          discount: 10,
          total: 228, // 200 + 38 - 10
        },
        include: expect.any(Object),
      });
    });

    it('should set invoice totals to 0 when all items are deleted', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.delete = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.deleteItem('invoice-123', 'item-123', mockUserId);

      expect(txMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: {
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
        },
        include: expect.any(Object),
      });
    });

    it('should not update stock when item has no productId', async () => {
      (prismaService.invoiceItem.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoiceItem,
        productId: null,
        product: null,
      });

      const txMock = createMockTransaction();
      txMock.invoiceItem.delete = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.deleteItem('invoice-123', 'item-123', mockUserId);

      expect(txMock.product.update).not.toHaveBeenCalled();
      expect(txMock.stockMovement.create).not.toHaveBeenCalled();
    });

    it('should require tenant context', async () => {
      const txMock = createMockTransaction();
      txMock.invoiceItem.delete = jest.fn().mockResolvedValue({});
      txMock.invoiceItem.findMany = jest.fn().mockResolvedValue([]);
      txMock.invoice.update.mockResolvedValue(mockInvoice);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      await service.deleteItem('invoice-123', 'item-123', mockUserId);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });
});
