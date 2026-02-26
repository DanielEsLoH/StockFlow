import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RemissionStatus } from '@prisma/client';
import { RemissionsService } from './remissions.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';

describe('RemissionsService', () => {
  let service: RemissionsService;
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const now = new Date('2026-02-25T12:00:00.000Z');

  const mockRemission = {
    id: 'rem-1',
    tenantId: mockTenantId,
    customerId: 'cust-1',
    userId: mockUserId,
    warehouseId: 'wh-1',
    invoiceId: null,
    remissionNumber: 'REM-00001',
    status: RemissionStatus.DRAFT,
    issueDate: now,
    deliveryDate: null,
    deliveryAddress: 'Calle 100 #15-20, Bogota',
    transportInfo: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };

  const mockItem = {
    id: 'item-1',
    remissionId: 'rem-1',
    productId: 'prod-1',
    description: 'Producto XYZ',
    quantity: 10,
    unit: 'unit',
    notes: null,
    product: {
      id: 'prod-1',
      sku: 'SKU-001',
      name: 'Producto XYZ',
    },
  };

  const mockCustomer = {
    id: 'cust-1',
    name: 'Cliente Test',
    email: 'cliente@test.com',
    phone: '3001234567',
    address: 'Calle 100',
  };

  const mockUser = {
    id: mockUserId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
  };

  const mockWarehouse = {
    id: 'wh-1',
    name: 'Bodega Principal',
    code: 'BP-001',
  };

  const mockRemissionWithRelations = {
    ...mockRemission,
    items: [mockItem],
    customer: mockCustomer,
    user: mockUser,
    warehouse: mockWarehouse,
    invoice: null,
  };

  const mockPrismaService = {
    remission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    remissionItem: {
      createMany: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((fn) => fn(mockPrismaService)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemissionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<RemissionsService>(RemissionsService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createDto = {
      customerId: 'cust-1',
      warehouseId: 'wh-1',
      deliveryAddress: 'Calle 100 #15-20, Bogota',
      items: [
        {
          productId: 'prod-1',
          description: 'Producto XYZ',
          quantity: 10,
          unit: 'kg',
        },
      ],
    };

    it('should create a remission with items', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(mockWarehouse);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1' },
      ]);
      // Inside the transaction
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null); // for generateRemissionNumber
      (prisma.remission.create as jest.Mock).mockResolvedValue(mockRemission);
      (prisma.remissionItem.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.remission.findUnique as jest.Mock).mockResolvedValue(
        mockRemissionWithRelations,
      );

      const result = await service.create(createDto, mockUserId);

      expect(result.id).toBe('rem-1');
      expect(result.remissionNumber).toBe('REM-00001');
      expect(result.status).toBe(RemissionStatus.DRAFT);
      expect(result.items).toHaveLength(1);
      expect(result.items![0].description).toBe('Producto XYZ');
      expect(result.customer?.name).toBe('Cliente Test');
      expect(result.user?.name).toBe('John Doe');
      expect(result.warehouse?.code).toBe('BP-001');
      expect(tenantContext.requireTenantId).toHaveBeenCalled();
    });

    it('should create a remission without optional relations', async () => {
      const minimalDto = {
        items: [{ description: 'Custom item', quantity: 5 }],
      };

      const minimalRemission = {
        ...mockRemission,
        customerId: null,
        warehouseId: null,
        invoiceId: null,
        items: [
          {
            ...mockItem,
            productId: null,
            description: 'Custom item',
            quantity: 5,
            product: null,
          },
        ],
        customer: null,
        user: mockUser,
        warehouse: null,
        invoice: null,
      };

      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.remission.create as jest.Mock).mockResolvedValue(mockRemission);
      (prisma.remissionItem.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.remission.findUnique as jest.Mock).mockResolvedValue(
        minimalRemission,
      );

      const result = await service.create(minimalDto, mockUserId);

      expect(result.customer).toBeUndefined();
      expect(result.warehouse).toBeUndefined();
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when invoice not found', async () => {
      const dtoWithInvoice = { ...createDto, invoiceId: 'inv-1' };
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(mockWarehouse);
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(dtoWithInvoice, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when product in items not found', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(mockWarehouse);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when transaction returns null', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(mockWarehouse);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1' },
      ]);
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.remission.create as jest.Mock).mockResolvedValue(mockRemission);
      (prisma.remissionItem.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.remission.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated remissions with default filters', async () => {
      (prisma.remission.findMany as jest.Mock).mockResolvedValue([
        mockRemissionWithRelations,
      ]);
      (prisma.remission.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prisma.remission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply status filter', async () => {
      (prisma.remission.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.remission.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ status: RemissionStatus.DISPATCHED });

      expect(prisma.remission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            status: RemissionStatus.DISPATCHED,
          },
        }),
      );
    });

    it('should apply customerId and warehouseId filters', async () => {
      (prisma.remission.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.remission.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ customerId: 'cust-1', warehouseId: 'wh-1' });

      expect(prisma.remission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            customerId: 'cust-1',
            warehouseId: 'wh-1',
          },
        }),
      );
    });

    it('should apply date range filters', async () => {
      const fromDate = new Date('2026-01-01');
      const toDate = new Date('2026-12-31');

      (prisma.remission.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.remission.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ fromDate, toDate });

      expect(prisma.remission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            issueDate: { gte: fromDate, lte: toDate },
          },
        }),
      );
    });

    it('should apply search filter with OR conditions', async () => {
      (prisma.remission.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.remission.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ search: 'REM-001' });

      expect(prisma.remission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            OR: [
              { remissionNumber: { contains: 'REM-001', mode: 'insensitive' } },
              {
                customer: {
                  name: { contains: 'REM-001', mode: 'insensitive' },
                },
              },
              {
                deliveryAddress: {
                  contains: 'REM-001',
                  mode: 'insensitive',
                },
              },
            ],
          },
        }),
      );
    });

    it('should paginate correctly', async () => {
      (prisma.remission.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.remission.count as jest.Mock).mockResolvedValue(25);

      const result = await service.findAll({ page: 3, limit: 5 });

      expect(result.meta).toEqual({
        total: 25,
        page: 3,
        limit: 5,
        totalPages: 5,
      });
      expect(prisma.remission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        }),
      );
    });

    it('should return totalPages 0 when no results', async () => {
      (prisma.remission.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.remission.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a remission by id with relations', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemissionWithRelations,
      );

      const result = await service.findOne('rem-1');

      expect(result.id).toBe('rem-1');
      expect(result.remissionNumber).toBe('REM-00001');
      expect(result.items).toHaveLength(1);
      expect(result.customer?.name).toBe('Cliente Test');
      expect(result.user?.name).toBe('John Doe');
      expect(result.warehouse?.code).toBe('BP-001');
      expect(prisma.remission.findFirst).toHaveBeenCalledWith({
        where: { id: 'rem-1', tenantId: mockTenantId },
        include: {
          items: { include: { product: true } },
          customer: true,
          user: true,
          warehouse: true,
          invoice: true,
        },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a DRAFT remission', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.remission.update as jest.Mock).mockResolvedValue({
        ...mockRemissionWithRelations,
        notes: 'Updated notes',
      });

      const result = await service.update('rem-1', { notes: 'Updated notes' });

      expect(result.notes).toBe('Updated notes');
      expect(prisma.remission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rem-1' },
          data: { notes: 'Updated notes' },
        }),
      );
    });

    it('should throw NotFoundException when remission not found', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { notes: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when remission is not DRAFT', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        status: RemissionStatus.DISPATCHED,
      });

      await expect(
        service.update('rem-1', { notes: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate customer when customerId provided', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('rem-1', { customerId: 'bad-cust' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate warehouse when warehouseId provided', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('rem-1', { warehouseId: 'bad-wh' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate invoice when invoiceId provided', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('rem-1', { invoiceId: 'bad-inv' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should replace items when items array provided', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1' },
      ]);
      (prisma.remission.update as jest.Mock).mockResolvedValue(
        mockRemissionWithRelations,
      );

      const updateDto = {
        items: [
          {
            productId: 'prod-1',
            description: 'Updated item',
            quantity: 20,
            unit: 'kg',
          },
        ],
      };

      await service.update('rem-1', updateDto);

      expect(prisma.remission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              deleteMany: {},
              createMany: {
                data: [
                  {
                    productId: 'prod-1',
                    description: 'Updated item',
                    quantity: 20,
                    unit: 'kg',
                    notes: null,
                  },
                ],
              },
            },
          }),
        }),
      );
    });

    it('should throw NotFoundException when product in items not found', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.update('rem-1', {
          items: [
            { productId: 'bad-prod', description: 'Test', quantity: 1 },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a DRAFT remission', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.remission.delete as jest.Mock).mockResolvedValue(mockRemission);

      await service.remove('rem-1');

      expect(prisma.remission.delete).toHaveBeenCalledWith({
        where: { id: 'rem-1' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when not DRAFT', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        status: RemissionStatus.DISPATCHED,
      });

      await expect(service.remove('rem-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('dispatch', () => {
    it('should dispatch a DRAFT remission', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.remission.update as jest.Mock).mockResolvedValue({
        ...mockRemissionWithRelations,
        status: RemissionStatus.DISPATCHED,
      });

      const result = await service.dispatch('rem-1');

      expect(result.status).toBe(RemissionStatus.DISPATCHED);
      expect(prisma.remission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rem-1' },
          data: expect.objectContaining({
            status: RemissionStatus.DISPATCHED,
          }),
        }),
      );
    });

    it('should set deliveryDate when not already set', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        deliveryDate: null,
      });
      (prisma.remission.update as jest.Mock).mockResolvedValue({
        ...mockRemissionWithRelations,
        status: RemissionStatus.DISPATCHED,
      });

      await service.dispatch('rem-1');

      expect(prisma.remission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: RemissionStatus.DISPATCHED,
            deliveryDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should not overwrite existing deliveryDate', async () => {
      const existingDate = new Date('2026-03-01');
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        deliveryDate: existingDate,
      });
      (prisma.remission.update as jest.Mock).mockResolvedValue({
        ...mockRemissionWithRelations,
        status: RemissionStatus.DISPATCHED,
        deliveryDate: existingDate,
      });

      await service.dispatch('rem-1');

      const updateCall = (prisma.remission.update as jest.Mock).mock.calls[0];
      expect(updateCall[0].data).toEqual({
        status: RemissionStatus.DISPATCHED,
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.dispatch('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when not DRAFT', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        status: RemissionStatus.DELIVERED,
      });

      await expect(service.dispatch('rem-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deliver', () => {
    it('should deliver a DISPATCHED remission', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        status: RemissionStatus.DISPATCHED,
      });
      (prisma.remission.update as jest.Mock).mockResolvedValue({
        ...mockRemissionWithRelations,
        status: RemissionStatus.DELIVERED,
      });

      const result = await service.deliver('rem-1');

      expect(result.status).toBe(RemissionStatus.DELIVERED);
      expect(prisma.remission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rem-1' },
          data: {
            status: RemissionStatus.DELIVERED,
            deliveryDate: expect.any(Date),
          },
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.deliver('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when not DISPATCHED', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        status: RemissionStatus.DRAFT,
      });

      await expect(service.deliver('rem-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a DRAFT remission', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(
        mockRemission,
      );
      (prisma.remission.update as jest.Mock).mockResolvedValue({
        ...mockRemissionWithRelations,
        status: RemissionStatus.CANCELLED,
      });

      const result = await service.cancel('rem-1');

      expect(result.status).toBe(RemissionStatus.CANCELLED);
      expect(prisma.remission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rem-1' },
          data: { status: RemissionStatus.CANCELLED },
        }),
      );
    });

    it('should cancel a DISPATCHED remission', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        status: RemissionStatus.DISPATCHED,
      });
      (prisma.remission.update as jest.Mock).mockResolvedValue({
        ...mockRemissionWithRelations,
        status: RemissionStatus.CANCELLED,
      });

      const result = await service.cancel('rem-1');

      expect(result.status).toBe(RemissionStatus.CANCELLED);
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when already DELIVERED', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        status: RemissionStatus.DELIVERED,
      });

      await expect(service.cancel('rem-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when already CANCELLED', async () => {
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue({
        ...mockRemission,
        status: RemissionStatus.CANCELLED,
      });

      await expect(service.cancel('rem-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should return remission statistics', async () => {
      (prisma.remission.findMany as jest.Mock).mockResolvedValue([
        { status: RemissionStatus.DRAFT },
        { status: RemissionStatus.DRAFT },
        { status: RemissionStatus.DISPATCHED },
        { status: RemissionStatus.DELIVERED },
      ]);

      const result = await service.getStats();

      expect(result.totalRemissions).toBe(4);
      expect(result.remissionsByStatus).toEqual({
        DRAFT: 2,
        DISPATCHED: 1,
        DELIVERED: 1,
        CANCELLED: 0,
      });
      expect(prisma.remission.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: { status: true },
      });
    });

    it('should return zero counts when no remissions exist', async () => {
      (prisma.remission.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalRemissions).toBe(0);
      expect(result.remissionsByStatus).toEqual({
        DRAFT: 0,
        DISPATCHED: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      });
    });
  });

  describe('createFromInvoice', () => {
    const mockInvoice = {
      id: 'inv-1',
      tenantId: mockTenantId,
      customerId: 'cust-1',
      warehouseId: 'wh-1',
      invoiceNumber: 'FAC-00001',
      customer: {
        ...mockCustomer,
        address: 'Calle 100 #15-20',
      },
      items: [
        {
          id: 'inv-item-1',
          productId: 'prod-1',
          quantity: 10,
          product: { id: 'prod-1', sku: 'SKU-001', name: 'Producto XYZ' },
        },
      ],
    };

    it('should create a remission from an invoice', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null); // for generateRemissionNumber
      (prisma.remission.create as jest.Mock).mockResolvedValue(mockRemission);
      (prisma.remissionItem.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.remission.findUnique as jest.Mock).mockResolvedValue(
        mockRemissionWithRelations,
      );

      const result = await service.createFromInvoice('inv-1', mockUserId);

      expect(result.id).toBe('rem-1');
      expect(result.remissionNumber).toBe('REM-00001');
      expect(prisma.remission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            userId: mockUserId,
            customerId: 'cust-1',
            warehouseId: 'wh-1',
            invoiceId: 'inv-1',
            status: RemissionStatus.DRAFT,
          }),
        }),
      );
      expect(prisma.remissionItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            remissionId: 'rem-1',
            productId: 'prod-1',
            description: 'Producto XYZ',
            quantity: 10,
            unit: 'unit',
            notes: null,
          },
        ],
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createFromInvoice('nonexistent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction returns null', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.remission.create as jest.Mock).mockResolvedValue(mockRemission);
      (prisma.remissionItem.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.remission.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createFromInvoice('inv-1', mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle invoice with no items', async () => {
      const emptyInvoice = {
        ...mockInvoice,
        items: [],
      };
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(emptyInvoice);
      (prisma.remission.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.remission.create as jest.Mock).mockResolvedValue(mockRemission);
      (prisma.remission.findUnique as jest.Mock).mockResolvedValue({
        ...mockRemissionWithRelations,
        items: [],
      });

      const result = await service.createFromInvoice('inv-1', mockUserId);

      expect(result.items).toHaveLength(0);
      expect(prisma.remissionItem.createMany).not.toHaveBeenCalled();
    });
  });
});
