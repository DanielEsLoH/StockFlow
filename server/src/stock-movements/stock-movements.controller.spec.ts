import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import {
  StockMovementsController,
  ProductMovementsController,
  WarehouseMovementsController,
} from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import type {
  StockMovementResponse,
  PaginatedMovementsResponse,
  TransferResponse,
} from './stock-movements.service';
import { CreateMovementDto, CreateTransferDto, FilterMovementsDto } from './dto';

describe('StockMovementsController', () => {
  let controller: StockMovementsController;
  let stockMovementsService: jest.Mocked<StockMovementsService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockProduct = {
    id: 'product-123',
    sku: 'TEST-001',
    name: 'Test Product',
  };

  const mockWarehouse = {
    id: 'warehouse-123',
    code: 'ALM-01',
    name: 'Main Warehouse',
  };

  const mockUser = {
    id: mockUserId,
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockStockMovement: StockMovementResponse = {
    id: 'movement-123',
    tenantId: mockTenantId,
    productId: mockProduct.id,
    warehouseId: mockWarehouse.id,
    userId: mockUserId,
    type: MovementType.ADJUSTMENT,
    quantity: 10,
    reason: 'Physical inventory correction',
    notes: 'Found extra units',
    invoiceId: null,
    createdAt: new Date('2024-01-15'),
    product: mockProduct,
    warehouse: mockWarehouse,
    user: mockUser,
  };

  const mockStockMovement2: StockMovementResponse = {
    ...mockStockMovement,
    id: 'movement-456',
    quantity: -5,
    reason: 'Damaged goods',
    notes: 'Items found damaged in storage',
    createdAt: new Date('2024-01-20'),
  };

  const mockPaginatedResponse: PaginatedMovementsResponse = {
    data: [mockStockMovement, mockStockMovement2],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const createDto: CreateMovementDto = {
    productId: 'product-123',
    warehouseId: 'warehouse-123',
    quantity: 10,
    reason: 'Inventory count correction',
    notes: 'Found extra units',
  };

  const filterDto: FilterMovementsDto = {
    page: 1,
    limit: 10,
    productId: 'product-123',
    type: MovementType.ADJUSTMENT,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockStockMovementsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      createTransfer: jest.fn(),
      findByProduct: jest.fn(),
      findByWarehouse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockMovementsController],
      providers: [
        { provide: StockMovementsService, useValue: mockStockMovementsService },
      ],
    }).compile();

    controller = module.get<StockMovementsController>(StockMovementsController);
    stockMovementsService = module.get(StockMovementsService);

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
    it('should return paginated stock movements with filters', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(filterDto);

      expect(result).toEqual(mockPaginatedResponse);
      expect(stockMovementsService.findAll).toHaveBeenCalledWith(filterDto);
    });

    it('should pass all filter parameters to service', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const filtersWithDates: FilterMovementsDto = {
        ...filterDto,
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
        warehouseId: 'warehouse-123',
      };

      await controller.findAll(filtersWithDates);

      expect(stockMovementsService.findAll).toHaveBeenCalledWith(
        filtersWithDates,
      );
    });

    it('should handle empty filters', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockPaginatedResponse);
      expect(stockMovementsService.findAll).toHaveBeenCalledWith({});
    });

    it('should use default page 1 when page is undefined', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 1'));
    });

    it('should use default limit 10 when limit is undefined', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 2 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 10'));
    });

    it('should log actual page and limit when provided', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 5, limit: 25 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 5'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 25'));
    });

    it('should use both default page and limit when neither provided', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({});

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements - page: 1, limit: 10',
      );
    });

    it('should handle filters with explicit undefined values', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      const filtersWithUndefined: FilterMovementsDto = {
        page: undefined,
        limit: undefined,
      };

      await controller.findAll(filtersWithUndefined);

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements - page: 1, limit: 10',
      );
      expect(stockMovementsService.findAll).toHaveBeenCalledWith(
        filtersWithUndefined,
      );
    });

    it('should use page 0 when explicitly set (not trigger default)', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 0, limit: 10 });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements - page: 0, limit: 10',
      );
    });

    it('should use limit 0 when explicitly set (not trigger default)', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 1, limit: 0 });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements - page: 1, limit: 0',
      );
    });

    it('should use both page 0 and limit 0 when explicitly set', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 0, limit: 0 });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements - page: 0, limit: 0',
      );
    });

    it('should use default page 1 when page is null', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: null as unknown as number, limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements - page: 1, limit: 20',
      );
    });

    it('should use default limit 10 when limit is null', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({ page: 3, limit: null as unknown as number });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements - page: 3, limit: 10',
      );
    });

    it('should use defaults when both page and limit are null', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll({
        page: null as unknown as number,
        limit: null as unknown as number,
      });

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements - page: 1, limit: 10',
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      stockMovementsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll({})).rejects.toThrow(error);
    });

    it('should return empty array when no movements exist', async () => {
      const emptyResponse: PaginatedMovementsResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };
      stockMovementsService.findAll.mockResolvedValue(emptyResponse);

      const result = await controller.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a stock movement by id', async () => {
      stockMovementsService.findOne.mockResolvedValue(mockStockMovement);

      const result = await controller.findOne('movement-123');

      expect(result).toEqual(mockStockMovement);
      expect(stockMovementsService.findOne).toHaveBeenCalledWith(
        'movement-123',
      );
    });

    it('should return movement with all relations', async () => {
      stockMovementsService.findOne.mockResolvedValue(mockStockMovement);

      const result = await controller.findOne('movement-123');

      expect(result.product).toBeDefined();
      expect(result.warehouse).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should log the movement id being retrieved', async () => {
      stockMovementsService.findOne.mockResolvedValue(mockStockMovement);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findOne('movement-123');

      expect(logSpy).toHaveBeenCalledWith(
        'Getting stock movement: movement-123',
      );
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Movimiento de stock no encontrado');
      stockMovementsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      stockMovementsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('movement-123')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    it('should create and return a new stock movement', async () => {
      stockMovementsService.create.mockResolvedValue(mockStockMovement);

      const result = await controller.create(createDto, mockUserId);

      expect(result).toEqual(mockStockMovement);
      expect(stockMovementsService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
      );
    });

    it('should pass dto and userId correctly to service', async () => {
      stockMovementsService.create.mockResolvedValue(mockStockMovement);

      await controller.create(createDto, mockUserId);

      expect(stockMovementsService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
      );
    });

    it('should log product id and quantity being created', async () => {
      stockMovementsService.create.mockResolvedValue(mockStockMovement);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.create(createDto, mockUserId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('product-123'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('10'));
    });

    it('should create movement without optional warehouseId', async () => {
      const minimalDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: 25,
        reason: 'Stock correction',
      };
      stockMovementsService.create.mockResolvedValue({
        ...mockStockMovement,
        quantity: 25,
        warehouseId: null,
        warehouse: undefined,
      });

      const result = await controller.create(minimalDto, mockUserId);

      expect(result.quantity).toBe(25);
      expect(stockMovementsService.create).toHaveBeenCalledWith(
        minimalDto,
        mockUserId,
      );
    });

    it('should create movement without optional notes', async () => {
      const dtoWithoutNotes: CreateMovementDto = {
        productId: 'product-123',
        warehouseId: 'warehouse-123',
        quantity: 10,
        reason: 'Stock correction',
      };
      stockMovementsService.create.mockResolvedValue({
        ...mockStockMovement,
        notes: null,
      });

      const result = await controller.create(dtoWithoutNotes, mockUserId);

      expect(result.notes).toBeNull();
      expect(stockMovementsService.create).toHaveBeenCalledWith(
        dtoWithoutNotes,
        mockUserId,
      );
    });

    it('should propagate not found errors for product', async () => {
      const error = new NotFoundException('Producto no encontrado');
      stockMovementsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockUserId)).rejects.toThrow(
        error,
      );
    });

    it('should propagate not found errors for warehouse', async () => {
      const error = new NotFoundException('Almacen no encontrado');
      stockMovementsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockUserId)).rejects.toThrow(
        error,
      );
    });

    it('should propagate bad request errors for negative stock', async () => {
      const error = new BadRequestException(
        'El ajuste resultaria en stock negativo',
      );
      stockMovementsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockUserId)).rejects.toThrow(
        error,
      );
    });

    it('should handle negative quantity adjustments', async () => {
      const negativeDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: -15,
        reason: 'Stock removed',
      };
      stockMovementsService.create.mockResolvedValue({
        ...mockStockMovement,
        quantity: -15,
      });

      const result = await controller.create(negativeDto, mockUserId);

      expect(result.quantity).toBe(-15);
    });

    it('should handle large positive quantity', async () => {
      const largeDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: 999999,
        reason: 'Large stock addition',
      };
      stockMovementsService.create.mockResolvedValue({
        ...mockStockMovement,
        quantity: 999999,
      });

      const result = await controller.create(largeDto, mockUserId);

      expect(result.quantity).toBe(999999);
    });

    it('should log correct format for create with positive quantity', async () => {
      stockMovementsService.create.mockResolvedValue(mockStockMovement);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.create(createDto, mockUserId);

      expect(logSpy).toHaveBeenCalledWith(
        'Creating stock adjustment for product product-123, quantity: 10',
      );
    });

    it('should log correct format for create with negative quantity', async () => {
      const negativeDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: -5,
        reason: 'Stock removed',
      };
      stockMovementsService.create.mockResolvedValue({
        ...mockStockMovement,
        quantity: -5,
      });
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.create(negativeDto, mockUserId);

      expect(logSpy).toHaveBeenCalledWith(
        'Creating stock adjustment for product product-123, quantity: -5',
      );
    });
  });

  describe('createTransfer', () => {
    const transferDto: CreateTransferDto = {
      productId: 'product-123',
      sourceWarehouseId: 'warehouse-123',
      destinationWarehouseId: 'warehouse-456',
      quantity: 10,
      reason: 'Reposicion de sucursal',
      notes: 'Solicitado por gerente',
    };

    const mockTransferResponse: TransferResponse = {
      outMovement: {
        ...mockStockMovement,
        id: 'movement-out',
        type: MovementType.TRANSFER,
        quantity: -10,
        warehouseId: 'warehouse-123',
      },
      inMovement: {
        ...mockStockMovement,
        id: 'movement-in',
        type: MovementType.TRANSFER,
        quantity: 10,
        warehouseId: 'warehouse-456',
        warehouse: { id: 'warehouse-456', code: 'ALM-02', name: 'Secondary Warehouse' },
      },
    };

    it('should create and return a transfer with out and in movements', async () => {
      stockMovementsService.createTransfer.mockResolvedValue(mockTransferResponse);

      const result = await controller.createTransfer(transferDto, mockUserId);

      expect(result).toEqual(mockTransferResponse);
      expect(result.outMovement.quantity).toBe(-10);
      expect(result.inMovement.quantity).toBe(10);
      expect(stockMovementsService.createTransfer).toHaveBeenCalledWith(
        transferDto,
        mockUserId,
      );
    });

    it('should log transfer details including product, quantity, source and destination', async () => {
      stockMovementsService.createTransfer.mockResolvedValue(mockTransferResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.createTransfer(transferDto, mockUserId);

      expect(logSpy).toHaveBeenCalledWith(
        `Creating transfer for product product-123: 10 units from warehouse-123 to warehouse-456`,
      );
    });

    it('should propagate service errors', async () => {
      const error = new BadRequestException('Insufficient stock');
      stockMovementsService.createTransfer.mockRejectedValue(error);

      await expect(
        controller.createTransfer(transferDto, mockUserId),
      ).rejects.toThrow(error);
    });
  });

  describe('HTTP methods and decorators', () => {
    it('controller methods should exist', () => {
      expect(controller.findAll).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.create).toBeDefined();
    });

    it('should call service methods with correct arguments', async () => {
      stockMovementsService.findAll.mockResolvedValue(mockPaginatedResponse);
      stockMovementsService.findOne.mockResolvedValue(mockStockMovement);
      stockMovementsService.create.mockResolvedValue(mockStockMovement);

      await controller.findAll(filterDto);
      expect(stockMovementsService.findAll).toHaveBeenCalledTimes(1);

      await controller.findOne('movement-123');
      expect(stockMovementsService.findOne).toHaveBeenCalledTimes(1);

      await controller.create(createDto, mockUserId);
      expect(stockMovementsService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle movement without warehouse relation', async () => {
      const movementWithoutWarehouse: StockMovementResponse = {
        ...mockStockMovement,
        warehouseId: null,
        warehouse: undefined,
      };
      stockMovementsService.findOne.mockResolvedValue(movementWithoutWarehouse);

      const result = await controller.findOne('movement-123');

      expect(result.warehouseId).toBeNull();
      expect(result.warehouse).toBeUndefined();
    });

    it('should handle movement without user relation', async () => {
      const movementWithoutUser: StockMovementResponse = {
        ...mockStockMovement,
        userId: null,
        user: undefined,
      };
      stockMovementsService.findOne.mockResolvedValue(movementWithoutUser);

      const result = await controller.findOne('movement-123');

      expect(result.userId).toBeNull();
      expect(result.user).toBeUndefined();
    });

    it('should handle UUID movement id', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      stockMovementsService.findOne.mockResolvedValue({
        ...mockStockMovement,
        id: uuidId,
      });

      const result = await controller.findOne(uuidId);

      expect(result.id).toBe(uuidId);
      expect(stockMovementsService.findOne).toHaveBeenCalledWith(uuidId);
    });

    it('should handle empty string id', async () => {
      stockMovementsService.findOne.mockResolvedValue(mockStockMovement);

      await controller.findOne('');

      expect(stockMovementsService.findOne).toHaveBeenCalledWith('');
    });

    it('should handle long reason strings', async () => {
      const longReason = 'R'.repeat(255);
      const dtoWithLongReason: CreateMovementDto = {
        ...createDto,
        reason: longReason,
      };
      stockMovementsService.create.mockResolvedValue({
        ...mockStockMovement,
        reason: longReason,
      });

      const result = await controller.create(dtoWithLongReason, mockUserId);

      expect(result.reason).toBe(longReason);
    });

    it('should handle long notes strings', async () => {
      const longNotes = 'N'.repeat(1000);
      const dtoWithLongNotes: CreateMovementDto = {
        ...createDto,
        notes: longNotes,
      };
      stockMovementsService.create.mockResolvedValue({
        ...mockStockMovement,
        notes: longNotes,
      });

      const result = await controller.create(dtoWithLongNotes, mockUserId);

      expect(result.notes).toBe(longNotes);
    });

    it('should handle zero quantity', async () => {
      const zeroDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: 0,
        reason: 'Zero adjustment',
      };
      stockMovementsService.create.mockResolvedValue({
        ...mockStockMovement,
        quantity: 0,
      });

      const result = await controller.create(zeroDto, mockUserId);

      expect(result.quantity).toBe(0);
    });
  });

  describe('findOne edge cases', () => {
    it('should handle special characters in id', async () => {
      const specialId = 'movement-123-abc';
      stockMovementsService.findOne.mockResolvedValue({
        ...mockStockMovement,
        id: specialId,
      });

      const result = await controller.findOne(specialId);

      expect(result.id).toBe(specialId);
    });
  });
});

