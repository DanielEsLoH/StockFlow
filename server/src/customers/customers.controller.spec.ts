import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import type {
  CustomerResponse,
  PaginatedCustomersResponse,
} from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';
import { DocumentType, CustomerStatus } from '@prisma/client';

describe('CustomersController', () => {
  let controller: CustomersController;
  let customersService: jest.Mocked<CustomersService>;

  // Test data
  const mockCustomer: CustomerResponse = {
    id: 'customer-123',
    tenantId: 'tenant-123',
    name: 'Juan Carlos Perez',
    email: 'juan@example.com',
    phone: '+57 300 123 4567',
    documentType: DocumentType.CC,
    documentNumber: '1234567890',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    state: null,
    businessName: null,
    taxId: null,
    notes: 'Cliente preferencial',
    status: CustomerStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCustomer2: CustomerResponse = {
    ...mockCustomer,
    id: 'customer-456',
    name: 'Maria Garcia',
    email: 'maria@example.com',
    documentNumber: '0987654321',
  };

  const mockPaginatedResponse: PaginatedCustomersResponse = {
    data: [mockCustomer, mockCustomer2],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockCustomersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: mockCustomersService },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    customersService = module.get(CustomersService);

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
    it('should return paginated customers with default pagination', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll();

      expect(result).toEqual(mockPaginatedResponse);
      expect(customersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should parse page and limit from query params', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('2', '20');

      expect(customersService.findAll).toHaveBeenCalledWith(2, 20);
    });

    it('should enforce minimum page of 1', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('0', '10');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce minimum page of 1 for negative values', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('-5', '10');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce maximum limit of 100', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '200');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 100);
    });

    it('should enforce minimum limit of 1', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '0');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid page value gracefully', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('invalid', '10');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid limit value gracefully', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', 'invalid');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      customersService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(error);
    });

    it('should log the operation', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findAll('2', '20');

      expect(logSpy).toHaveBeenCalledWith(
        'Listing customers - page: 2, limit: 20',
      );
    });

    it('should handle undefined page with defined limit', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(undefined, '25');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 25);
    });

    it('should handle defined page with undefined limit', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('3', undefined);

      expect(customersService.findAll).toHaveBeenCalledWith(3, 10);
    });

    it('should enforce minimum limit of 1 for negative values', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '-10');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 1);
    });

    it('should handle limit at exactly 100', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '100');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 100);
    });

    it('should handle limit at exactly 1', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '1');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 1);
    });

    it('should handle page at exactly 1', async () => {
      customersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '10');

      expect(customersService.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('search', () => {
    it('should search customers with default pagination', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.search('Juan');

      expect(result).toEqual(mockPaginatedResponse);
      expect(customersService.search).toHaveBeenCalledWith('Juan', 1, 10);
    });

    it('should trim search query', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('  Juan  ', '1', '10');

      expect(customersService.search).toHaveBeenCalledWith('Juan', 1, 10);
    });

    it('should handle empty search query', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search();

      expect(customersService.search).toHaveBeenCalledWith('', 1, 10);
    });

    it('should handle undefined search query', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search(undefined, '1', '10');

      expect(customersService.search).toHaveBeenCalledWith('', 1, 10);
    });

    it('should parse page and limit from query params', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '2', '20');

      expect(customersService.search).toHaveBeenCalledWith('test', 2, 20);
    });

    it('should enforce minimum page of 1', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '0', '10');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 10);
    });

    it('should enforce minimum page of 1 for negative values', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '-5', '10');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 10);
    });

    it('should enforce maximum limit of 100', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '1', '200');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 100);
    });

    it('should enforce minimum limit of 1', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '1', '0');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 10);
    });

    it('should handle invalid page value gracefully', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', 'invalid', '10');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 10);
    });

    it('should handle invalid limit value gracefully', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '1', 'invalid');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 10);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      customersService.search.mockRejectedValue(error);

      await expect(controller.search('test')).rejects.toThrow(error);
    });

    it('should log the operation', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.search('Juan', '2', '20');

      expect(logSpy).toHaveBeenCalledWith(
        'Searching customers - query: "Juan", page: 2, limit: 20',
      );
    });

    it('should handle undefined page with defined limit', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', undefined, '25');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 25);
    });

    it('should handle defined page with undefined limit', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '3', undefined);

      expect(customersService.search).toHaveBeenCalledWith('test', 3, 10);
    });

    it('should enforce minimum limit of 1 for negative values', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '1', '-10');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 1);
    });

    it('should handle limit at exactly 100', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '1', '100');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 100);
    });

    it('should handle limit at exactly 1', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '1', '1');

      expect(customersService.search).toHaveBeenCalledWith('test', 1, 1);
    });

    it('should handle empty string query after trim', async () => {
      customersService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('   ', '1', '10');

      expect(customersService.search).toHaveBeenCalledWith('', 1, 10);
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      customersService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne('customer-123');

      expect(result).toEqual(mockCustomer);
      expect(customersService.findOne).toHaveBeenCalledWith('customer-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Customer not found');
      customersService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(error);
    });

    it('should log the operation', async () => {
      customersService.findOne.mockResolvedValue(mockCustomer);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.findOne('customer-123');

      expect(logSpy).toHaveBeenCalledWith('Getting customer: customer-123');
    });
  });

  describe('create', () => {
    const createDto: CreateCustomerDto = {
      name: 'New Customer',
      email: 'new@example.com',
      phone: '+57 300 999 8888',
      documentType: DocumentType.CC,
      documentNumber: '5555555555',
      address: 'Carrera 10 #20-30',
      city: 'Medellin',
      notes: 'New customer notes',
    };

    it('should create and return a new customer', async () => {
      const createdCustomer = { ...mockCustomer, ...createDto };
      customersService.create.mockResolvedValue(createdCustomer);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdCustomer);
      expect(customersService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate validation errors', async () => {
      const error = new Error('Validation failed');
      customersService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });

    it('should propagate conflict errors for duplicate document number', async () => {
      const error = new Error('El numero de documento ya existe');
      customersService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });

    it('should log the operation', async () => {
      const createdCustomer = { ...mockCustomer, ...createDto };
      customersService.create.mockResolvedValue(createdCustomer);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.create(createDto);

      expect(logSpy).toHaveBeenCalledWith(
        `Creating customer: ${createDto.name} (Document: ${createDto.documentNumber})`,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCustomerDto = {
      name: 'Updated Customer Name',
      phone: '+57 300 111 2222',
    };

    it('should update and return the customer', async () => {
      const updatedCustomer = { ...mockCustomer, ...updateDto };
      customersService.update.mockResolvedValue(updatedCustomer);

      const result = await controller.update('customer-123', updateDto);

      expect(result).toEqual(updatedCustomer);
      expect(customersService.update).toHaveBeenCalledWith(
        'customer-123',
        updateDto,
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Customer not found');
      customersService.update.mockRejectedValue(error);

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(
        error,
      );
    });

    it('should propagate conflict errors for duplicate document number', async () => {
      const updateDtoWithDocument: UpdateCustomerDto = {
        documentNumber: '0987654321',
      };
      const error = new Error('El numero de documento ya existe');
      customersService.update.mockRejectedValue(error);

      await expect(
        controller.update('customer-123', updateDtoWithDocument),
      ).rejects.toThrow(error);
    });

    it('should log the operation', async () => {
      const updatedCustomer = { ...mockCustomer, ...updateDto };
      customersService.update.mockResolvedValue(updatedCustomer);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.update('customer-123', updateDto);

      expect(logSpy).toHaveBeenCalledWith('Updating customer: customer-123');
    });
  });

  describe('delete', () => {
    it('should delete a customer', async () => {
      customersService.delete.mockResolvedValue(undefined);

      await controller.delete('customer-123');

      expect(customersService.delete).toHaveBeenCalledWith('customer-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Customer not found');
      customersService.delete.mockRejectedValue(error);

      await expect(controller.delete('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate conflict errors when customer has invoices', async () => {
      const error = new Error(
        'No se puede eliminar un cliente con facturas asociadas',
      );
      customersService.delete.mockRejectedValue(error);

      await expect(controller.delete('customer-123')).rejects.toThrow(error);
    });

    it('should log the operation', async () => {
      customersService.delete.mockResolvedValue(undefined);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.delete('customer-123');

      expect(logSpy).toHaveBeenCalledWith('Deleting customer: customer-123');
    });
  });
});
