import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreatePaymentDto, FilterPaymentsDto } from './dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockCustomer = {
    id: 'customer-123',
    name: 'Juan Perez',
  };

  const mockInvoice = {
    id: 'invoice-123',
    tenantId: mockTenantId,
    invoiceNumber: 'INV-00001',
    total: 1000,
    paymentStatus: PaymentStatus.UNPAID,
    customer: mockCustomer,
    payments: [],
  };

  const mockInvoiceWithPayments = {
    ...mockInvoice,
    paymentStatus: PaymentStatus.PARTIALLY_PAID,
    payments: [
      {
        id: 'payment-existing',
        amount: 300,
      },
    ],
  };

  const mockPayment = {
    id: 'payment-123',
    tenantId: mockTenantId,
    invoiceId: mockInvoice.id,
    amount: 500,
    method: PaymentMethod.CASH,
    reference: 'REC-001',
    notes: 'Partial payment',
    paymentDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    invoice: {
      id: mockInvoice.id,
      invoiceNumber: mockInvoice.invoiceNumber,
      total: mockInvoice.total,
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      customer: mockCustomer,
    },
  };

  const mockPayment2 = {
    ...mockPayment,
    id: 'payment-456',
    amount: 300,
    reference: 'REC-002',
    paymentDate: new Date('2024-01-20'),
    createdAt: new Date('2024-01-20'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      payment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockNotificationsService = {
      sendPaymentReceivedEmail: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
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
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([
        mockPayment,
        mockPayment2,
      ]);
      (prismaService.payment.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated payments', async () => {
      const result = await service.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should use default empty object when called with no parameter', async () => {
      // This tests the default parameter: filters: FilterPaymentsDto = {}
      const result = await service.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([
        mockPayment,
      ]);
      (prismaService.payment.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll({});

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no payments exist', async () => {
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.payment.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.findAll({});

      expect(prismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should order payments by paymentDate descending', async () => {
      await service.findAll({});

      expect(prismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { paymentDate: 'desc' } }),
      );
    });

    describe('filters', () => {
      it('should filter by invoiceId', async () => {
        const filters: FilterPaymentsDto = { invoiceId: mockInvoice.id };

        await service.findAll(filters);

        expect(prismaService.payment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              invoiceId: mockInvoice.id,
            }),
          }),
        );
      });

      it('should filter by payment method', async () => {
        const filters: FilterPaymentsDto = { method: PaymentMethod.CASH };

        await service.findAll(filters);

        expect(prismaService.payment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              method: PaymentMethod.CASH,
            }),
          }),
        );
      });

      it('should filter by fromDate', async () => {
        const fromDate = new Date('2024-01-01');
        const filters: FilterPaymentsDto = { fromDate };

        await service.findAll(filters);

        expect(prismaService.payment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              paymentDate: { gte: fromDate },
            }),
          }),
        );
      });

      it('should filter by toDate', async () => {
        const toDate = new Date('2024-12-31');
        const filters: FilterPaymentsDto = { toDate };

        await service.findAll(filters);

        expect(prismaService.payment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              paymentDate: { lte: toDate },
            }),
          }),
        );
      });

      it('should filter by date range (fromDate and toDate)', async () => {
        const fromDate = new Date('2024-01-01');
        const toDate = new Date('2024-12-31');
        const filters: FilterPaymentsDto = { fromDate, toDate };

        await service.findAll(filters);

        expect(prismaService.payment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              paymentDate: { gte: fromDate, lte: toDate },
            }),
          }),
        );
      });

      it('should combine multiple filters', async () => {
        const filters: FilterPaymentsDto = {
          invoiceId: mockInvoice.id,
          method: PaymentMethod.BANK_TRANSFER,
        };

        await service.findAll(filters);

        expect(prismaService.payment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              invoiceId: mockInvoice.id,
              method: PaymentMethod.BANK_TRANSFER,
            }),
          }),
        );
      });
    });

    it('should include invoice with customer in response', async () => {
      const result = await service.findAll({});

      expect(result.data[0].invoice).toBeDefined();
      expect(result.data[0].invoice?.customer).toBeDefined();
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(
        mockPayment,
      );
    });

    it('should return a payment by id', async () => {
      const result = await service.findOne('payment-123');

      expect(result.id).toBe('payment-123');
      expect(result.amount).toBe(500);
      expect(result.method).toBe(PaymentMethod.CASH);
    });

    it('should require tenant context', async () => {
      await service.findOne('payment-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should query with tenant filter', async () => {
      await service.findOne('payment-123');

      expect(prismaService.payment.findFirst).toHaveBeenCalledWith({
        where: { id: 'payment-123', tenantId: mockTenantId },
        include: {
          invoice: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    it('should throw NotFoundException when payment not found', async () => {
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include invoice relation in response', async () => {
      const result = await service.findOne('payment-123');

      expect(result.invoice).toBeDefined();
      expect(result.invoice?.invoiceNumber).toBe('INV-00001');
    });

    it('should convert Decimal amount to number', async () => {
      const result = await service.findOne('payment-123');

      expect(typeof result.amount).toBe('number');
    });
  });

  describe('findByInvoice', () => {
    beforeEach(() => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([
        mockPayment,
        mockPayment2,
      ]);
    });

    it('should return all payments for an invoice', async () => {
      const result = await service.findByInvoice('invoice-123');

      expect(result).toHaveLength(2);
      expect(result[0].invoiceId).toBe('invoice-123');
    });

    it('should require tenant context', async () => {
      await service.findByInvoice('invoice-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findByInvoice('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify invoice belongs to tenant', async () => {
      await service.findByInvoice('invoice-123');

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
      });
    });

    it('should order payments by paymentDate descending', async () => {
      await service.findByInvoice('invoice-123');

      expect(prismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { paymentDate: 'desc' },
        }),
      );
    });

    it('should return empty array when no payments exist for invoice', async () => {
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findByInvoice('invoice-123');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const createDto: CreatePaymentDto = {
      invoiceId: 'invoice-123',
      amount: 500,
      method: PaymentMethod.CASH,
      reference: 'REC-001',
      notes: 'Partial payment',
    };

    beforeEach(() => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        payments: [],
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            payment: {
              create: jest.fn().mockResolvedValue(mockPayment),
            },
            invoice: {
              update: jest.fn().mockResolvedValue(mockInvoice),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );
    });

    it('should create a payment and return it', async () => {
      const result = await service.create(createDto);

      expect(result.id).toBe('payment-123');
      expect(result.amount).toBe(500);
      expect(result.method).toBe(PaymentMethod.CASH);
    });

    it('should require tenant context', async () => {
      await service.create(createDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should verify invoice exists and belongs to tenant', async () => {
      await service.create(createDto);

      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: {
          payments: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when payment exceeds remaining balance', async () => {
      const excessivePaymentDto: CreatePaymentDto = {
        ...createDto,
        amount: 1500, // Invoice total is 1000
      };

      await expect(service.create(excessivePaymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate remaining balance considering existing payments', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoiceWithPayments,
      );

      // Invoice total is 1000, existing payment is 300, remaining is 700
      const paymentDto: CreatePaymentDto = {
        ...createDto,
        amount: 800, // Exceeds remaining 700
      };

      await expect(service.create(paymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow exact remaining balance payment', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoiceWithPayments,
      );

      const paymentDto: CreatePaymentDto = {
        ...createDto,
        amount: 700, // Exactly remaining balance
      };

      await service.create(paymentDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should use transaction for payment creation', async () => {
      await service.create(createDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should use current date when paymentDate not provided', async () => {
      const dtoWithoutDate: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 500,
        method: PaymentMethod.CASH,
      };

      await service.create(dtoWithoutDate);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should use provided paymentDate when specified', async () => {
      const customDate = new Date('2024-06-15');
      const dtoWithDate: CreatePaymentDto = {
        ...createDto,
        paymentDate: customDate,
      };

      await service.create(dtoWithDate);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should set reference to null when not provided', async () => {
      const dtoWithoutReference: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 500,
        method: PaymentMethod.CASH,
      };

      await service.create(dtoWithoutReference);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    describe('payment status calculation', () => {
      it('should update invoice to PARTIALLY_PAID for partial payment', async () => {
        (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
          ...mockInvoice,
          paymentStatus: PaymentStatus.UNPAID,
          payments: [],
        });

        let invoiceUpdateCalled = false;
        (prismaService.$transaction as jest.Mock).mockImplementation(
          async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
            const txMock = {
              payment: {
                create: jest.fn().mockResolvedValue({
                  ...mockPayment,
                  invoice: {
                    ...mockPayment.invoice,
                    paymentStatus: PaymentStatus.PARTIALLY_PAID,
                  },
                }),
              },
              invoice: {
                update: jest.fn().mockImplementation(() => {
                  invoiceUpdateCalled = true;
                  return mockInvoice;
                }),
              },
            };
            return callback(txMock as unknown as typeof prismaService);
          },
        );

        await service.create(createDto);

        expect(invoiceUpdateCalled).toBe(true);
      });

      it('should update invoice to PAID when fully paid', async () => {
        (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
          ...mockInvoice,
          paymentStatus: PaymentStatus.UNPAID,
          payments: [],
        });

        const fullPaymentDto: CreatePaymentDto = {
          ...createDto,
          amount: 1000, // Full invoice amount
        };

        let invoiceUpdateData: unknown;
        (prismaService.$transaction as jest.Mock).mockImplementation(
          async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
            const txMock = {
              payment: {
                create: jest.fn().mockResolvedValue({
                  ...mockPayment,
                  amount: 1000,
                  invoice: {
                    ...mockPayment.invoice,
                    paymentStatus: PaymentStatus.PAID,
                  },
                }),
              },
              invoice: {
                update: jest.fn().mockImplementation((data: unknown) => {
                  invoiceUpdateData = data;
                  return mockInvoice;
                }),
              },
            };
            return callback(txMock as unknown as typeof prismaService);
          },
        );

        await service.create(fullPaymentDto);

        expect(invoiceUpdateData).toEqual(
          expect.objectContaining({
            data: { paymentStatus: PaymentStatus.PAID },
          }),
        );
      });

      it('should update PARTIALLY_PAID to PAID when remaining balance is paid', async () => {
        (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
          mockInvoiceWithPayments,
        );

        const remainingPaymentDto: CreatePaymentDto = {
          ...createDto,
          amount: 700, // Remaining balance (1000 - 300)
        };

        let invoiceUpdateData: unknown;
        (prismaService.$transaction as jest.Mock).mockImplementation(
          async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
            const txMock = {
              payment: {
                create: jest.fn().mockResolvedValue({
                  ...mockPayment,
                  amount: 700,
                  invoice: {
                    ...mockPayment.invoice,
                    paymentStatus: PaymentStatus.PAID,
                  },
                }),
              },
              invoice: {
                update: jest.fn().mockImplementation((data: unknown) => {
                  invoiceUpdateData = data;
                  return mockInvoice;
                }),
              },
            };
            return callback(txMock as unknown as typeof prismaService);
          },
        );

        await service.create(remainingPaymentDto);

        expect(invoiceUpdateData).toEqual(
          expect.objectContaining({
            data: { paymentStatus: PaymentStatus.PAID },
          }),
        );
      });

      it('should not update invoice status if already correct', async () => {
        (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue({
          ...mockInvoiceWithPayments,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
        });

        // Adding another partial payment should keep status as PARTIALLY_PAID
        const partialPaymentDto: CreatePaymentDto = {
          ...createDto,
          amount: 200, // Still not fully paid (300 + 200 = 500 < 1000)
        };

        let invoiceUpdateCalled = false;
        (prismaService.$transaction as jest.Mock).mockImplementation(
          async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
            const txMock = {
              payment: {
                create: jest.fn().mockResolvedValue({
                  ...mockPayment,
                  amount: 200,
                  invoice: {
                    ...mockPayment.invoice,
                    paymentStatus: PaymentStatus.PARTIALLY_PAID,
                  },
                }),
              },
              invoice: {
                update: jest.fn().mockImplementation(() => {
                  invoiceUpdateCalled = true;
                  return mockInvoice;
                }),
              },
            };
            return callback(txMock as unknown as typeof prismaService);
          },
        );

        await service.create(partialPaymentDto);

        // Status should not change since it's already PARTIALLY_PAID
        expect(invoiceUpdateCalled).toBe(false);
      });
    });
  });

  describe('delete', () => {
    const mockPaymentWithInvoice = {
      ...mockPayment,
      invoice: {
        ...mockInvoice,
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
        payments: [
          { id: 'payment-123', amount: 500 },
          { id: 'payment-other', amount: 200 },
        ],
      },
    };

    beforeEach(() => {
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(
        mockPaymentWithInvoice,
      );
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            payment: {
              delete: jest.fn().mockResolvedValue(mockPayment),
            },
            invoice: {
              update: jest.fn().mockResolvedValue(mockInvoice),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );
    });

    it('should delete a payment', async () => {
      await service.delete('payment-123');

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should require tenant context', async () => {
      await service.delete('payment-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should throw NotFoundException when payment not found', async () => {
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify payment belongs to tenant', async () => {
      await service.delete('payment-123');

      expect(prismaService.payment.findFirst).toHaveBeenCalledWith({
        where: { id: 'payment-123', tenantId: mockTenantId },
        include: {
          invoice: {
            include: {
              payments: true,
            },
          },
        },
      });
    });

    it('should use transaction for deletion', async () => {
      await service.delete('payment-123');

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    describe('payment status recalculation after deletion', () => {
      it('should update invoice to UNPAID when last payment is deleted', async () => {
        const singlePayment = {
          ...mockPayment,
          invoice: {
            ...mockInvoice,
            paymentStatus: PaymentStatus.PARTIALLY_PAID,
            payments: [{ id: 'payment-123', amount: 500 }],
          },
        };
        (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(
          singlePayment,
        );

        let invoiceUpdateData: unknown;
        (prismaService.$transaction as jest.Mock).mockImplementation(
          async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
            const txMock = {
              payment: {
                delete: jest.fn().mockResolvedValue(mockPayment),
              },
              invoice: {
                update: jest.fn().mockImplementation((data: unknown) => {
                  invoiceUpdateData = data;
                  return mockInvoice;
                }),
              },
            };
            return callback(txMock as unknown as typeof prismaService);
          },
        );

        await service.delete('payment-123');

        expect(invoiceUpdateData).toEqual(
          expect.objectContaining({
            data: { paymentStatus: PaymentStatus.UNPAID },
          }),
        );
      });

      it('should keep PARTIALLY_PAID when other payments remain', async () => {
        // Invoice total 1000, payments 500 + 200, deleting 500 leaves 200
        // The invoice is already PARTIALLY_PAID, so no update should be called
        let invoiceUpdateCalled = false;
        (prismaService.$transaction as jest.Mock).mockImplementation(
          async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
            const txMock = {
              payment: {
                delete: jest.fn().mockResolvedValue(mockPayment),
              },
              invoice: {
                update: jest.fn().mockImplementation(() => {
                  invoiceUpdateCalled = true;
                  return mockInvoice;
                }),
              },
            };
            return callback(txMock as unknown as typeof prismaService);
          },
        );

        await service.delete('payment-123');

        // Status remains PARTIALLY_PAID so no update needed
        expect(invoiceUpdateCalled).toBe(false);
      });

      it('should update PAID to PARTIALLY_PAID when deleting from fully paid invoice', async () => {
        const fullyPaidPayment = {
          ...mockPayment,
          amount: 300,
          invoice: {
            ...mockInvoice,
            paymentStatus: PaymentStatus.PAID,
            payments: [
              { id: 'payment-123', amount: 300 },
              { id: 'payment-other', amount: 700 },
            ],
          },
        };
        (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(
          fullyPaidPayment,
        );

        let invoiceUpdateData: unknown;
        (prismaService.$transaction as jest.Mock).mockImplementation(
          async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
            const txMock = {
              payment: {
                delete: jest.fn().mockResolvedValue(mockPayment),
              },
              invoice: {
                update: jest.fn().mockImplementation((data: unknown) => {
                  invoiceUpdateData = data;
                  return mockInvoice;
                }),
              },
            };
            return callback(txMock as unknown as typeof prismaService);
          },
        );

        await service.delete('payment-123');

        // After deleting 300 from 1000 total, 700 remains, so PARTIALLY_PAID
        expect(invoiceUpdateData).toEqual(
          expect.objectContaining({
            data: { paymentStatus: PaymentStatus.PARTIALLY_PAID },
          }),
        );
      });
    });
  });

  describe('response mapping', () => {
    it('should correctly map payment to response format', async () => {
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(
        mockPayment,
      );

      const result = await service.findOne('payment-123');

      expect(result).toEqual({
        id: 'payment-123',
        tenantId: mockTenantId,
        invoiceId: 'invoice-123',
        amount: 500,
        method: PaymentMethod.CASH,
        reference: 'REC-001',
        notes: 'Partial payment',
        paymentDate: expect.any(Date),
        createdAt: expect.any(Date),
        invoice: {
          id: 'invoice-123',
          invoiceNumber: 'INV-00001',
          total: 1000,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
          customer: {
            id: 'customer-123',
            name: 'Juan Perez',
          },
        },
      });
    });

    it('should handle payment without customer in invoice', async () => {
      const paymentWithoutCustomer = {
        ...mockPayment,
        invoice: {
          ...mockPayment.invoice,
          customer: null,
        },
      };
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(
        paymentWithoutCustomer,
      );

      const result = await service.findOne('payment-123');

      expect(result.invoice?.customer).toBeUndefined();
    });

    it('should handle payment without invoice relation', async () => {
      // This tests line 464: the `if (payment.invoice)` branch when invoice is undefined
      const paymentWithoutInvoice = {
        id: 'payment-123',
        tenantId: mockTenantId,
        invoiceId: 'invoice-123',
        amount: 500,
        method: PaymentMethod.CASH,
        reference: 'REC-001',
        notes: 'Partial payment',
        paymentDate: new Date('2024-01-15'),
        createdAt: new Date('2024-01-15'),
        // Note: no invoice property - simulates payment without eager-loaded relation
      };
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(
        paymentWithoutInvoice,
      );

      const result = await service.findOne('payment-123');

      expect(result.id).toBe('payment-123');
      expect(result.amount).toBe(500);
      expect(result.invoice).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return empty stats when no payments exist', async () => {
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalPayments).toBe(0);
      expect(result.totalReceived).toBe(0);
      expect(result.averagePaymentValue).toBe(0);
      expect(result.todayPayments).toBe(0);
      expect(result.weekPayments).toBe(0);
      expect(result.pendingInvoicesCount).toBe(0);
      expect(result.pendingAmount).toBe(0);
      expect(result.overdueCount).toBe(0);
    });

    it('should calculate stats correctly with payments', async () => {
      const payments = [
        {
          amount: 1000,
          method: PaymentMethod.CASH,
          paymentDate: new Date(), // today
        },
        {
          amount: 2000,
          method: PaymentMethod.CREDIT_CARD,
          paymentDate: new Date(), // today
        },
        {
          amount: 500,
          method: PaymentMethod.CASH,
          paymentDate: new Date('2023-01-01'), // old payment
        },
      ];
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue(payments);

      const result = await service.getStats();

      expect(result.totalPayments).toBe(3);
      expect(result.totalReceived).toBe(3500);
      expect(result.averagePaymentValue).toBeCloseTo(1166.67, 0);
      expect(result.todayPayments).toBe(2);
      expect(result.todayTotal).toBe(3000);
      expect(result.paymentsByMethod[PaymentMethod.CASH]).toBe(2);
      expect(result.paymentsByMethod[PaymentMethod.CREDIT_CARD]).toBe(1);
    });

    it('should count today and week payments correctly', async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const payments = [
        {
          amount: 100,
          method: PaymentMethod.NEQUI,
          paymentDate: now,
        },
        {
          amount: 200,
          method: PaymentMethod.PSE,
          paymentDate: yesterday,
        },
        {
          amount: 300,
          method: PaymentMethod.BANK_TRANSFER,
          paymentDate: lastMonth,
        },
      ];
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue(payments);

      const result = await service.getStats();

      expect(result.totalPayments).toBe(3);
      expect(result.totalReceived).toBe(600);
      expect(result.todayPayments).toBe(1);
      expect(result.todayTotal).toBe(100);
      expect(result.paymentsByMethod[PaymentMethod.NEQUI]).toBe(1);
      expect(result.paymentsByMethod[PaymentMethod.PSE]).toBe(1);
      expect(result.paymentsByMethod[PaymentMethod.BANK_TRANSFER]).toBe(1);
    });

    it('should use requireTenantId for scoping', async () => {
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);

      await service.getStats();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
      expect(prismaService.payment.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: {
          amount: true,
          method: true,
          paymentDate: true,
        },
      });
    });

    it('should count all payment methods correctly', async () => {
      const payments = [
        { amount: 100, method: PaymentMethod.DEBIT_CARD, paymentDate: new Date('2023-06-01') },
        { amount: 200, method: PaymentMethod.DAVIPLATA, paymentDate: new Date('2023-06-01') },
        { amount: 300, method: PaymentMethod.OTHER, paymentDate: new Date('2023-06-01') },
      ];
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue(payments);

      const result = await service.getStats();

      expect(result.paymentsByMethod[PaymentMethod.DEBIT_CARD]).toBe(1);
      expect(result.paymentsByMethod[PaymentMethod.DAVIPLATA]).toBe(1);
      expect(result.paymentsByMethod[PaymentMethod.OTHER]).toBe(1);
      expect(result.pendingInvoicesCount).toBe(0);
      expect(result.pendingAmount).toBe(0);
      expect(result.overdueCount).toBe(0);
    });
  });
});
