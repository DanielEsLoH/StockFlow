import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { WarehouseStatus } from '@prisma/client';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import type {
  WarehouseResponse,
  WarehouseWithStockSummary,
  PaginatedWarehousesResponse,
  PaginatedWarehouseStockResponse,
} from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';

describe('WarehousesController', () => {
  let controller: WarehousesController;
  let warehousesService: jest.Mocked<WarehousesService>;

  // Test data
  const mockWarehouse: WarehouseResponse = {
    id: 'warehouse-123',
    tenantId: 'tenant-123',
    name: 'Main Warehouse',
    code: 'WH-001',
    address: '123 Industrial Ave',
    city: 'Bogota',
    phone: '+57 1 234 5678',
    isDefault: true,
    status: WarehouseStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockWarehouse2: WarehouseResponse = {
    ...mockWarehouse,
    id: 'warehouse-456',
    name: 'Secondary Warehouse',
    code: 'WH-002',
    isDefault: false,
  };

  const mockWarehouseWithStock: WarehouseWithStockSummary = {
    ...mockWarehouse,
    stockSummary: {
      totalProducts: 10,
      totalQuantity: 500,
    },
  };

  const mockPaginatedResponse: PaginatedWarehousesResponse = {
    data: [mockWarehouse, mockWarehouse2],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const mockStockResponse: PaginatedWarehouseStockResponse = {
    data: [
      {
        productId: 'product-1',
        productName: 'Product A',
        productSku: 'SKU-A',
        quantity: 100,
      },
      {
        productId: 'product-2',
        productName: 'Product B',
        productSku: 'SKU-B',
        quantity: 50,
      },
    ],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockWarehousesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getStock: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [
        { provide: WarehousesService, useValue: mockWarehousesService },
      ],
    }).compile();

    controller = module.get<WarehousesController>(WarehousesController);
    warehousesService = module.get(WarehousesService);

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
    it('should return paginated warehouses with default pagination', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll();

      expect(result).toEqual(mockPaginatedResponse);
      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should parse page and limit from query params', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('2', '20');

      expect(warehousesService.findAll).toHaveBeenCalledWith(2, 20);
    });

    it('should enforce minimum page of 1', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('0', '10');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce minimum page of 1 for negative values', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('-5', '10');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce maximum limit of 100', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '200');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 100);
    });

    it('should handle zero limit by using default', async () => {
      // When limit is '0', parseInt returns 0 which is falsy, so || 10 kicks in
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '0');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce minimum limit of 1 for negative values', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '-10');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 1);
    });

    it('should handle invalid page value gracefully', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('invalid', '10');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid limit value gracefully', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', 'invalid');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle both invalid page and limit values', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('abc', 'xyz');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle undefined query params', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(undefined, undefined);

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle empty string query params', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('', '');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle floating point page values', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('2.5', '10');

      expect(warehousesService.findAll).toHaveBeenCalledWith(2, 10);
    });

    it('should handle floating point limit values', async () => {
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '15.7');

      expect(warehousesService.findAll).toHaveBeenCalledWith(1, 15);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      warehousesService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return a warehouse by id with stock summary', async () => {
      warehousesService.findOne.mockResolvedValue(mockWarehouseWithStock);

      const result = await controller.findOne('warehouse-123');

      expect(result).toEqual(mockWarehouseWithStock);
      expect(warehousesService.findOne).toHaveBeenCalledWith('warehouse-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Warehouse not found');
      warehousesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(error);
    });

    it('should call service with correct id parameter', async () => {
      warehousesService.findOne.mockResolvedValue(mockWarehouseWithStock);

      await controller.findOne('some-uuid-id');

      expect(warehousesService.findOne).toHaveBeenCalledWith('some-uuid-id');
      expect(warehousesService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStock', () => {
    it('should return paginated stock items with default pagination', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      const result = await controller.getStock('warehouse-123');

      expect(result).toEqual(mockStockResponse);
      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should parse page and limit from query params', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '2', '20');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        2,
        20,
      );
    });

    it('should enforce minimum page of 1', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '0', '10');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should enforce minimum page of 1 for negative values', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '-5', '10');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should enforce maximum limit of 100', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '1', '200');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        100,
      );
    });

    it('should handle zero limit by using default', async () => {
      // When limit is '0', parseInt returns 0 which is falsy, so || 10 kicks in
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '1', '0');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should enforce minimum limit of 1 for negative values', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '1', '-10');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        1,
      );
    });

    it('should handle invalid page value gracefully', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', 'invalid', '10');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should handle invalid limit value gracefully', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '1', 'invalid');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should handle both invalid page and limit values', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', 'abc', 'xyz');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should handle undefined query params', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', undefined, undefined);

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should handle empty string query params', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '', '');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        10,
      );
    });

    it('should handle floating point page values', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '3.9', '10');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        3,
        10,
      );
    });

    it('should handle floating point limit values', async () => {
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '1', '25.1');

      expect(warehousesService.getStock).toHaveBeenCalledWith(
        'warehouse-123',
        1,
        25,
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Warehouse not found');
      warehousesService.getStock.mockRejectedValue(error);

      await expect(controller.getStock('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      warehousesService.getStock.mockRejectedValue(error);

      await expect(controller.getStock('warehouse-123')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    const createDto: CreateWarehouseDto = {
      name: 'New Warehouse',
      code: 'WH-NEW',
      address: '456 Storage Blvd',
      city: 'Medellin',
      phone: '+57 4 567 8901',
      isDefault: false,
    };

    it('should create and return a new warehouse', async () => {
      const createdWarehouse = { ...mockWarehouse, ...createDto };
      warehousesService.create.mockResolvedValue(createdWarehouse);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdWarehouse);
      expect(warehousesService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate conflict errors for duplicate code', async () => {
      const error = new Error(
        'A warehouse with the code "WH-NEW" already exists',
      );
      warehousesService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });

    it('should propagate forbidden errors when limit reached', async () => {
      const error = new Error('Warehouses limit reached');
      warehousesService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });

    it('should create warehouse with minimal required fields', async () => {
      const minimalDto: CreateWarehouseDto = {
        name: 'Minimal Warehouse',
      };
      const minimalWarehouse = {
        ...mockWarehouse,
        name: 'Minimal Warehouse',
        code: 'MINIMA-ABC1',
        address: null,
        city: null,
        phone: null,
        isDefault: false,
      };
      warehousesService.create.mockResolvedValue(minimalWarehouse);

      const result = await controller.create(minimalDto);

      expect(result).toEqual(minimalWarehouse);
      expect(warehousesService.create).toHaveBeenCalledWith(minimalDto);
    });

    it('should create warehouse as default', async () => {
      const defaultDto: CreateWarehouseDto = {
        name: 'Default Warehouse',
        isDefault: true,
      };
      const defaultWarehouse = {
        ...mockWarehouse,
        name: 'Default Warehouse',
        isDefault: true,
      };
      warehousesService.create.mockResolvedValue(defaultWarehouse);

      const result = await controller.create(defaultDto);

      expect(result.isDefault).toBe(true);
      expect(warehousesService.create).toHaveBeenCalledWith(defaultDto);
    });
  });

  describe('update', () => {
    const updateDto: UpdateWarehouseDto = {
      name: 'Updated Warehouse',
      address: '789 New Address',
    };

    it('should update and return the warehouse', async () => {
      const updatedWarehouse = { ...mockWarehouse, ...updateDto };
      warehousesService.update.mockResolvedValue(updatedWarehouse);

      const result = await controller.update('warehouse-123', updateDto);

      expect(result).toEqual(updatedWarehouse);
      expect(warehousesService.update).toHaveBeenCalledWith(
        'warehouse-123',
        updateDto,
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Warehouse not found');
      warehousesService.update.mockRejectedValue(error);

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(
        error,
      );
    });

    it('should propagate conflict errors for duplicate code', async () => {
      const codeUpdateDto: UpdateWarehouseDto = {
        code: 'EXISTING-CODE',
      };
      const error = new Error(
        'A warehouse with the code "EXISTING-CODE" already exists',
      );
      warehousesService.update.mockRejectedValue(error);

      await expect(
        controller.update('warehouse-123', codeUpdateDto),
      ).rejects.toThrow(error);
    });

    it('should update warehouse status', async () => {
      const statusDto: UpdateWarehouseDto = {
        status: WarehouseStatus.INACTIVE,
      };
      const updatedWarehouse = {
        ...mockWarehouse,
        status: WarehouseStatus.INACTIVE,
      };
      warehousesService.update.mockResolvedValue(updatedWarehouse);

      const result = await controller.update('warehouse-123', statusDto);

      expect(result.status).toBe(WarehouseStatus.INACTIVE);
      expect(warehousesService.update).toHaveBeenCalledWith(
        'warehouse-123',
        statusDto,
      );
    });

    it('should update isDefault to true', async () => {
      const defaultDto: UpdateWarehouseDto = {
        isDefault: true,
      };
      const updatedWarehouse = { ...mockWarehouse, isDefault: true };
      warehousesService.update.mockResolvedValue(updatedWarehouse);

      const result = await controller.update('warehouse-123', defaultDto);

      expect(result.isDefault).toBe(true);
      expect(warehousesService.update).toHaveBeenCalledWith(
        'warehouse-123',
        defaultDto,
      );
    });

    it('should update isDefault to false', async () => {
      const defaultDto: UpdateWarehouseDto = {
        isDefault: false,
      };
      const updatedWarehouse = { ...mockWarehouse, isDefault: false };
      warehousesService.update.mockResolvedValue(updatedWarehouse);

      const result = await controller.update('warehouse-123', defaultDto);

      expect(result.isDefault).toBe(false);
    });

    it('should clear optional fields by setting to null', async () => {
      const clearDto: UpdateWarehouseDto = {
        city: null,
        phone: null,
      };
      const updatedWarehouse = {
        ...mockWarehouse,
        city: null,
        phone: null,
      };
      warehousesService.update.mockResolvedValue(updatedWarehouse);

      const result = await controller.update('warehouse-123', clearDto);

      expect(result.city).toBeNull();
      expect(result.phone).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const multiDto: UpdateWarehouseDto = {
        name: 'Completely Updated Warehouse',
        code: 'WH-UPDATED',
        address: 'New Address',
        city: 'Cali',
        phone: '+57 2 999 8888',
        status: WarehouseStatus.ACTIVE,
        isDefault: true,
      };
      const updatedWarehouse = { ...mockWarehouse, ...multiDto };
      warehousesService.update.mockResolvedValue(updatedWarehouse);

      const result = await controller.update('warehouse-123', multiDto);

      expect(result).toEqual(updatedWarehouse);
      expect(warehousesService.update).toHaveBeenCalledWith(
        'warehouse-123',
        multiDto,
      );
    });
  });

  describe('delete', () => {
    it('should delete a warehouse', async () => {
      warehousesService.delete.mockResolvedValue(undefined);

      await controller.delete('warehouse-123');

      expect(warehousesService.delete).toHaveBeenCalledWith('warehouse-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Warehouse not found');
      warehousesService.delete.mockRejectedValue(error);

      await expect(controller.delete('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate bad request errors when warehouse has stock', async () => {
      const error = new Error(
        'Cannot delete warehouse "Main Warehouse". 5 product(s) still have stock in this warehouse. Transfer or remove all stock first.',
      );
      warehousesService.delete.mockRejectedValue(error);

      await expect(controller.delete('warehouse-123')).rejects.toThrow(error);
    });

    it('should return undefined on successful deletion', async () => {
      warehousesService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('warehouse-123');

      expect(result).toBeUndefined();
    });
  });

  describe('pagination edge cases', () => {
    describe('findAll pagination', () => {
      it('should handle extremely large page numbers', async () => {
        warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll('999999999', '10');

        expect(warehousesService.findAll).toHaveBeenCalledWith(999999999, 10);
      });

      it('should handle limit at exactly 100', async () => {
        warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll('1', '100');

        expect(warehousesService.findAll).toHaveBeenCalledWith(1, 100);
      });

      it('should handle limit at exactly 101 (should cap to 100)', async () => {
        warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll('1', '101');

        expect(warehousesService.findAll).toHaveBeenCalledWith(1, 100);
      });

      it('should handle whitespace in page value', async () => {
        warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll('  2  ', '10');

        expect(warehousesService.findAll).toHaveBeenCalledWith(2, 10);
      });

      it('should handle whitespace in limit value', async () => {
        warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll('1', '  20  ');

        expect(warehousesService.findAll).toHaveBeenCalledWith(1, 20);
      });

      it('should handle NaN values', async () => {
        warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll('NaN', 'NaN');

        expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
      });

      it('should handle Infinity values', async () => {
        warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll('Infinity', 'Infinity');

        // Infinity parses to Infinity, but max(1, Infinity) = Infinity
        // This tests the actual behavior of parseInt
        expect(warehousesService.findAll).toHaveBeenCalledWith(1, 10);
      });
    });

    describe('getStock pagination', () => {
      it('should handle extremely large page numbers', async () => {
        warehousesService.getStock.mockResolvedValue(mockStockResponse);

        await controller.getStock('warehouse-123', '999999999', '10');

        expect(warehousesService.getStock).toHaveBeenCalledWith(
          'warehouse-123',
          999999999,
          10,
        );
      });

      it('should handle limit at exactly 100', async () => {
        warehousesService.getStock.mockResolvedValue(mockStockResponse);

        await controller.getStock('warehouse-123', '1', '100');

        expect(warehousesService.getStock).toHaveBeenCalledWith(
          'warehouse-123',
          1,
          100,
        );
      });

      it('should handle limit at exactly 101 (should cap to 100)', async () => {
        warehousesService.getStock.mockResolvedValue(mockStockResponse);

        await controller.getStock('warehouse-123', '1', '101');

        expect(warehousesService.getStock).toHaveBeenCalledWith(
          'warehouse-123',
          1,
          100,
        );
      });

      it('should handle whitespace in page value', async () => {
        warehousesService.getStock.mockResolvedValue(mockStockResponse);

        await controller.getStock('warehouse-123', '  3  ', '10');

        expect(warehousesService.getStock).toHaveBeenCalledWith(
          'warehouse-123',
          3,
          10,
        );
      });

      it('should handle whitespace in limit value', async () => {
        warehousesService.getStock.mockResolvedValue(mockStockResponse);

        await controller.getStock('warehouse-123', '1', '  30  ');

        expect(warehousesService.getStock).toHaveBeenCalledWith(
          'warehouse-123',
          1,
          30,
        );
      });

      it('should handle NaN values', async () => {
        warehousesService.getStock.mockResolvedValue(mockStockResponse);

        await controller.getStock('warehouse-123', 'NaN', 'NaN');

        expect(warehousesService.getStock).toHaveBeenCalledWith(
          'warehouse-123',
          1,
          10,
        );
      });
    });
  });

  describe('logging behavior', () => {
    it('should log when listing warehouses', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      warehousesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '10');

      expect(logSpy).toHaveBeenCalledWith(
        'Listing warehouses - page: 1, limit: 10',
      );
    });

    it('should log when getting a warehouse', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      warehousesService.findOne.mockResolvedValue(mockWarehouseWithStock);

      await controller.findOne('warehouse-123');

      expect(logSpy).toHaveBeenCalledWith('Getting warehouse: warehouse-123');
    });

    it('should log when getting warehouse stock', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      warehousesService.getStock.mockResolvedValue(mockStockResponse);

      await controller.getStock('warehouse-123', '1', '10');

      expect(logSpy).toHaveBeenCalledWith(
        'Getting stock for warehouse: warehouse-123 - page: 1, limit: 10',
      );
    });

    it('should log when creating a warehouse', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      warehousesService.create.mockResolvedValue(mockWarehouse);

      await controller.create({ name: 'Test Warehouse' });

      expect(logSpy).toHaveBeenCalledWith('Creating warehouse: Test Warehouse');
    });

    it('should log when updating a warehouse', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      warehousesService.update.mockResolvedValue(mockWarehouse);

      await controller.update('warehouse-123', { name: 'Updated' });

      expect(logSpy).toHaveBeenCalledWith('Updating warehouse: warehouse-123');
    });

    it('should log when deleting a warehouse', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      warehousesService.delete.mockResolvedValue(undefined);

      await controller.delete('warehouse-123');

      expect(logSpy).toHaveBeenCalledWith('Deleting warehouse: warehouse-123');
    });
  });
});
