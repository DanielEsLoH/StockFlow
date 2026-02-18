/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import type {
  QuotationResponse,
  PaginatedQuotationsResponse,
} from './quotations.service';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  FilterQuotationsDto,
} from './dto';
import { QuotationStatus } from '@prisma/client';
import type { RequestUser } from '../auth';

describe('QuotationsController', () => {
  let controller: QuotationsController;
  let quotationsService: jest.Mocked<QuotationsService>;

  // Test data
  const mockUser: RequestUser = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockQuotation: QuotationResponse = {
    id: 'quotation-123',
    tenantId: 'tenant-123',
    customerId: 'customer-123',
    userId: 'user-123',
    quotationNumber: 'COT-00001',
    subtotal: 100,
    tax: 19,
    discount: 0,
    total: 119,
    issueDate: new Date('2024-01-15'),
    validUntil: new Date('2024-02-15'),
    status: QuotationStatus.DRAFT,
    notes: 'Test quotation notes',
    convertedToInvoiceId: null,
    convertedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    items: [
      {
        id: 'item-123',
        quotationId: 'quotation-123',
        productId: 'product-123',
        quantity: 2,
        unitPrice: 50,
        taxRate: 19,
        taxCategory: 'GRAVADO_19',
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
      documentType: 'CC',
      documentNumber: '123456789',
      address: null,
      city: null,
    },
    user: {
      id: 'user-123',
      name: 'Admin User',
      email: 'admin@example.com',
    },
  };

  const mockQuotation2: QuotationResponse = {
    ...mockQuotation,
    id: 'quotation-456',
    quotationNumber: 'COT-00002',
    status: QuotationStatus.SENT,
  };

  const mockPaginatedResponse: PaginatedQuotationsResponse = {
    data: [mockQuotation, mockQuotation2],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const createDto: CreateQuotationDto = {
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
    validUntil: new Date('2024-02-15'),
    notes: 'Test quotation notes',
  };

  const updateDto: UpdateQuotationDto = {
    notes: 'Updated notes',
    validUntil: new Date('2024-03-15'),
  };

  const filterDto: FilterQuotationsDto = {
    page: 1,
    limit: 10,
    status: QuotationStatus.DRAFT,
    customerId: 'customer-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockQuotationsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getStats: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      send: jest.fn(),
      accept: jest.fn(),
      reject: jest.fn(),
      convert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [
        { provide: QuotationsService, useValue: mockQuotationsService },
      ],
    }).compile();

    controller = module.get<QuotationsController>(QuotationsController);
    quotationsService = module.get(QuotationsService);

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
    it('should return paginated quotations with filters', async () => {
      quotationsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(filterDto);

      expect(result).toEqual(mockPaginatedResponse);
      expect(quotationsService.findAll).toHaveBeenCalledWith(filterDto);
    });

    it('should pass all filter parameters to service', async () => {
      quotationsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const filtersWithDates: FilterQuotationsDto = {
        ...filterDto,
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
      };

      await controller.findAll(filtersWithDates);

      expect(quotationsService.findAll).toHaveBeenCalledWith(filtersWithDates);
    });

    it('should handle empty filters', async () => {
      quotationsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockPaginatedResponse);
      expect(quotationsService.findAll).toHaveBeenCalledWith({});
    });

    it('should use default page 1 when page is undefined', async () => {
      quotationsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 1'));
    });

    it('should use default limit 10 when limit is undefined', async () => {
      quotationsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 2 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('limit: 10'),
      );
    });

    it('should log actual page and limit when provided', async () => {
      quotationsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 5, limit: 25 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 5'));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('limit: 25'),
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      quotationsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll({})).rejects.toThrow(error);
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalQuotations: 30,
      totalValue: 15000,
      quotationsByStatus: {
        DRAFT: 10,
        SENT: 8,
        ACCEPTED: 5,
        REJECTED: 3,
        EXPIRED: 2,
        CONVERTED: 2,
      },
    };

    it('should return quotation statistics', async () => {
      quotationsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(quotationsService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should log the stats request', async () => {
      quotationsService.getStats.mockResolvedValue(mockStats);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.getStats();

      expect(logSpy).toHaveBeenCalledWith('Getting quotation statistics');
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      quotationsService.getStats.mockRejectedValue(error);

      await expect(controller.getStats()).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return a quotation by id', async () => {
      quotationsService.findOne.mockResolvedValue(mockQuotation);

      const result = await controller.findOne('quotation-123');

      expect(result).toEqual(mockQuotation);
      expect(quotationsService.findOne).toHaveBeenCalledWith('quotation-123');
    });

    it('should return quotation with all relations', async () => {
      quotationsService.findOne.mockResolvedValue(mockQuotation);

      const result = await controller.findOne('quotation-123');

      // The service returns items, customer, and user at runtime even though
      // QuotationEntity doesn't declare them (they come from mapToQuotationResponse)
      expect((result as any).items).toBeDefined();
      expect((result as any).customer).toBeDefined();
      expect((result as any).user).toBeDefined();
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Cotizacion no encontrada');
      quotationsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a new quotation', async () => {
      quotationsService.create.mockResolvedValue(mockQuotation);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockQuotation);
      expect(quotationsService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.userId,
      );
    });

    it('should pass userId from @CurrentUser to service', async () => {
      quotationsService.create.mockResolvedValue(mockQuotation);

      await controller.create(createDto, mockUser);

      expect(quotationsService.create).toHaveBeenCalledWith(
        createDto,
        'user-123',
      );
    });

    it('should pass dto correctly to service', async () => {
      quotationsService.create.mockResolvedValue(mockQuotation);

      const dtoWithoutCustomer: CreateQuotationDto = {
        items: [
          {
            productId: 'product-456',
            quantity: 5,
            unitPrice: 25,
          },
        ],
      };

      await controller.create(dtoWithoutCustomer, mockUser);

      expect(quotationsService.create).toHaveBeenCalledWith(
        dtoWithoutCustomer,
        mockUser.userId,
      );
    });

    it('should propagate validation errors', async () => {
      const error = new NotFoundException('Cliente no encontrado');
      quotationsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate product not found errors', async () => {
      const error = new NotFoundException('Producto no encontrado');
      quotationsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the quotation', async () => {
      const updatedQuotation = { ...mockQuotation, ...updateDto };
      quotationsService.update.mockResolvedValue(updatedQuotation);

      const result = await controller.update('quotation-123', updateDto);

      expect(result).toEqual(updatedQuotation);
      expect(quotationsService.update).toHaveBeenCalledWith(
        'quotation-123',
        updateDto,
      );
    });

    it('should pass id and dto correctly', async () => {
      quotationsService.update.mockResolvedValue(mockQuotation);

      await controller.update('quotation-456', updateDto);

      expect(quotationsService.update).toHaveBeenCalledWith(
        'quotation-456',
        updateDto,
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdateDto: UpdateQuotationDto = {
        notes: 'Only notes updated',
      };
      quotationsService.update.mockResolvedValue({
        ...mockQuotation,
        notes: 'Only notes updated',
      });

      const result = await controller.update('quotation-123', partialUpdateDto);

      expect(result.notes).toBe('Only notes updated');
      expect(quotationsService.update).toHaveBeenCalledWith(
        'quotation-123',
        partialUpdateDto,
      );
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Cotizacion no encontrada');
      quotationsService.update.mockRejectedValue(error);

      await expect(
        controller.update('invalid-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate status validation errors', async () => {
      const error = new BadRequestException(
        'Solo se pueden editar cotizaciones en estado borrador',
      );
      quotationsService.update.mockRejectedValue(error);

      await expect(
        controller.update('quotation-123', updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a quotation', async () => {
      quotationsService.remove.mockResolvedValue(undefined);

      await controller.remove('quotation-123');

      expect(quotationsService.remove).toHaveBeenCalledWith('quotation-123');
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Cotizacion no encontrada');
      quotationsService.remove.mockRejectedValue(error);

      await expect(controller.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate status validation errors', async () => {
      const error = new BadRequestException(
        'Solo se pueden eliminar cotizaciones en estado borrador',
      );
      quotationsService.remove.mockRejectedValue(error);

      await expect(controller.remove('quotation-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('send', () => {
    it('should send a quotation and return updated data', async () => {
      const sentQuotation = {
        ...mockQuotation,
        status: QuotationStatus.SENT,
      };
      quotationsService.send.mockResolvedValue(sentQuotation);

      const result = await controller.send('quotation-123');

      expect(result).toEqual(sentQuotation);
      expect(result.status).toBe(QuotationStatus.SENT);
      expect(quotationsService.send).toHaveBeenCalledWith('quotation-123');
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Cotizacion no encontrada');
      quotationsService.send.mockRejectedValue(error);

      await expect(controller.send('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate status validation errors', async () => {
      const error = new BadRequestException(
        'Solo se pueden enviar cotizaciones en estado borrador',
      );
      quotationsService.send.mockRejectedValue(error);

      await expect(controller.send('quotation-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('accept', () => {
    it('should accept a quotation and return updated data', async () => {
      const acceptedQuotation = {
        ...mockQuotation,
        status: QuotationStatus.ACCEPTED,
      };
      quotationsService.accept.mockResolvedValue(acceptedQuotation);

      const result = await controller.accept('quotation-123');

      expect(result).toEqual(acceptedQuotation);
      expect(result.status).toBe(QuotationStatus.ACCEPTED);
      expect(quotationsService.accept).toHaveBeenCalledWith('quotation-123');
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Cotizacion no encontrada');
      quotationsService.accept.mockRejectedValue(error);

      await expect(controller.accept('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate status validation errors', async () => {
      const error = new BadRequestException(
        'Solo se pueden aceptar cotizaciones en estado enviada',
      );
      quotationsService.accept.mockRejectedValue(error);

      await expect(controller.accept('quotation-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('should reject a quotation and return updated data', async () => {
      const rejectedQuotation = {
        ...mockQuotation,
        status: QuotationStatus.REJECTED,
      };
      quotationsService.reject.mockResolvedValue(rejectedQuotation);

      const result = await controller.reject('quotation-123');

      expect(result).toEqual(rejectedQuotation);
      expect(result.status).toBe(QuotationStatus.REJECTED);
      expect(quotationsService.reject).toHaveBeenCalledWith('quotation-123');
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Cotizacion no encontrada');
      quotationsService.reject.mockRejectedValue(error);

      await expect(controller.reject('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate status validation errors', async () => {
      const error = new BadRequestException(
        'Solo se pueden rechazar cotizaciones en estado enviada',
      );
      quotationsService.reject.mockRejectedValue(error);

      await expect(controller.reject('quotation-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('convert', () => {
    it('should convert a quotation to invoice and return updated data', async () => {
      const convertedQuotation: QuotationResponse = {
        ...mockQuotation,
        status: QuotationStatus.CONVERTED,
        convertedToInvoiceId: 'invoice-123',
        convertedAt: new Date('2024-01-20'),
        convertedToInvoice: {
          id: 'invoice-123',
          invoiceNumber: 'INV-00001',
          status: 'DRAFT',
        },
      };
      quotationsService.convert.mockResolvedValue(convertedQuotation);

      const result = await controller.convert('quotation-123', mockUser);

      expect(result).toEqual(convertedQuotation);
      expect(result.status).toBe(QuotationStatus.CONVERTED);
      expect(result.convertedToInvoiceId).toBe('invoice-123');
      expect(quotationsService.convert).toHaveBeenCalledWith(
        'quotation-123',
        mockUser.userId,
      );
    });

    it('should pass userId from @CurrentUser to service', async () => {
      const convertedQuotation: QuotationResponse = {
        ...mockQuotation,
        status: QuotationStatus.CONVERTED,
        convertedToInvoiceId: 'invoice-123',
        convertedAt: new Date('2024-01-20'),
      };
      quotationsService.convert.mockResolvedValue(convertedQuotation);

      await controller.convert('quotation-123', mockUser);

      expect(quotationsService.convert).toHaveBeenCalledWith(
        'quotation-123',
        'user-123',
      );
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Cotizacion no encontrada');
      quotationsService.convert.mockRejectedValue(error);

      await expect(
        controller.convert('invalid-id', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate status validation errors', async () => {
      const error = new BadRequestException(
        'Solo se pueden convertir cotizaciones en estado aceptada',
      );
      quotationsService.convert.mockRejectedValue(error);

      await expect(
        controller.convert('quotation-123', mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('error propagation', () => {
    it('should propagate database errors from findAll', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.findAll.mockRejectedValue(dbError);

      await expect(controller.findAll({})).rejects.toThrow(dbError);
    });

    it('should propagate database errors from findOne', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.findOne.mockRejectedValue(dbError);

      await expect(controller.findOne('quotation-123')).rejects.toThrow(
        dbError,
      );
    });

    it('should propagate database errors from create', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.create.mockRejectedValue(dbError);

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        dbError,
      );
    });

    it('should propagate database errors from update', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.update.mockRejectedValue(dbError);

      await expect(
        controller.update('quotation-123', updateDto),
      ).rejects.toThrow(dbError);
    });

    it('should propagate database errors from remove', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.remove.mockRejectedValue(dbError);

      await expect(controller.remove('quotation-123')).rejects.toThrow(
        dbError,
      );
    });

    it('should propagate database errors from send', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.send.mockRejectedValue(dbError);

      await expect(controller.send('quotation-123')).rejects.toThrow(dbError);
    });

    it('should propagate database errors from accept', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.accept.mockRejectedValue(dbError);

      await expect(controller.accept('quotation-123')).rejects.toThrow(
        dbError,
      );
    });

    it('should propagate database errors from reject', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.reject.mockRejectedValue(dbError);

      await expect(controller.reject('quotation-123')).rejects.toThrow(
        dbError,
      );
    });

    it('should propagate database errors from convert', async () => {
      const dbError = new Error('Database connection failed');
      quotationsService.convert.mockRejectedValue(dbError);

      await expect(
        controller.convert('quotation-123', mockUser),
      ).rejects.toThrow(dbError);
    });
  });
});