describe('ProductMovementsController', () => {
  let controller: ProductMovementsController;
  let stockMovementsService: jest.Mocked<StockMovementsService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockStockMovement: StockMovementResponse = {
    id: 'movement-123',
    tenantId: mockTenantId,
    productId: 'product-123',
    warehouseId: 'warehouse-123',
    userId: mockUserId,
    type: MovementType.ADJUSTMENT,
    quantity: 10,
    reason: 'Physical inventory correction',
    notes: 'Found extra units',
    invoiceId: null,
    createdAt: new Date('2024-01-15'),
    product: {
      id: 'product-123',
      sku: 'TEST-001',
      name: 'Test Product',
    },
    warehouse: {
      id: 'warehouse-123',
      code: 'ALM-01',
      name: 'Main Warehouse',
    },
    user: {
      id: mockUserId,
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const mockPaginatedResponse: PaginatedMovementsResponse = {
    data: [mockStockMovement],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockStockMovementsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByProduct: jest.fn(),
      findByWarehouse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductMovementsController],
      providers: [
        { provide: StockMovementsService, useValue: mockStockMovementsService },
      ],
    }).compile();

    controller = module.get<ProductMovementsController>(
      ProductMovementsController,
    );
    stockMovementsService = module.get(StockMovementsService);

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

  describe('findByProduct', () => {
    it('should return paginated movements for a product', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );

      const result = await controller.findByProduct('product-123', {});

      expect(result).toEqual(mockPaginatedResponse);
      expect(stockMovementsService.findByProduct).toHaveBeenCalledWith(
        'product-123',
        {},
      );
    });

    it('should pass filters to service', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );
      const filters: FilterMovementsDto = {
        page: 2,
        limit: 5,
        type: MovementType.SALE,
      };

      await controller.findByProduct('product-123', filters);

      expect(stockMovementsService.findByProduct).toHaveBeenCalledWith(
        'product-123',
        filters,
      );
    });

    it('should log the product id and pagination params', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByProduct('product-123', { page: 2, limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('product-123'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 2'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 20'));
    });

    it('should use default page 1 when page is undefined', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByProduct('product-123', { limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 1'));
    });

    it('should use default limit 10 when limit is undefined', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByProduct('product-123', { page: 2 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 10'));
    });

    it('should use both defaults when neither page nor limit provided', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByProduct('product-123', {});

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements for product product-123 - page: 1, limit: 10',
      );
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Producto no encontrado');
      stockMovementsService.findByProduct.mockRejectedValue(error);

      await expect(controller.findByProduct('invalid-id', {})).rejects.toThrow(
        error,
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      stockMovementsService.findByProduct.mockRejectedValue(error);

      await expect(controller.findByProduct('product-123', {})).rejects.toThrow(
        error,
      );
    });

    it('should return empty array when no movements exist', async () => {
      const emptyResponse: PaginatedMovementsResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };
      stockMovementsService.findByProduct.mockResolvedValue(emptyResponse);

      const result = await controller.findByProduct('product-123', {});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle UUID product id', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';

      await controller.findByProduct(uuidId, {});

      expect(stockMovementsService.findByProduct).toHaveBeenCalledWith(
        uuidId,
        {},
      );
    });

    it('should handle page 0 explicitly set', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByProduct('product-123', { page: 0, limit: 10 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 0'));
    });

    it('should handle limit 0 explicitly set', async () => {
      stockMovementsService.findByProduct.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByProduct('product-123', { page: 1, limit: 0 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 0'));
    });
  });
});

