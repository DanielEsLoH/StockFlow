import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DocumentType, CustomerStatus } from '@prisma/client';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

describe('CustomersService', () => {
  let service: CustomersService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockCustomer = {
    id: 'customer-123',
    tenantId: mockTenantId,
    name: 'Juan Perez',
    email: 'juan.perez@example.com',
    phone: '+573001234567',
    documentType: DocumentType.CC,
    documentNumber: '1234567890',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    state: null,
    businessName: null,
    taxId: null,
    notes: 'Cliente frecuente',
    status: CustomerStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCustomer2 = {
    ...mockCustomer,
    id: 'customer-456',
    name: 'Maria Garcia',
    documentNumber: '0987654321',
    email: 'maria.garcia@example.com',
    phone: '+573009876543',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      customer: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      invoice: {
        count: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
      enforceLimit: jest.fn().mockResolvedValue(undefined),
      checkLimit: jest.fn().mockResolvedValue(true),
      getTenant: jest.fn().mockResolvedValue({
        id: mockTenantId,
        name: 'Test Tenant',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
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
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([
        mockCustomer,
        mockCustomer2,
      ]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated customers', async () => {
      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([
        mockCustomer,
      ]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll(2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no customers exist', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.findAll();

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should order customers by name ascending', async () => {
      await service.findAll();

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('should scope findAll to tenant', async () => {
      await service.findAll();

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        }),
      );
      expect(prismaService.customer.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
    });

    it('should handle large page numbers correctly', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(100);

      const result = await service.findAll(5, 20);

      expect(result.meta.page).toBe(5);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(5);
      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 80, take: 20 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      const result = await service.findOne('customer-123');

      expect(result.id).toBe('customer-123');
      expect(result.name).toBe('Juan Perez');
      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Customer with ID nonexistent not found',
      );
    });

    it('should include all expected fields in response', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      const result = await service.findOne('customer-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('documentNumber');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('businessName');
      expect(result).toHaveProperty('taxId');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await service.findOne('customer-123');

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: mockTenantId },
      });
    });

    it('should require tenant context', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await service.findOne('customer-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto: CreateCustomerDto = {
      name: 'Carlos Rodriguez',
      documentType: DocumentType.CC,
      documentNumber: '9876543210',
      email: 'carlos.rodriguez@example.com',
      phone: '+573005551234',
      address: 'Carrera 50 #10-20',
      city: 'Medellin',
      notes: 'Nuevo cliente',
    };

    const newCustomer = {
      ...mockCustomer,
      id: 'new-customer-id',
      name: 'Carlos Rodriguez',
      documentNumber: '9876543210',
      email: 'carlos.rodriguez@example.com',
      phone: '+573005551234',
      address: 'Carrera 50 #10-20',
      city: 'Medellin',
      notes: 'Nuevo cliente',
    };

    beforeEach(() => {
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue(
        newCustomer,
      );
    });

    it('should create a new customer', async () => {
      const result = await service.create(createDto);

      expect(result.documentNumber).toBe('9876543210');
      expect(result.name).toBe('Carlos Rodriguez');
      expect(prismaService.customer.create).toHaveBeenCalled();
    });

    it('should trim name', async () => {
      const dtoWithSpaces = {
        ...createDto,
        name: '  Carlos Rodriguez  ',
      };

      await service.create(dtoWithSpaces);

      expect(prismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Carlos Rodriguez',
          }),
        }),
      );
    });

    it('should trim documentNumber', async () => {
      const dtoWithSpaces = {
        ...createDto,
        documentNumber: '  9876543210  ',
      };

      await service.create(dtoWithSpaces);

      expect(prismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentNumber: '9876543210',
          }),
        }),
      );
    });

    it('should check for existing documentNumber with compound key', async () => {
      await service.create(createDto);

      expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_documentNumber: {
            tenantId: mockTenantId,
            documentNumber: '9876543210',
          },
        },
      });
    });

    it('should throw ConflictException when documentNumber already exists', async () => {
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct Spanish message for duplicate documentNumber', async () => {
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'El número de documento ya existe',
      );
    });

    it('should create customer without optional fields', async () => {
      const minimalDto: CreateCustomerDto = {
        name: 'Minimal Customer',
        documentType: DocumentType.CC,
        documentNumber: '1111111111',
      };
      const minimalCustomer = {
        ...mockCustomer,
        id: 'minimal-id',
        name: 'Minimal Customer',
        documentNumber: '1111111111',
        email: null,
        phone: null,
        address: null,
        city: null,
        notes: null,
      };
      (prismaService.customer.create as jest.Mock).mockResolvedValue(
        minimalCustomer,
      );

      const result = await service.create(minimalDto);

      expect(result.name).toBe('Minimal Customer');
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.city).toBeNull();
      expect(result.notes).toBeNull();
    });

    it('should require tenant context', async () => {
      await service.create(createDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should include tenantId in created customer', async () => {
      await service.create(createDto);

      expect(prismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        }),
      );
    });

    it('should set status to ACTIVE on create', async () => {
      await service.create(createDto);

      expect(prismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CustomerStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCustomerDto = {
      name: 'Juan Carlos Perez',
      phone: '+573001111111',
    };

    beforeEach(() => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.update as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        name: 'Juan Carlos Perez',
        phone: '+573001111111',
      });
    });

    it('should update a customer', async () => {
      const result = await service.update('customer-123', updateDto);

      expect(result.name).toBe('Juan Carlos Perez');
      expect(result.phone).toBe('+573001111111');
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'Customer with ID nonexistent not found',
      );
    });

    describe('documentNumber update', () => {
      it('should check uniqueness when changing documentNumber', async () => {
        const documentUpdate: UpdateCustomerDto = {
          documentNumber: 'NEW-DOC-123',
        };

        await service.update('customer-123', documentUpdate);

        expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
          where: {
            tenantId_documentNumber: {
              tenantId: mockTenantId,
              documentNumber: 'NEW-DOC-123',
            },
          },
        });
      });

      it('should throw ConflictException when new documentNumber already exists', async () => {
        const documentUpdate: UpdateCustomerDto = {
          documentNumber: '0987654321',
        };
        (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
          mockCustomer2,
        );

        await expect(
          service.update('customer-123', documentUpdate),
        ).rejects.toThrow(ConflictException);
      });

      it('should throw ConflictException with correct Spanish message for duplicate documentNumber', async () => {
        const documentUpdate: UpdateCustomerDto = {
          documentNumber: '0987654321',
        };
        (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
          mockCustomer2,
        );

        await expect(
          service.update('customer-123', documentUpdate),
        ).rejects.toThrow('El número de documento ya existe');
      });

      it('should not check uniqueness if documentNumber is unchanged', async () => {
        const documentUpdate: UpdateCustomerDto = {
          documentNumber: '1234567890',
        }; // Same as mockCustomer

        await service.update('customer-123', documentUpdate);

        expect(prismaService.customer.findUnique).not.toHaveBeenCalled();
      });

      it('should trim documentNumber when updating', async () => {
        const documentUpdate: UpdateCustomerDto = {
          documentNumber: '  NEW-DOC-456  ',
        };

        await service.update('customer-123', documentUpdate);

        expect(prismaService.customer.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              documentNumber: 'NEW-DOC-456',
            }),
          }),
        );
      });
    });

    it('should update only provided fields', async () => {
      const partialUpdate: UpdateCustomerDto = { phone: '+573002222222' };
      (prismaService.customer.update as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        phone: '+573002222222',
      });

      await service.update('customer-123', partialUpdate);

      expect(prismaService.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer-123' },
        data: { phone: '+573002222222' },
      });
    });

    it('should require tenant context', async () => {
      await service.update('customer-123', updateDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope update to tenant', async () => {
      await service.update('customer-123', updateDto);

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: mockTenantId },
      });
    });

    describe('individual field updates', () => {
      it('should update email when provided', async () => {
        const emailUpdate: UpdateCustomerDto = {
          email: 'new.email@example.com',
        };
        (prismaService.customer.update as jest.Mock).mockResolvedValue({
          ...mockCustomer,
          email: 'new.email@example.com',
        });

        await service.update('customer-123', emailUpdate);

        expect(prismaService.customer.update).toHaveBeenCalledWith({
          where: { id: 'customer-123' },
          data: { email: 'new.email@example.com' },
        });
      });

      it('should update address when provided', async () => {
        const addressUpdate: UpdateCustomerDto = {
          address: 'Nueva direccion 123',
        };
        (prismaService.customer.update as jest.Mock).mockResolvedValue({
          ...mockCustomer,
          address: 'Nueva direccion 123',
        });

        await service.update('customer-123', addressUpdate);

        expect(prismaService.customer.update).toHaveBeenCalledWith({
          where: { id: 'customer-123' },
          data: { address: 'Nueva direccion 123' },
        });
      });

      it('should update city when provided', async () => {
        const cityUpdate: UpdateCustomerDto = { city: 'Cali' };
        (prismaService.customer.update as jest.Mock).mockResolvedValue({
          ...mockCustomer,
          city: 'Cali',
        });

        await service.update('customer-123', cityUpdate);

        expect(prismaService.customer.update).toHaveBeenCalledWith({
          where: { id: 'customer-123' },
          data: { city: 'Cali' },
        });
      });

      it('should update notes when provided', async () => {
        const notesUpdate: UpdateCustomerDto = { notes: 'Cliente VIP' };
        (prismaService.customer.update as jest.Mock).mockResolvedValue({
          ...mockCustomer,
          notes: 'Cliente VIP',
        });

        await service.update('customer-123', notesUpdate);

        expect(prismaService.customer.update).toHaveBeenCalledWith({
          where: { id: 'customer-123' },
          data: { notes: 'Cliente VIP' },
        });
      });

      it('should update documentType when provided', async () => {
        const documentTypeUpdate: UpdateCustomerDto = {
          documentType: DocumentType.NIT,
        };
        (prismaService.customer.update as jest.Mock).mockResolvedValue({
          ...mockCustomer,
          documentType: DocumentType.NIT,
        });

        await service.update('customer-123', documentTypeUpdate);

        expect(prismaService.customer.update).toHaveBeenCalledWith({
          where: { id: 'customer-123' },
          data: { documentType: DocumentType.NIT },
        });
      });

      it('should update multiple fields at once', async () => {
        const multiUpdate: UpdateCustomerDto = {
          name: 'Updated Name',
          email: 'updated@example.com',
          phone: '+573003333333',
          address: 'Updated Address',
          city: 'Updated City',
          notes: 'Updated notes',
        };
        (prismaService.customer.update as jest.Mock).mockResolvedValue({
          ...mockCustomer,
          ...multiUpdate,
        });

        await service.update('customer-123', multiUpdate);

        expect(prismaService.customer.update).toHaveBeenCalledWith({
          where: { id: 'customer-123' },
          data: expect.objectContaining({
            name: 'Updated Name',
            email: 'updated@example.com',
            phone: '+573003333333',
            address: 'Updated Address',
            city: 'Updated City',
            notes: 'Updated notes',
          }),
        });
      });
    });

    it('should trim name when updating', async () => {
      const nameUpdate: UpdateCustomerDto = { name: '  Trimmed Name  ' };

      await service.update('customer-123', nameUpdate);

      expect(prismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Trimmed Name',
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.delete as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
    });

    it('should delete a customer', async () => {
      await service.delete('customer-123');

      expect(prismaService.customer.delete).toHaveBeenCalledWith({
        where: { id: 'customer-123' },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Customer with ID nonexistent not found',
      );
    });

    it('should check for associated invoices', async () => {
      await service.delete('customer-123');

      expect(prismaService.invoice.count).toHaveBeenCalledWith({
        where: { customerId: 'customer-123' },
      });
    });

    it('should throw BadRequestException when invoices are associated', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('customer-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct Spanish message format for associated invoices', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('customer-123')).rejects.toThrow(
        'No se puede eliminar un cliente con facturas asociadas. El cliente tiene 5 factura(s) asociada(s)',
      );
    });

    it('should throw BadRequestException with correct message for single invoice', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(1);

      await expect(service.delete('customer-123')).rejects.toThrow(
        'No se puede eliminar un cliente con facturas asociadas. El cliente tiene 1 factura(s) asociada(s)',
      );
    });

    it('should require tenant context', async () => {
      await service.delete('customer-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope delete to tenant', async () => {
      await service.delete('customer-123');

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: mockTenantId },
      });
    });
  });

  describe('search', () => {
    beforeEach(() => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([
        mockCustomer,
      ]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(1);
    });

    it('should search customers by query', async () => {
      const result = await service.search('Juan', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'Juan', mode: 'insensitive' },
              }),
              expect.objectContaining({
                documentNumber: { contains: 'Juan', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should search by name', async () => {
      await service.search('Perez', 1, 10);

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'Perez', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should search by documentNumber', async () => {
      await service.search('1234567890', 1, 10);

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                documentNumber: { contains: '1234567890', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should perform case-insensitive search', async () => {
      await service.search('JUAN', 1, 10);

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'JUAN', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should paginate search results', async () => {
      await service.search('Juan', 2, 10);

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      await service.search('Juan');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope search to tenant', async () => {
      await service.search('Juan', 1, 10);

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should return empty array when no matches found', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.search('NonExistent');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.search('Juan');

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should return paginated results with correct meta', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([
        mockCustomer,
        mockCustomer2,
      ]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(25);

      const result = await service.search('Juan', 1, 10);

      expect(result.meta).toEqual({
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });
    });
  });

  describe('mapToCustomerResponse', () => {
    it('should include all expected fields', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      const result = await service.findOne('customer-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('documentNumber');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('businessName');
      expect(result).toHaveProperty('taxId');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should return correct values', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      const result = await service.findOne('customer-123');

      expect(result.id).toBe('customer-123');
      expect(result.name).toBe('Juan Perez');
      expect(result.documentType).toBe(DocumentType.CC);
      expect(result.documentNumber).toBe('1234567890');
      expect(result.email).toBe('juan.perez@example.com');
      expect(result.phone).toBe('+573001234567');
      expect(result.address).toBe('Calle 123 #45-67');
      expect(result.city).toBe('Bogota');
      expect(result.notes).toBe('Cliente frecuente');
      expect(result.tenantId).toBe(mockTenantId);
    });
  });

  describe('logging', () => {
    it('should log debug when listing customers', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Listing customers for tenant'),
      );
    });

    it('should log when customer is created', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        id: 'new-id',
      });

      await service.create({
        name: 'Test Customer',
        documentType: DocumentType.CC,
        documentNumber: '5555555555',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Customer created'),
      );
    });

    it('should log when customer is updated', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.customer.update as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await service.update('customer-123', { name: 'Updated' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Customer updated'),
      );
    });

    it('should log when customer is deleted', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.delete as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await service.delete('customer-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Customer deleted'),
      );
    });

    it('should log warning when customer not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.findOne('nonexistent');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith('Customer not found: nonexistent');
    });

    it('should log warning when documentNumber already exists', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      try {
        await service.create({
          name: 'Test Customer',
          documentType: DocumentType.CC,
          documentNumber: '1234567890',
        });
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Document number already exists: 1234567890',
      );
    });

    it('should log warning when trying to delete customer with invoices', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(3);

      try {
        await service.delete('customer-123');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Cannot delete customer customer-123: 3 invoices associated',
      );
    });

    it('should log debug when searching customers', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      await service.search('test');

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Searching customers'),
      );
    });
  });

  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        }),
      );
      expect(prismaService.customer.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await service.findOne('customer-123');

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: mockTenantId },
      });
    });

    it('should scope search to tenant', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      await service.search('test');

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope create uniqueness check to tenant', async () => {
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await service.create({
        name: 'Test Customer',
        documentType: DocumentType.CC,
        documentNumber: '9999999999',
      });

      expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_documentNumber: {
            tenantId: mockTenantId,
            documentNumber: '9999999999',
          },
        },
      });
    });

    it('should scope update check to tenant', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.customer.update as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await service.update('customer-123', { name: 'Updated' });

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: mockTenantId },
      });
    });

    it('should scope delete check to tenant', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.delete as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      await service.delete('customer-123');

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: mockTenantId },
      });
    });

    it('should not allow access to customers from other tenants', async () => {
      const otherTenantCustomer = { ...mockCustomer, tenantId: 'other-tenant' };
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      // Even if a customer exists with this ID but belongs to another tenant,
      // it should not be found
      await expect(service.findOne(otherTenantCustomer.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
