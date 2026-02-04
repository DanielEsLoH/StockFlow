import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { POSSalesService } from './pos-sales.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  POSSessionStatus,
  InvoiceStatus,
  InvoiceSource,
  PaymentMethod,
  PaymentStatus,
  CashMovementType,
  MovementType,
} from '@prisma/client';
import type { CreateSaleDto } from './dto';

describe('POSSalesService', () => {
  let service: POSSalesService;
  let prisma: any;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';
  const mockProductId = 'product-123';
  const mockInvoiceId = 'invoice-123';

  const mockSession = {
    id: mockSessionId,
    tenantId: mockTenantId,
    userId: mockUserId,
    status: POSSessionStatus.ACTIVE,
    cashRegister: {
      id: 'cash-register-123',
      name: 'Caja Principal',
      code: 'CAJA-001',
      warehouseId: 'warehouse-123',
    },
  };

  const mockProduct = {
    id: mockProductId,
    tenantId: mockTenantId,
    name: 'Test Product',
    sku: 'TEST-001',
    salePrice: 100,
    taxRate: 19,
    stock: 50,
  };

  const mockInvoice = {
    id: mockInvoiceId,
    tenantId: mockTenantId,
    invoiceNumber: 'INV-00001',
    source: InvoiceSource.POS,
    status: InvoiceStatus.SENT,
    subtotal: 100,
    tax: 19,
    discount: 0,
    total: 119,
    notes: null,
    customer: null,
    items: [
      {
        id: 'item-123',
        productId: mockProductId,
        product: { id: mockProductId, name: 'Test Product', sku: 'TEST-001' },
        quantity: 1,
        unitPrice: 100,
        taxRate: 19,
        discount: 0,
        subtotal: 100,
        tax: 19,
        total: 119,
      },
    ],
  };

  const mockSale = {
    id: 'sale-123',
    tenantId: mockTenantId,
    sessionId: mockSessionId,
    invoiceId: mockInvoiceId,
    saleNumber: 'POS-00001',
    subtotal: 100,
    tax: 19,
    discount: 0,
    total: 119,
    createdAt: new Date(),
    invoice: mockInvoice,
    payments: [
      {
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 119,
        reference: null,
        cardLastFour: null,
        createdAt: new Date(),
      },
    ],
    session: {
      id: mockSessionId,
      status: POSSessionStatus.ACTIVE,
      cashRegister: {
        id: 'cash-register-123',
        name: 'Caja Principal',
        code: 'CAJA-001',
        warehouseId: 'warehouse-123',
      },
    },
  };

  // Create a mock transaction client that shares state with prisma mock
  const createMockTx = (baseMock: any) => ({
    pOSSale: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    pOSSession: baseMock.pOSSession,
    product: baseMock.product,
    customer: baseMock.customer,
    invoice: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    salePayment: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    cashRegisterMovement: {
      create: jest.fn(),
    },
    warehouseStock: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    user: baseMock.user,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      pOSSession: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      pOSSale: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      salePayment: {
        create: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      cashRegisterMovement: {
        create: jest.fn(),
      },
      warehouseStock: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        POSSalesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<POSSalesService>(POSSalesService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a sale by id with details', async () => {
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(mockSale);

      const result = await service.findOne('sale-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('sale-123');
      expect(result.saleNumber).toBe('POS-00001');
      expect(prisma.pOSSale.findFirst).toHaveBeenCalledWith({
        where: { id: 'sale-123', tenantId: mockTenantId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when sale not found', async () => {
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should require tenant context', async () => {
      (tenantContext.requireTenantId as jest.Mock).mockImplementation(() => {
        throw new Error('Tenant context required');
      });

      await expect(service.findOne('sale-123')).rejects.toThrow(
        'Tenant context required',
      );
    });

    it('should handle item without product name', async () => {
      const saleWithNoProduct = {
        ...mockSale,
        invoice: {
          ...mockInvoice,
          items: [
            {
              ...mockInvoice.items[0],
              product: null,
            },
          ],
        },
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        saleWithNoProduct,
      );

      const result = await service.findOne('sale-123');

      expect(result.invoice.items[0].productName).toBe('Unknown');
      expect(result.invoice.items[0].productSku).toBe('N/A');
    });
  });

  describe('findAll', () => {
    it('should return paginated sales', async () => {
      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([mockSale]);
      (prisma.pOSSale.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prisma.pOSSale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by sessionId when provided', async () => {
      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, mockSessionId);

      expect(prisma.pOSSale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionId: mockSessionId,
          }),
        }),
      );
    });

    it('should filter by date range when provided', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, undefined, fromDate, toDate);

      expect(prisma.pOSSale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: fromDate,
              lte: toDate,
            }),
          }),
        }),
      );
    });

    it('should filter by fromDate only', async () => {
      const fromDate = new Date('2024-01-01');

      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, undefined, fromDate);

      expect(prisma.pOSSale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: fromDate,
            }),
          }),
        }),
      );
    });

    it('should filter by toDate only', async () => {
      const toDate = new Date('2024-12-31');

      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, undefined, undefined, toDate);

      expect(prisma.pOSSale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lte: toDate,
            }),
          }),
        }),
      );
    });

    it('should return empty array when no sales exist', async () => {
      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([mockSale]);
      (prisma.pOSSale.count as jest.Mock).mockResolvedValue(25);

      const result = await service.findAll(1, 10);

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('createSale', () => {
    const createDto: CreateSaleDto = {
      items: [{ productId: mockProductId, quantity: 1 }],
      payments: [{ method: PaymentMethod.CASH, amount: 119 }],
    };

    it('should throw BadRequestException when no active session', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.createSale(createDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createSale(createDto, mockUserId)).rejects.toThrow(
        'No active POS session found',
      );
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const dtoWithCustomer = { ...createDto, customerId: 'customer-123' };
      await expect(
        service.createSale(dtoWithCustomer, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when product not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.createSale(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createSale(createDto, mockUserId)).rejects.toThrow(
        'Products not found',
      );
    });

    it('should throw BadRequestException when payment total does not match', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const dtoWithWrongPayment = {
        items: [{ productId: mockProductId, quantity: 1 }],
        payments: [{ method: PaymentMethod.CASH, amount: 50 }], // Wrong amount
      };

      await expect(
        service.createSale(dtoWithWrongPayment, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createSale(dtoWithWrongPayment, mockUserId),
      ).rejects.toThrow('Payment total');
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, stock: 0 };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        lowStockProduct,
      ]);

      const dtoWithHighQuantity = {
        items: [{ productId: mockProductId, quantity: 10 }],
        payments: [{ method: PaymentMethod.CASH, amount: 1190 }],
      };

      await expect(
        service.createSale(dtoWithHighQuantity, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createSale(dtoWithHighQuantity, mockUserId),
      ).rejects.toThrow('Insufficient stock');
    });

    it('should create sale successfully', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue(null);
      mockTx.invoice.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue(mockInvoice);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        tenantId: mockTenantId,
        sessionId: mockSessionId,
        invoiceId: mockInvoiceId,
        saleNumber: 'POS-00001',
        subtotal: 100,
        tax: 19,
        discount: 0,
        total: 119,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 119,
        reference: null,
        cardLastFour: null,
        createdAt: new Date(),
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const result = await callback(mockTx);
          return {
            ...result,
            invoice: mockInvoice,
            payments: [
              mockTx.salePayment.create.mock.results[0]?.value || {
                id: 'payment-123',
                method: PaymentMethod.CASH,
                amount: 119,
                createdAt: new Date(),
              },
            ],
            session: mockSession,
          };
        },
      );

      const result = await service.createSale(createDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.saleNumber).toBe('POS-00001');
    });

    it('should create sale with customer', async () => {
      const mockCustomer = { id: 'customer-123', name: 'Test Customer' };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: {
          id: 'customer-123',
          name: 'Test Customer',
          documentNumber: '123',
        },
      };

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue(null);
      mockTx.invoice.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue(invoiceWithCustomer);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        tenantId: mockTenantId,
        sessionId: mockSessionId,
        invoiceId: mockInvoiceId,
        saleNumber: 'POS-00001',
        subtotal: 100,
        tax: 19,
        discount: 0,
        total: 119,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 119,
        createdAt: new Date(),
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          await callback(mockTx);
          return {
            id: 'sale-123',
            tenantId: mockTenantId,
            sessionId: mockSessionId,
            invoiceId: mockInvoiceId,
            saleNumber: 'POS-00001',
            subtotal: 100,
            tax: 19,
            discount: 0,
            total: 119,
            createdAt: new Date(),
            invoice: invoiceWithCustomer,
            payments: [
              {
                id: 'payment-123',
                method: PaymentMethod.CASH,
                amount: 119,
                createdAt: new Date(),
              },
            ],
            session: mockSession,
          };
        },
      );

      const dtoWithCustomer = { ...createDto, customerId: 'customer-123' };
      const result = await service.createSale(dtoWithCustomer, mockUserId);

      expect(result).toBeDefined();
    });

    it('should handle item discount percent', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue(null);
      mockTx.invoice.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue(mockInvoice);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        saleNumber: 'POS-00001',
        subtotal: 90,
        tax: 17.1,
        discount: 10,
        total: 107.1,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 107.1,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const result = await callback(mockTx);
          return {
            ...result,
            invoice: mockInvoice,
            payments: [mockTx.salePayment.create.mock.results[0]?.value],
            session: mockSession,
          };
        },
      );

      const dtoWithDiscount = {
        items: [{ productId: mockProductId, quantity: 1, discountPercent: 10 }],
        payments: [{ method: PaymentMethod.CASH, amount: 107.1 }],
      };

      const result = await service.createSale(dtoWithDiscount, mockUserId);
      expect(result).toBeDefined();
    });

    it('should handle global discount percent', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue(null);
      mockTx.invoice.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue(mockInvoice);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        saleNumber: 'POS-00001',
        subtotal: 100,
        tax: 19,
        discount: 5,
        total: 114,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 114,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const result = await callback(mockTx);
          return {
            ...result,
            invoice: mockInvoice,
            payments: [mockTx.salePayment.create.mock.results[0]?.value],
            session: mockSession,
          };
        },
      );

      const dtoWithGlobalDiscount = {
        items: [{ productId: mockProductId, quantity: 1 }],
        payments: [{ method: PaymentMethod.CASH, amount: 114 }],
        discountPercent: 5,
      };

      const result = await service.createSale(
        dtoWithGlobalDiscount,
        mockUserId,
      );
      expect(result).toBeDefined();
    });

    it('should handle custom unit price', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue(null);
      mockTx.invoice.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue(mockInvoice);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        saleNumber: 'POS-00001',
        subtotal: 80,
        tax: 15.2,
        discount: 0,
        total: 95.2,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 95.2,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const result = await callback(mockTx);
          return {
            ...result,
            invoice: mockInvoice,
            payments: [mockTx.salePayment.create.mock.results[0]?.value],
            session: mockSession,
          };
        },
      );

      const dtoWithCustomPrice = {
        items: [{ productId: mockProductId, quantity: 1, unitPrice: 80 }],
        payments: [{ method: PaymentMethod.CASH, amount: 95.2 }],
      };

      const result = await service.createSale(dtoWithCustomPrice, mockUserId);
      expect(result).toBeDefined();
    });

    it('should handle split payments', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue(null);
      mockTx.invoice.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue(mockInvoice);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        saleNumber: 'POS-00001',
        subtotal: 100,
        tax: 19,
        discount: 0,
        total: 119,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-1',
        method: PaymentMethod.CASH,
        amount: 60,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const result = await callback(mockTx);
          return {
            ...result,
            invoice: mockInvoice,
            payments: [
              {
                id: 'payment-1',
                method: PaymentMethod.CASH,
                amount: 60,
                createdAt: new Date(),
              },
              {
                id: 'payment-2',
                method: PaymentMethod.CREDIT_CARD,
                amount: 59,
                cardLastFour: '1234',
                createdAt: new Date(),
              },
            ],
            session: mockSession,
          };
        },
      );

      const dtoSplitPayments = {
        items: [{ productId: mockProductId, quantity: 1 }],
        payments: [
          { method: PaymentMethod.CASH, amount: 60 },
          {
            method: PaymentMethod.CREDIT_CARD,
            amount: 59,
            cardLastFour: '1234',
          },
        ],
      };

      const result = await service.createSale(dtoSplitPayments, mockUserId);
      expect(result).toBeDefined();
      expect(result.payments).toHaveLength(2);
    });

    it('should handle session without warehouse', async () => {
      const sessionNoWarehouse = {
        ...mockSession,
        cashRegister: { ...mockSession.cashRegister, warehouseId: null },
      };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(
        sessionNoWarehouse,
      );
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue(null);
      mockTx.invoice.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue(mockInvoice);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        saleNumber: 'POS-00001',
        subtotal: 100,
        tax: 19,
        discount: 0,
        total: 119,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 119,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const result = await callback(mockTx);
          return {
            ...result,
            invoice: mockInvoice,
            payments: [mockTx.salePayment.create.mock.results[0]?.value],
            session: sessionNoWarehouse,
          };
        },
      );

      const result = await service.createSale(createDto, mockUserId);
      expect(result).toBeDefined();
    });

    it('should generate sequential sale numbers', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue({ saleNumber: 'POS-00099' });
      mockTx.invoice.findFirst.mockResolvedValue({
        invoiceNumber: 'INV-00050',
      });
      mockTx.invoice.create.mockResolvedValue(mockInvoice);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        saleNumber: 'POS-00100',
        subtotal: 100,
        tax: 19,
        discount: 0,
        total: 119,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 119,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const result = await callback(mockTx);
          return {
            ...result,
            invoice: mockInvoice,
            payments: [mockTx.salePayment.create.mock.results[0]?.value],
            session: mockSession,
          };
        },
      );

      const result = await service.createSale(createDto, mockUserId);
      expect(result).toBeDefined();
    });

    it('should handle multiple products in one sale', async () => {
      const product2 = {
        ...mockProduct,
        id: 'product-456',
        name: 'Product 2',
        salePrice: 200,
      };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
        product2,
      ]);

      const invoiceMultiItems = {
        ...mockInvoice,
        items: [
          { ...mockInvoice.items[0] },
          {
            ...mockInvoice.items[0],
            id: 'item-456',
            productId: 'product-456',
            product: { id: 'product-456', name: 'Product 2', sku: 'TEST-002' },
          },
        ],
      };

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue(null);
      mockTx.invoice.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue(invoiceMultiItems);
      mockTx.pOSSale.create.mockResolvedValue({
        id: 'sale-123',
        tenantId: mockTenantId,
        sessionId: mockSessionId,
        invoiceId: mockInvoiceId,
        saleNumber: 'POS-00001',
        subtotal: 300,
        tax: 57,
        discount: 0,
        total: 357,
        createdAt: new Date(),
      });
      mockTx.salePayment.create.mockResolvedValue({
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 357,
        createdAt: new Date(),
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          await callback(mockTx);
          return {
            id: 'sale-123',
            tenantId: mockTenantId,
            sessionId: mockSessionId,
            invoiceId: mockInvoiceId,
            saleNumber: 'POS-00001',
            subtotal: 300,
            tax: 57,
            discount: 0,
            total: 357,
            createdAt: new Date(),
            invoice: invoiceMultiItems,
            payments: [
              {
                id: 'payment-123',
                method: PaymentMethod.CASH,
                amount: 357,
                createdAt: new Date(),
              },
            ],
            session: mockSession,
          };
        },
      );

      const dtoMultipleProducts = {
        items: [
          { productId: mockProductId, quantity: 1 },
          { productId: 'product-456', quantity: 1 },
        ],
        payments: [{ method: PaymentMethod.CASH, amount: 357 }],
      };

      const result = await service.createSale(dtoMultipleProducts, mockUserId);
      expect(result).toBeDefined();
    });
  });

  describe('voidSale', () => {
    const mockSaleForVoid = {
      ...mockSale,
      invoice: {
        ...mockInvoice,
        status: InvoiceStatus.SENT,
        notes: 'Original note',
        items: [
          {
            id: 'item-123',
            productId: mockProductId,
            product: {
              id: mockProductId,
              name: 'Test Product',
              sku: 'TEST-001',
            },
            quantity: 1,
            unitPrice: 100,
            taxRate: 19,
            discount: 0,
            subtotal: 100,
            tax: 19,
            total: 119,
          },
        ],
      },
      session: {
        id: mockSessionId,
        status: POSSessionStatus.ACTIVE,
        cashRegister: {
          id: 'cash-register-123',
          name: 'Caja Principal',
          code: 'CAJA-001',
          warehouseId: 'warehouse-123',
        },
      },
    };

    it('should throw NotFoundException when sale not found', async () => {
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.voidSale('nonexistent', mockUserId, 'Test reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when sale already voided', async () => {
      const voidedSale = {
        ...mockSaleForVoid,
        invoice: { ...mockSaleForVoid.invoice, status: InvoiceStatus.VOID },
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(voidedSale);

      await expect(
        service.voidSale('sale-123', mockUserId, 'Test reason'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.voidSale('sale-123', mockUserId, 'Test reason'),
      ).rejects.toThrow('already been voided');
    });

    it('should throw BadRequestException when sale cancelled', async () => {
      const cancelledSale = {
        ...mockSaleForVoid,
        invoice: {
          ...mockSaleForVoid.invoice,
          status: InvoiceStatus.CANCELLED,
        },
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(cancelledSale);

      await expect(
        service.voidSale('sale-123', mockUserId, 'Test reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when session closed and user is not admin', async () => {
      const closedSessionSale = {
        ...mockSaleForVoid,
        session: {
          ...mockSaleForVoid.session,
          status: POSSessionStatus.CLOSED,
        },
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        closedSessionSale,
      );
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        role: 'EMPLOYEE',
      });

      await expect(
        service.voidSale('sale-123', 'other-user', 'Test reason'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user not found', async () => {
      const closedSessionSale = {
        ...mockSaleForVoid,
        session: {
          ...mockSaleForVoid.session,
          status: POSSessionStatus.CLOSED,
        },
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        closedSessionSale,
      );
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.voidSale('sale-123', 'other-user', 'Test reason'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to void from closed session', async () => {
      const closedSessionSale = {
        ...mockSaleForVoid,
        session: {
          ...mockSaleForVoid.session,
          status: POSSessionStatus.CLOSED,
        },
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        closedSessionSale,
      );
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ role: 'ADMIN' });

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue({
        ...closedSessionSale,
        invoice: { ...mockSaleForVoid.invoice, status: InvoiceStatus.VOID },
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback(mockTx);
        },
      );

      const result = await service.voidSale(
        'sale-123',
        'admin-user',
        'Test reason',
      );
      expect(result).toBeDefined();
    });

    it('should allow manager to void from closed session', async () => {
      const closedSessionSale = {
        ...mockSaleForVoid,
        session: {
          ...mockSaleForVoid.session,
          status: POSSessionStatus.CLOSED,
        },
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        closedSessionSale,
      );
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        role: 'MANAGER',
      });

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue({
        ...closedSessionSale,
        invoice: { ...mockSaleForVoid.invoice, status: InvoiceStatus.VOID },
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback(mockTx);
        },
      );

      const result = await service.voidSale(
        'sale-123',
        'manager-user',
        'Test reason',
      );
      expect(result).toBeDefined();
    });

    it('should void sale successfully', async () => {
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        mockSaleForVoid,
      );

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue({
        ...mockSaleForVoid,
        invoice: { ...mockSaleForVoid.invoice, status: InvoiceStatus.VOID },
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback(mockTx);
        },
      );

      const result = await service.voidSale(
        'sale-123',
        mockUserId,
        'Customer return',
      );
      expect(result).toBeDefined();
    });

    it('should skip items without productId', async () => {
      const saleWithNullProduct = {
        ...mockSaleForVoid,
        invoice: {
          ...mockSaleForVoid.invoice,
          items: [{ ...mockSaleForVoid.invoice.items[0], productId: null }],
        },
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        saleWithNullProduct,
      );

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue({
        ...saleWithNullProduct,
        invoice: { ...saleWithNullProduct.invoice, status: InvoiceStatus.VOID },
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback(mockTx);
        },
      );

      const result = await service.voidSale('sale-123', mockUserId, 'reason');
      expect(result).toBeDefined();
      expect(mockTx.product.update).not.toHaveBeenCalled();
    });

    it('should restore warehouse stock when voiding', async () => {
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        mockSaleForVoid,
      );

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue({
        ...mockSaleForVoid,
        invoice: { ...mockSaleForVoid.invoice, status: InvoiceStatus.VOID },
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback(mockTx);
        },
      );

      await service.voidSale('sale-123', mockUserId, 'reason');

      expect(mockTx.product.update).toHaveBeenCalled();
      expect(mockTx.warehouseStock.update).toHaveBeenCalled();
      expect(mockTx.stockMovement.create).toHaveBeenCalled();
    });

    it('should create refund movements for each payment', async () => {
      const saleWithMultiplePayments = {
        ...mockSaleForVoid,
        payments: [
          { id: 'payment-1', method: PaymentMethod.CASH, amount: 60 },
          { id: 'payment-2', method: PaymentMethod.CREDIT_CARD, amount: 59 },
        ],
      };
      (prisma.pOSSale.findFirst as jest.Mock).mockResolvedValue(
        saleWithMultiplePayments,
      );

      const mockTx = createMockTx(prisma);
      mockTx.pOSSale.findFirst.mockResolvedValue({
        ...saleWithMultiplePayments,
        invoice: { ...mockSaleForVoid.invoice, status: InvoiceStatus.VOID },
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback(mockTx);
        },
      );

      await service.voidSale('sale-123', mockUserId, 'reason');

      expect(mockTx.cashRegisterMovement.create).toHaveBeenCalledTimes(2);
    });
  });
});
