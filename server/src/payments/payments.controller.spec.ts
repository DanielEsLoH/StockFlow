import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import type {
  PaymentResponse,
  PaginatedPaymentsResponse,
} from './payments.service';
import { CreatePaymentDto, FilterPaymentsDto } from './dto';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  // Test data
  const mockPayment: PaymentResponse = {
    id: 'payment-123',
    tenantId: 'tenant-123',
    invoiceId: 'invoice-123',
    amount: 500,
    method: PaymentMethod.CASH,
    reference: 'REC-001',
    notes: 'Partial payment',
    paymentDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    invoice: {
      id: 'invoice-123',
      invoiceNumber: 'INV-00001',
      total: 1000,
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      customer: {
        id: 'customer-123',
        name: 'Test Customer',
      },
    },
  };

  const mockPayment2: PaymentResponse = {
    ...mockPayment,
    id: 'payment-456',
    amount: 300,
    reference: 'REC-002',
    method: PaymentMethod.BANK_TRANSFER,
    paymentDate: new Date('2024-01-20'),
    createdAt: new Date('2024-01-20'),
  };

  const mockPaginatedResponse: PaginatedPaymentsResponse = {
    data: [mockPayment, mockPayment2],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const createDto: CreatePaymentDto = {
    invoiceId: 'invoice-123',
    amount: 500,
    method: PaymentMethod.CASH,
    reference: 'REC-001',
    notes: 'Partial payment',
  };

  const filterDto: FilterPaymentsDto = {
    page: 1,
    limit: 10,
    invoiceId: 'invoice-123',
    method: PaymentMethod.CASH,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPaymentsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findByInvoice: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated payments with filters', async () => {
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(filterDto);

      expect(result).toEqual(mockPaginatedResponse);
      expect(paymentsService.findAll).toHaveBeenCalledWith(filterDto);
    });

    it('should pass all filter parameters to service', async () => {
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const filtersWithDates: FilterPaymentsDto = {
        ...filterDto,
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
      };

      await controller.findAll(filtersWithDates);

      expect(paymentsService.findAll).toHaveBeenCalledWith(filtersWithDates);
    });

    it('should handle empty filters', async () => {
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockPaginatedResponse);
      expect(paymentsService.findAll).toHaveBeenCalledWith({});
    });

    it('should use default page 1 when page is undefined', async () => {
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 1'));
    });

    it('should use default limit 10 when limit is undefined', async () => {
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 2 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 10'));
    });

    it('should log actual page and limit when provided', async () => {
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 5, limit: 25 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 5'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 25'));
    });

    it('should use both default page and limit when neither provided', async () => {
      // Tests both nullish coalescing branches (lines 55: filters.page ?? 1 and filters.limit ?? 10)
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({});

      expect(logSpy).toHaveBeenCalledWith(
        'Listing payments - page: 1, limit: 10',
      );
    });

    it('should handle filters with explicit undefined values', async () => {
      // This explicitly tests the nullish coalescing when values are explicitly undefined
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      const filtersWithUndefined: FilterPaymentsDto = {
        page: undefined,
        limit: undefined,
      };

      await controller.findAll(filtersWithUndefined);

      expect(logSpy).toHaveBeenCalledWith(
        'Listing payments - page: 1, limit: 10',
      );
      expect(paymentsService.findAll).toHaveBeenCalledWith(
        filtersWithUndefined,
      );
    });

    it('should use page 0 when explicitly set (not trigger default)', async () => {
      // Tests that nullish coalescing (??) does NOT replace 0 with 1
      // since 0 is falsy but not null/undefined
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 0, limit: 10 });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing payments - page: 0, limit: 10',
      );
    });

    it('should use limit 0 when explicitly set (not trigger default)', async () => {
      // Tests that nullish coalescing (??) does NOT replace 0 with 10
      // since 0 is falsy but not null/undefined
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 1, limit: 0 });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing payments - page: 1, limit: 0',
      );
    });

    it('should use both page 0 and limit 0 when explicitly set', async () => {
      // Tests both nullish coalescing branches with falsy (but defined) values
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 0, limit: 0 });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing payments - page: 0, limit: 0',
      );
    });

    it('should use default page 1 when page is null', async () => {
      // Tests nullish coalescing with null (should trigger default)
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: null as unknown as number, limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing payments - page: 1, limit: 20',
      );
    });

    it('should use default limit 10 when limit is null', async () => {
      // Tests nullish coalescing with null (should trigger default)
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 3, limit: null as unknown as number });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing payments - page: 3, limit: 10',
      );
    });

    it('should use defaults when both page and limit are null', async () => {
      // Tests both nullish coalescing branches with null values
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({
        page: null as unknown as number,
        limit: null as unknown as number,
      });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing payments - page: 1, limit: 10',
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      paymentsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll({})).rejects.toThrow(error);
    });

    it('should return empty array when no payments exist', async () => {
      const emptyResponse: PaginatedPaymentsResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };
      paymentsService.findAll.mockResolvedValue(emptyResponse);

      const result = await controller.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalPayments: 25,
      totalReceived: 10000,
      totalPending: 2000,
      totalRefunded: 500,
      totalProcessing: 0,
      averagePaymentValue: 500,
      paymentsByStatus: { UNPAID: 5, PARTIALLY_PAID: 5, PAID: 15 },
      paymentsByMethod: { CASH: 10, CREDIT_CARD: 5, DEBIT_CARD: 3, BANK_TRANSFER: 4, PSE: 1, NEQUI: 1, DAVIPLATA: 1, OTHER: 0 },
      todayPayments: 3,
      todayTotal: 1500,
      weekPayments: 10,
      weekTotal: 5000,
    };

    it('should return payment statistics', async () => {
      paymentsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(paymentsService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should log when getting payment statistics', async () => {
      paymentsService.getStats.mockResolvedValue(mockStats);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.getStats();

      expect(logSpy).toHaveBeenCalledWith('Getting payment statistics');
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      paymentsService.getStats.mockRejectedValue(error);

      await expect(controller.getStats()).rejects.toThrow(error);
    });

    it('should return empty stats when no payments exist', async () => {
      const emptyStats = {
        totalPayments: 0,
        totalReceived: 0,
        totalPending: 0,
        totalRefunded: 0,
        totalProcessing: 0,
        averagePaymentValue: 0,
        paymentsByStatus: {},
        paymentsByMethod: {},
        todayPayments: 0,
        todayTotal: 0,
        weekPayments: 0,
        weekTotal: 0,
      };
      paymentsService.getStats.mockResolvedValue(emptyStats as any);

      const result = await controller.getStats();

      expect(result.totalPayments).toBe(0);
      expect(result.totalReceived).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      paymentsService.findOne.mockResolvedValue(mockPayment);

      const result = await controller.findOne('payment-123');

      expect(result).toEqual(mockPayment);
      expect(paymentsService.findOne).toHaveBeenCalledWith('payment-123');
    });

    it('should return payment with all relations', async () => {
      paymentsService.findOne.mockResolvedValue(mockPayment);

      const result = await controller.findOne('payment-123');

      expect(result.invoice).toBeDefined();
      expect(result.invoice?.customer).toBeDefined();
    });

    it('should log the payment id being retrieved', async () => {
      paymentsService.findOne.mockResolvedValue(mockPayment);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findOne('payment-123');

      expect(logSpy).toHaveBeenCalledWith('Getting payment: payment-123');
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Payment not found');
      paymentsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      paymentsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('payment-123')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    it('should create and return a new payment', async () => {
      paymentsService.create.mockResolvedValue(mockPayment);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockPayment);
      expect(paymentsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should pass dto correctly to service', async () => {
      paymentsService.create.mockResolvedValue(mockPayment);

      await controller.create(createDto);

      expect(paymentsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should log invoice id and amount being created', async () => {
      paymentsService.create.mockResolvedValue(mockPayment);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.create(createDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('invoice-123'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('500'));
    });

    it('should create payment without optional fields', async () => {
      const minimalDto: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 250,
        method: PaymentMethod.NEQUI,
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        amount: 250,
        method: PaymentMethod.NEQUI,
        reference: null,
        notes: null,
      });

      const result = await controller.create(minimalDto);

      expect(result.amount).toBe(250);
      expect(paymentsService.create).toHaveBeenCalledWith(minimalDto);
    });

    it('should propagate validation errors', async () => {
      const error = new NotFoundException('Invoice not found');
      paymentsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });

    it('should propagate bad request errors for excess payment', async () => {
      const error = new BadRequestException(
        'Payment exceeds remaining balance',
      );
      paymentsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });

    it('should handle different payment methods', async () => {
      const methods = [
        PaymentMethod.CASH,
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.DEBIT_CARD,
        PaymentMethod.BANK_TRANSFER,
        PaymentMethod.PSE,
        PaymentMethod.NEQUI,
        PaymentMethod.DAVIPLATA,
        PaymentMethod.OTHER,
      ];

      for (const method of methods) {
        const dto: CreatePaymentDto = {
          invoiceId: 'invoice-123',
          amount: 100,
          method,
        };
        paymentsService.create.mockResolvedValue({ ...mockPayment, method });

        const result = await controller.create(dto);

        expect(result.method).toBe(method);
      }
    });

    it('should handle payment with custom date', async () => {
      const customDate = new Date('2024-06-15');
      const dtoWithDate: CreatePaymentDto = {
        ...createDto,
        paymentDate: customDate,
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        paymentDate: customDate,
      });

      const result = await controller.create(dtoWithDate);

      expect(result.paymentDate).toEqual(customDate);
      expect(paymentsService.create).toHaveBeenCalledWith(dtoWithDate);
    });
  });

  describe('delete', () => {
    it('should delete a payment', async () => {
      paymentsService.delete.mockResolvedValue(undefined);

      await controller.delete('payment-123');

      expect(paymentsService.delete).toHaveBeenCalledWith('payment-123');
    });

    it('should log the payment id being deleted', async () => {
      paymentsService.delete.mockResolvedValue(undefined);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.delete('payment-123');

      expect(logSpy).toHaveBeenCalledWith('Deleting payment: payment-123');
    });

    it('should return void on successful deletion', async () => {
      paymentsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('payment-123');

      expect(result).toBeUndefined();
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Payment not found');
      paymentsService.delete.mockRejectedValue(error);

      await expect(controller.delete('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      paymentsService.delete.mockRejectedValue(error);

      await expect(controller.delete('payment-123')).rejects.toThrow(error);
    });
  });

  describe('HTTP methods and decorators', () => {
    it('controller methods should exist', () => {
      expect(controller.findAll).toBeDefined();
      expect(controller.getStats).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.create).toBeDefined();
      expect(controller.delete).toBeDefined();
    });

    it('should call service methods with correct arguments', async () => {
      paymentsService.findAll.mockResolvedValue(mockPaginatedResponse);
      paymentsService.findOne.mockResolvedValue(mockPayment);
      paymentsService.create.mockResolvedValue(mockPayment);
      paymentsService.delete.mockResolvedValue(undefined);

      await controller.findAll(filterDto);
      expect(paymentsService.findAll).toHaveBeenCalledTimes(1);

      await controller.findOne('payment-123');
      expect(paymentsService.findOne).toHaveBeenCalledTimes(1);

      await controller.create(createDto);
      expect(paymentsService.create).toHaveBeenCalledTimes(1);

      await controller.delete('payment-123');
      expect(paymentsService.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle maximum amount values', async () => {
      const largeAmountDto: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 9999999.99,
        method: PaymentMethod.BANK_TRANSFER,
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        amount: 9999999.99,
      });

      const result = await controller.create(largeAmountDto);

      expect(result.amount).toBe(9999999.99);
    });

    it('should handle minimum amount values', async () => {
      const minAmountDto: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 0.01,
        method: PaymentMethod.CASH,
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        amount: 0.01,
      });

      const result = await controller.create(minAmountDto);

      expect(result.amount).toBe(0.01);
    });

    it('should handle long reference strings', async () => {
      const longReference = 'REF-' + 'X'.repeat(200);
      const dtoWithLongRef: CreatePaymentDto = {
        ...createDto,
        reference: longReference,
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        reference: longReference,
      });

      const result = await controller.create(dtoWithLongRef);

      expect(result.reference).toBe(longReference);
    });

    it('should handle empty notes', async () => {
      const dtoWithEmptyNotes: CreatePaymentDto = {
        ...createDto,
        notes: '',
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        notes: '',
      });

      const result = await controller.create(dtoWithEmptyNotes);

      expect(result.notes).toBe('');
    });

    it('should handle payment with null customer in invoice', async () => {
      const paymentWithNullCustomer: PaymentResponse = {
        ...mockPayment,
        invoice: {
          ...mockPayment.invoice!,
          customer: null,
        },
      };
      paymentsService.findOne.mockResolvedValue(paymentWithNullCustomer);

      const result = await controller.findOne('payment-123');

      expect(result.invoice?.customer).toBeNull();
    });

    it('should handle payment without invoice relation', async () => {
      const paymentWithoutInvoice: PaymentResponse = {
        ...mockPayment,
        invoice: undefined,
      };
      paymentsService.findOne.mockResolvedValue(paymentWithoutInvoice);

      const result = await controller.findOne('payment-123');

      expect(result.invoice).toBeUndefined();
    });

    it('should handle UUID payment id', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      paymentsService.findOne.mockResolvedValue({
        ...mockPayment,
        id: uuidId,
      });

      const result = await controller.findOne(uuidId);

      expect(result.id).toBe(uuidId);
      expect(paymentsService.findOne).toHaveBeenCalledWith(uuidId);
    });

    it('should handle different id formats for deletion', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      paymentsService.delete.mockResolvedValue(undefined);

      await controller.delete(uuidId);

      expect(paymentsService.delete).toHaveBeenCalledWith(uuidId);
    });

    it('should log correct format for create with decimal amount', async () => {
      const dtoWithDecimalAmount: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 123.45,
        method: PaymentMethod.CASH,
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        amount: 123.45,
      });
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.create(dtoWithDecimalAmount);

      expect(logSpy).toHaveBeenCalledWith(
        'Recording payment for invoice invoice-123, amount: 123.45',
      );
    });

    it('should handle null reference and notes in create dto', async () => {
      const dtoWithNulls: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 100,
        method: PaymentMethod.CASH,
        reference: undefined,
        notes: undefined,
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        reference: null,
        notes: null,
      });

      const result = await controller.create(dtoWithNulls);

      expect(result.reference).toBeNull();
      expect(result.notes).toBeNull();
    });
  });

  describe('findOne edge cases', () => {
    it('should handle empty string id', async () => {
      paymentsService.findOne.mockResolvedValue(mockPayment);

      await controller.findOne('');

      expect(paymentsService.findOne).toHaveBeenCalledWith('');
    });

    it('should handle special characters in id', async () => {
      const specialId = 'payment-123-abc';
      paymentsService.findOne.mockResolvedValue({
        ...mockPayment,
        id: specialId,
      });

      const result = await controller.findOne(specialId);

      expect(result.id).toBe(specialId);
    });
  });

  describe('create edge cases', () => {
    it('should handle zero amount', async () => {
      const zeroAmountDto: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 0,
        method: PaymentMethod.CASH,
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        amount: 0,
      });

      const result = await controller.create(zeroAmountDto);

      expect(result.amount).toBe(0);
    });

    it('should handle payment with all optional fields', async () => {
      const fullDto: CreatePaymentDto = {
        invoiceId: 'invoice-123',
        amount: 500,
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'REF-123',
        notes: 'Full payment',
        paymentDate: new Date('2024-06-15'),
      };
      paymentsService.create.mockResolvedValue({
        ...mockPayment,
        ...fullDto,
      });

      const result = await controller.create(fullDto);

      expect(result.reference).toBe('REF-123');
      expect(result.notes).toBe('Full payment');
      expect(paymentsService.create).toHaveBeenCalledWith(fullDto);
    });
  });

  describe('delete edge cases', () => {
    it('should handle empty string id for deletion', async () => {
      paymentsService.delete.mockResolvedValue(undefined);

      await controller.delete('');

      expect(paymentsService.delete).toHaveBeenCalledWith('');
    });

    it('should complete deletion and return void', async () => {
      paymentsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('payment-123');

      expect(result).toBeUndefined();
      expect(paymentsService.delete).toHaveBeenCalledTimes(1);
    });
  });
});