describe('WarehouseMovementsController', () => {
  let controller: WarehouseMovementsController;
  let stockMovementsService: jest.Mocked<StockMovementsService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockStockMovement: StockMovementResponse = {
    id: 'movement-123',
    tenantId: mockTenantId,
    productId: 'product-123',
    warehouseId: 'warehouse-123',
    userId: mockUserId,
    type: MovementType.ADJUSTMENT,
    quantity: 10,
    reason: 'Physical inventory correction',
    notes: 'Found extra units',
    invoiceId: null,
    createdAt: new Date('2024-01-15'),
    product: {
      id: 'product-123',
      sku: 'TEST-001',
      name: 'Test Product',
    },
    warehouse: {
      id: 'warehouse-123',
      code: 'ALM-01',
      name: 'Main Warehouse',
    },
    user: {
      id: mockUserId,
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const mockPaginatedResponse: PaginatedMovementsResponse = {
    data: [mockStockMovement],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockStockMovementsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByProduct: jest.fn(),
      findByWarehouse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseMovementsController],
      providers: [
        { provide: StockMovementsService, useValue: mockStockMovementsService },
      ],
    }).compile();

    controller = module.get<WarehouseMovementsController>(
      WarehouseMovementsController,
    );
    stockMovementsService = module.get(StockMovementsService);

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

  describe('findByWarehouse', () => {
    it('should return paginated movements for a warehouse', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );

      const result = await controller.findByWarehouse('warehouse-123', {});

      expect(result).toEqual(mockPaginatedResponse);
      expect(stockMovementsService.findByWarehouse).toHaveBeenCalledWith(
        'warehouse-123',
        {},
      );
    });

    it('should pass filters to service', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const filters: FilterMovementsDto = {
        page: 2,
        limit: 5,
        type: MovementType.TRANSFER,
      };

      await controller.findByWarehouse('warehouse-123', filters);

      expect(stockMovementsService.findByWarehouse).toHaveBeenCalledWith(
        'warehouse-123',
        filters,
      );
    });

    it('should log the warehouse id and pagination params', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByWarehouse('warehouse-123', { page: 2, limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('warehouse-123'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 2'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 20'));
    });

    it('should use default page 1 when page is undefined', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByWarehouse('warehouse-123', { limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 1'));
    });

    it('should use default limit 10 when limit is undefined', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByWarehouse('warehouse-123', { page: 2 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 10'));
    });

    it('should use both defaults when neither page nor limit provided', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByWarehouse('warehouse-123', {});

      expect(logSpy).toHaveBeenCalledWith(
        'Listing stock movements for warehouse warehouse-123 - page: 1, limit: 10',
      );
    });

    it('should propagate not found errors', async () => {
      const error = new NotFoundException('Almacen no encontrado');
      stockMovementsService.findByWarehouse.mockRejectedValue(error);

      await expect(
        controller.findByWarehouse('invalid-id', {}),
      ).rejects.toThrow(error);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      stockMovementsService.findByWarehouse.mockRejectedValue(error);

      await expect(
        controller.findByWarehouse('warehouse-123', {}),
      ).rejects.toThrow(error);
    });

    it('should return empty array when no movements exist', async () => {
      const emptyResponse: PaginatedMovementsResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };
      stockMovementsService.findByWarehouse.mockResolvedValue(emptyResponse);

      const result = await controller.findByWarehouse('warehouse-123', {});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle UUID warehouse id', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';

      await controller.findByWarehouse(uuidId, {});

      expect(stockMovementsService.findByWarehouse).toHaveBeenCalledWith(
        uuidId,
        {},
      );
    });

    it('should handle page 0 explicitly set', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByWarehouse('warehouse-123', { page: 0, limit: 10 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('page: 0'));
    });

    it('should handle limit 0 explicitly set', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findByWarehouse('warehouse-123', { page: 1, limit: 0 });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit: 0'));
    });

    it('should handle all movement types in filters', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );

      const types = [
        MovementType.PURCHASE,
        MovementType.SALE,
        MovementType.ADJUSTMENT,
        MovementType.TRANSFER,
        MovementType.RETURN,
        MovementType.DAMAGED,
      ];

      for (const type of types) {
        await controller.findByWarehouse('warehouse-123', { type });

        expect(stockMovementsService.findByWarehouse).toHaveBeenCalledWith(
          'warehouse-123',
          { type },
        );
      }
    });

    it('should handle date range filters', async () => {
      stockMovementsService.findByWarehouse.mockResolvedValue(
        mockPaginatedResponse,
      );
      const filters: FilterMovementsDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
      };

      await controller.findByWarehouse('warehouse-123', filters);

      expect(stockMovementsService.findByWarehouse).toHaveBeenCalledWith(
        'warehouse-123',
        filters,
      );
    });
  });
});
