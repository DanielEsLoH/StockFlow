import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import type {
  InvoiceResponse,
  PaginatedInvoicesResponse,
} from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto, FilterInvoicesDto } from './dto';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import type { RequestUser } from '../auth/types';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let invoicesService: jest.Mocked<InvoicesService>;

  // Test data
  const mockUser: RequestUser = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockInvoice: InvoiceResponse = {
    id: 'invoice-123',
    tenantId: 'tenant-123',
    customerId: 'customer-123',
    userId: 'user-123',
    invoiceNumber: 'INV-00001',
    subtotal: 100,
    tax: 19,
    discount: 0,
    total: 119,
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    status: InvoiceStatus.DRAFT,
    paymentStatus: PaymentStatus.UNPAID,
    notes: 'Test invoice notes',
    dianCufe: null,
    dianXml: null,
    dianPdf: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    items: [
      {
        id: 'item-123',
        invoiceId: 'invoice-123',
        productId: 'product-123',
        quantity: 2,
        unitPrice: 50,
        taxRate: 19,
        discount: 0,
        subtotal: 100,
        tax: 19,
        total: 119,
        createdAt: new Date('2024-01-15'),
        product: {
          id: 'product-123',
          sku: 'SKU-001',
          name: 'Test Product',
        },
      },
    ],
    customer: {
      id: 'customer-123',
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '+1234567890',
    },
    user: {
      id: 'user-123',
      name: 'Admin User',
      email: 'admin@example.com',
    },
  };

  const mockInvoice2: InvoiceResponse = {
    ...mockInvoice,
    id: 'invoice-456',
    invoiceNumber: 'INV-00002',
    status: InvoiceStatus.SENT,
    paymentStatus: PaymentStatus.PAID,
  };

  const mockPaginatedResponse: PaginatedInvoicesResponse = {
    data: [mockInvoice, mockInvoice2],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const createDto: CreateInvoiceDto = {
    customerId: 'customer-123',
    items: [
      {
        productId: 'product-123',
        quantity: 2,
        unitPrice: 50,
        taxRate: 19,
        discount: 0,
      },
    ],
    dueDate: new Date('2024-02-15'),
    notes: 'Test invoice notes',
  };

  const updateDto: UpdateInvoiceDto = {
    notes: 'Updated notes',
    dueDate: new Date('2024-03-15'),
  };

  const filterDto: FilterInvoicesDto = {
    page: 1,
    limit: 10,
    status: InvoiceStatus.DRAFT,
    paymentStatus: PaymentStatus.UNPAID,
    customerId: 'customer-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockInvoicesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      send: jest.fn(),
      cancel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: mockInvoicesService }],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
    invoicesService = module.get(InvoicesService);

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
    it('should return paginated invoices with filters', async () => {
      invoicesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(filterDto);

      expect(result).toEqual(mockPaginatedResponse);
      expect(invoicesService.findAll).toHaveBeenCalledWith(filterDto);
    });

    it('should pass all filter parameters to service', async () => {
      invoicesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const filtersWithDates: FilterInvoicesDto = {
        ...filterDto,
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
      };

      await controller.findAll(filtersWithDates);

      expect(invoicesService.findAll).toHaveBeenCalledWith(filtersWithDates);
    });

    it('should handle empty filters', async () => {
      invoicesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockPaginatedResponse);
      expect(invoicesService.findAll).toHaveBeenCalledWith({});
    });

    it('should use default page 1 when page is undefined', async () => {
      invoicesService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('page: 1'),
      );
    });

    it('should use default limit 10 when limit is undefined', async () => {
      invoicesService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 2 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('limit: 10'),
      );
    });

    it('should log actual page and limit when provided', async () => {
      invoicesService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 5, limit: 25 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('page: 5'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('limit: 25'),
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      invoicesService.findAll.mockRejectedValue(error);

      await expect(controller.findAll({})).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return an invoice by id', async () => {
      invoicesService.findOne.mockResolvedValue(mockInvoice);

      const result = await controller.findOne('invoice-123');

      expect(result).toEqual(mockInvoice);
      expect(invoicesService.findOne).toHaveBeenCalledWith('invoice-123');
    });

    it('should return invoice with all relations', async () => {
      invoicesService.findOne.mockResolvedValue(mockInvoice);

      const result = await controller.findOne('invoice-123');

      expect(result.items).toBeDefined();
      expect(result.customer).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Invoice not found');
      invoicesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    it('should create and return a new invoice', async () => {
      invoicesService.create.mockResolvedValue(mockInvoice);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockInvoice);
      expect(invoicesService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.userId,
      );
    });

    it('should pass userId from @CurrentUser to service', async () => {
      invoicesService.create.mockResolvedValue(mockInvoice);

      await controller.create(createDto, mockUser);

      expect(invoicesService.create).toHaveBeenCalledWith(
        createDto,
        'user-123',
      );
    });

    it('should pass dto correctly to service', async () => {
      invoicesService.create.mockResolvedValue(mockInvoice);

      const dtoWithoutCustomer: CreateInvoiceDto = {
        items: [
          {
            productId: 'product-456',
            quantity: 5,
            unitPrice: 25,
          },
        ],
      };

      await controller.create(dtoWithoutCustomer, mockUser);

      expect(invoicesService.create).toHaveBeenCalledWith(
        dtoWithoutCustomer,
        mockUser.userId,
      );
    });

    it('should propagate validation errors', async () => {
      const error = new Error('Customer not found');
      invoicesService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        error,
      );
    });

    it('should propagate insufficient stock errors', async () => {
      const error = new Error('Insufficient stock');
      invoicesService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        error,
      );
    });

    it('should propagate monthly limit errors', async () => {
      const error = new Error('Monthly invoice limit reached');
      invoicesService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        error,
      );
    });
  });

  describe('update', () => {
    it('should update and return the invoice', async () => {
      const updatedInvoice = { ...mockInvoice, ...updateDto };
      invoicesService.update.mockResolvedValue(updatedInvoice);

      const result = await controller.update('invoice-123', updateDto);

      expect(result).toEqual(updatedInvoice);
      expect(invoicesService.update).toHaveBeenCalledWith(
        'invoice-123',
        updateDto,
      );
    });

    it('should pass id and dto correctly', async () => {
      invoicesService.update.mockResolvedValue(mockInvoice);

      await controller.update('invoice-456', updateDto);

      expect(invoicesService.update).toHaveBeenCalledWith(
        'invoice-456',
        updateDto,
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdateDto: UpdateInvoiceDto = {
        notes: 'Only notes updated',
      };
      invoicesService.update.mockResolvedValue({
        ...mockInvoice,
        notes: 'Only notes updated',
      });

      const result = await controller.update('invoice-123', partialUpdateDto);

      expect(result.notes).toBe('Only notes updated');
      expect(invoicesService.update).toHaveBeenCalledWith(
        'invoice-123',
        partialUpdateDto,
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Invoice not found');
      invoicesService.update.mockRejectedValue(error);

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(
        error,
      );
    });

    it('should propagate status validation errors', async () => {
      const error = new Error('Only DRAFT invoices can be updated');
      invoicesService.update.mockRejectedValue(error);

      await expect(controller.update('invoice-123', updateDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('delete', () => {
    it('should delete an invoice', async () => {
      invoicesService.delete.mockResolvedValue(undefined);

      await controller.delete('invoice-123');

      expect(invoicesService.delete).toHaveBeenCalledWith('invoice-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Invoice not found');
      invoicesService.delete.mockRejectedValue(error);

      await expect(controller.delete('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate status validation errors', async () => {
      const error = new Error('Only DRAFT invoices can be deleted');
      invoicesService.delete.mockRejectedValue(error);

      await expect(controller.delete('invoice-123')).rejects.toThrow(error);
    });
  });

  describe('send', () => {
    it('should send an invoice and return updated data', async () => {
      const sentInvoice = { ...mockInvoice, status: InvoiceStatus.SENT };
      invoicesService.send.mockResolvedValue(sentInvoice);

      const result = await controller.send('invoice-123');

      expect(result).toEqual(sentInvoice);
      expect(result.status).toBe(InvoiceStatus.SENT);
      expect(invoicesService.send).toHaveBeenCalledWith('invoice-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Invoice not found');
      invoicesService.send.mockRejectedValue(error);

      await expect(controller.send('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate status validation errors', async () => {
      const error = new Error('Only DRAFT invoices can be sent');
      invoicesService.send.mockRejectedValue(error);

      await expect(controller.send('invoice-123')).rejects.toThrow(error);
    });
  });

  describe('cancel', () => {
    it('should cancel an invoice and return updated data', async () => {
      const cancelledInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      };
      invoicesService.cancel.mockResolvedValue(cancelledInvoice);

      const result = await controller.cancel('invoice-123');

      expect(result).toEqual(cancelledInvoice);
      expect(result.status).toBe(InvoiceStatus.CANCELLED);
      expect(invoicesService.cancel).toHaveBeenCalledWith('invoice-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Invoice not found');
      invoicesService.cancel.mockRejectedValue(error);

      await expect(controller.cancel('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate already cancelled errors', async () => {
      const error = new Error('Invoice is already cancelled or void');
      invoicesService.cancel.mockRejectedValue(error);

      await expect(controller.cancel('invoice-123')).rejects.toThrow(error);
    });
  });

  describe('error propagation', () => {
    it('should propagate database errors from findAll', async () => {
      const dbError = new Error('Database connection failed');
      invoicesService.findAll.mockRejectedValue(dbError);

      await expect(controller.findAll({})).rejects.toThrow(dbError);
    });

    it('should propagate database errors from findOne', async () => {
      const dbError = new Error('Database connection failed');
      invoicesService.findOne.mockRejectedValue(dbError);

      await expect(controller.findOne('invoice-123')).rejects.toThrow(dbError);
    });

    it('should propagate database errors from create', async () => {
      const dbError = new Error('Database connection failed');
      invoicesService.create.mockRejectedValue(dbError);

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        dbError,
      );
    });

    it('should propagate database errors from update', async () => {
      const dbError = new Error('Database connection failed');
      invoicesService.update.mockRejectedValue(dbError);

      await expect(controller.update('invoice-123', updateDto)).rejects.toThrow(
        dbError,
      );
    });

    it('should propagate database errors from delete', async () => {
      const dbError = new Error('Database connection failed');
      invoicesService.delete.mockRejectedValue(dbError);

      await expect(controller.delete('invoice-123')).rejects.toThrow(dbError);
    });

    it('should propagate database errors from send', async () => {
      const dbError = new Error('Database connection failed');
      invoicesService.send.mockRejectedValue(dbError);

      await expect(controller.send('invoice-123')).rejects.toThrow(dbError);
    });

    it('should propagate database errors from cancel', async () => {
      const dbError = new Error('Database connection failed');
      invoicesService.cancel.mockRejectedValue(dbError);

      await expect(controller.cancel('invoice-123')).rejects.toThrow(dbError);
    });
  });
});
