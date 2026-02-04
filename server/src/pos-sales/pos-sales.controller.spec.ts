import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { POSSalesController } from './pos-sales.controller';
import { POSSalesService } from './pos-sales.service';
import type {
  POSSaleWithDetails,
  PaginatedSalesResponse,
} from './pos-sales.service';
import { PaymentMethod, UserRole } from '@prisma/client';

describe('POSSalesController', () => {
  let controller: POSSalesController;
  let service: jest.Mocked<POSSalesService>;

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.ADMIN,
  };

  const mockSaleWithDetails: POSSaleWithDetails = {
    id: 'sale-123',
    tenantId: 'tenant-123',
    sessionId: 'session-123',
    invoiceId: 'invoice-123',
    saleNumber: 'POS-00001',
    subtotal: 100,
    tax: 19,
    discount: 0,
    total: 119,
    createdAt: new Date('2024-01-15'),
    invoice: {
      id: 'invoice-123',
      invoiceNumber: 'INV-00001',
      customer: null,
      items: [
        {
          id: 'item-123',
          productId: 'product-123',
          productName: 'Test Product',
          productSku: 'TEST-001',
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
    payments: [
      {
        id: 'payment-123',
        method: PaymentMethod.CASH,
        amount: 119,
        reference: null,
        cardLastFour: null,
        createdAt: new Date('2024-01-15'),
      },
    ],
    session: {
      id: 'session-123',
      cashRegister: {
        id: 'cash-register-123',
        name: 'Caja Principal',
        code: 'CAJA-001',
      },
    },
  };

  const mockPaginatedResponse: PaginatedSalesResponse = {
    data: [mockSaleWithDetails],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPOSSalesService = {
      createSale: jest.fn(),
      voidSale: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [POSSalesController],
      providers: [{ provide: POSSalesService, useValue: mockPOSSalesService }],
    }).compile();

    controller = module.get<POSSalesController>(POSSalesController);
    service = module.get(POSSalesService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
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

  describe('createSale', () => {
    const createDto = {
      items: [{ productId: 'product-123', quantity: 1 }],
      payments: [{ method: PaymentMethod.CASH, amount: 119 }],
    };

    it('should create a sale', async () => {
      service.createSale.mockResolvedValue(mockSaleWithDetails);

      const result = await controller.createSale(createDto, mockUser);

      expect(result).toEqual(mockSaleWithDetails);
      expect(service.createSale).toHaveBeenCalledWith(createDto, mockUser.id);
    });

    it('should propagate BadRequestException for no active session', async () => {
      service.createSale.mockRejectedValue(
        new BadRequestException('No active POS session found'),
      );

      await expect(controller.createSale(createDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException for missing product', async () => {
      service.createSale.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.createSale(createDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('voidSale', () => {
    it('should void a sale', async () => {
      service.voidSale.mockResolvedValue(mockSaleWithDetails);

      const result = await controller.voidSale(
        'sale-123',
        'Customer return',
        mockUser,
      );

      expect(result).toEqual(mockSaleWithDetails);
      expect(service.voidSale).toHaveBeenCalledWith(
        'sale-123',
        mockUser.id,
        'Customer return',
      );
    });

    it('should propagate NotFoundException', async () => {
      service.voidSale.mockRejectedValue(
        new NotFoundException('Sale not found'),
      );

      await expect(
        controller.voidSale('nonexistent', 'reason', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException for already voided sale', async () => {
      service.voidSale.mockRejectedValue(
        new BadRequestException('This sale has already been voided'),
      );

      await expect(
        controller.voidSale('sale-123', 'reason', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate ForbiddenException', async () => {
      service.voidSale.mockRejectedValue(
        new ForbiddenException(
          'Only managers and admins can void sales from closed sessions',
        ),
      );

      await expect(
        controller.voidSale('sale-123', 'reason', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a sale by id', async () => {
      service.findOne.mockResolvedValue(mockSaleWithDetails);

      const result = await controller.findOne('sale-123');

      expect(result).toEqual(mockSaleWithDetails);
      expect(service.findOne).toHaveBeenCalledWith('sale-123');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated sales', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10');

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should use default pagination values', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should handle invalid page number by defaulting to 1', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('invalid', '10');

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should pass sessionId filter', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '10', 'session-123');

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        'session-123',
        undefined,
        undefined,
      );
    });

    it('should pass date range filters', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      await controller.findAll('1', '10', undefined, fromDate, toDate);

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        new Date(fromDate),
        new Date(toDate),
      );
    });

    it('should return empty data when no sales exist', async () => {
      const emptyResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      service.findAll.mockResolvedValue(emptyResponse);

      const result = await controller.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
