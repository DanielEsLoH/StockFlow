/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { QuotationStatus, TaxCategory } from '@prisma/client';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { InvoicesService } from '../invoices';
import type {
  CreateQuotationDto,
  UpdateQuotationDto,
  FilterQuotationsDto,
} from './dto';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let invoicesService: jest.Mocked<InvoicesService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockProduct = {
    id: 'product-123',
    tenantId: mockTenantId,
    sku: 'SKU-001',
    name: 'Test Product',
    description: 'A test product',
    stock: 100,
    minStock: 10,
    price: 99.99,
    cost: 50.0,
    categoryId: 'category-123',
    warehouseId: 'warehouse-123',
    isActive: true,
    taxCategory: TaxCategory.GRAVADO_19,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCustomer = {
    id: 'customer-123',
    tenantId: mockTenantId,
    name: 'Juan Perez',
    email: 'juan.perez@example.com',
    phone: '+573001234567',
    documentType: 'CC',
    documentNumber: '123456789',
    address: 'Calle 123',
    city: 'Bogota',
  };

  const mockUser = {
    id: mockUserId,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
  };

  const mockQuotationItem = {
    id: 'qitem-123',
    quotationId: 'quotation-123',
    productId: mockProduct.id,
    quantity: 2,
    unitPrice: 99.99,
    taxRate: 19,
    taxCategory: TaxCategory.GRAVADO_19,
    discount: 0,
    subtotal: 199.98,
    tax: 37.9962,
    total: 237.9762,
    createdAt: new Date('2024-01-01'),
    product: {
      id: mockProduct.id,
      sku: mockProduct.sku,
      name: mockProduct.name,
    },
  };

  const mockQuotation = {
    id: 'quotation-123',
    tenantId: mockTenantId,
    customerId: mockCustomer.id,
    userId: mockUserId,
    quotationNumber: 'COT-00001',
    subtotal: 199.98,
    tax: 37.9962,
    discount: 0,
    total: 237.9762,
    issueDate: new Date('2024-01-01'),
    validUntil: new Date('2024-02-01'),
    status: QuotationStatus.DRAFT,
    notes: 'Test quotation',
    convertedToInvoiceId: null,
    convertedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    items: [mockQuotationItem],
    customer: mockCustomer,
    user: mockUser,
    convertedToInvoice: null,
  };

  const mockQuotation2 = {
    ...mockQuotation,
    id: 'quotation-456',
    quotationNumber: 'COT-00002',
    status: QuotationStatus.SENT,
  };

  // Mock transaction helper
  const createMockTransaction = () => {
    const txMock = {
      quotation: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      quotationItem: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    return txMock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      quotation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      quotationItem: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockInvoicesService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: InvoicesService, useValue: mockInvoicesService },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);
    invoicesService = module.get(InvoicesService);

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

  describe('create', () => {
    const createDto: CreateQuotationDto = {
      customerId: mockCustomer.id,
      items: [
        {
          productId: mockProduct.id,
          quantity: 2,
          unitPrice: 99.99,
          taxRate: 19,
          discount: 0,
        },
      ],
      validUntil: new Date('2024-02-01'),
      notes: 'Test quotation',
    };

    beforeEach(() => {
      // Mock customer validation
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      // Mock product validation (batched query)
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
      ]);

      // Mock transaction
      const txMock = createMockTransaction();
      txMock.quotation.findFirst.mockResolvedValue(null); // no existing quotations
      txMock.quotation.create.mockResolvedValue({
        ...mockQuotation,
        items: undefined,
      });
      txMock.quotationItem.createMany.mockResolvedValue({ count: 1 });
      txMock.quotation.findUnique.mockResolvedValue(mockQuotation);

      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );
    });

    it('should create a quotation with items', async () => {
      const result = await service.create(createDto, mockUserId);

      expect(result.id).toBe('quotation-123');
      expect(result.quotationNumber).toBe('COT-00001');
      expect(result.status).toBe(QuotationStatus.DRAFT);
      expect(result.items).toHaveLength(1);
    });

    it('should validate customer exists', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        'Cliente no encontrado',
      );
    });

    it('should validate all products exist', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        `Producto no encontrado: ${mockProduct.id}`,
      );
    });

    it('should create quotation without customerId', async () => {
      const dtoWithoutCustomer: CreateQuotationDto = {
        items: createDto.items,
        notes: 'No customer',
      };

      const result = await service.create(dtoWithoutCustomer, mockUserId);

      expect(result).toBeDefined();
      // Should not call customer validation when no customerId
      expect(prismaService.customer.findFirst).not.toHaveBeenCalled();
    });

    it('should require tenant context', async () => {
      await service.create(createDto, mockUserId);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should generate quotation number inside transaction', async () => {
      const txMock = createMockTransaction();
      txMock.quotation.findFirst.mockResolvedValue({
        quotationNumber: 'COT-00005',
      });
      txMock.quotation.create.mockResolvedValue({
        ...mockQuotation,
        quotationNumber: 'COT-00006',
        items: undefined,
      });
      txMock.quotationItem.createMany.mockResolvedValue({ count: 1 });
      txMock.quotation.findUnique.mockResolvedValue({
        ...mockQuotation,
        quotationNumber: 'COT-00006',
      });

      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback) => callback(txMock),
      );

      const result = await service.create(createDto, mockUserId);

      expect(result.quotationNumber).toBe('COT-00006');
    });

    it('should throw BadRequestException when transaction returns null', async () => {
      (prismaService.$transaction as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      (prismaService.quotation.findMany as jest.Mock).mockResolvedValue([
        mockQuotation,
        mockQuotation2,
      ]);
      (prismaService.quotation.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated quotations', async () => {
      const result = await service.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.quotation.findMany as jest.Mock).mockResolvedValue([
        mockQuotation,
      ]);
      (prismaService.quotation.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll({});

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no quotations exist', async () => {
      (prismaService.quotation.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.quotation.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.findAll({});

      expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should order quotations by createdAt descending', async () => {
      await service.findAll({});

      expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    describe('filters', () => {
      it('should filter by status', async () => {
        const filters: FilterQuotationsDto = {
          status: QuotationStatus.DRAFT,
        };

        await service.findAll(filters);

        expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              status: QuotationStatus.DRAFT,
            }),
          }),
        );
      });

      it('should filter by customerId', async () => {
        const filters: FilterQuotationsDto = { customerId: mockCustomer.id };

        await service.findAll(filters);

        expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              customerId: mockCustomer.id,
            }),
          }),
        );
      });

      it('should filter by fromDate', async () => {
        const fromDate = new Date('2024-01-01');
        const filters: FilterQuotationsDto = { fromDate };

        await service.findAll(filters);

        expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              issueDate: { gte: fromDate },
            }),
          }),
        );
      });

      it('should filter by toDate', async () => {
        const toDate = new Date('2024-12-31');
        const filters: FilterQuotationsDto = { toDate };

        await service.findAll(filters);

        expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              issueDate: { lte: toDate },
            }),
          }),
        );
      });

      it('should filter by date range (fromDate and toDate)', async () => {
        const fromDate = new Date('2024-01-01');
        const toDate = new Date('2024-12-31');
        const filters: FilterQuotationsDto = { fromDate, toDate };

        await service.findAll(filters);

        expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              issueDate: { gte: fromDate, lte: toDate },
            }),
          }),
        );
      });

      it('should filter by search (quotation number or customer name)', async () => {
        const filters: FilterQuotationsDto = { search: 'COT-00001' };

        await service.findAll(filters);

        expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              OR: [
                {
                  quotationNumber: {
                    contains: 'COT-00001',
                    mode: 'insensitive',
                  },
                },
                {
                  customer: {
                    name: { contains: 'COT-00001', mode: 'insensitive' },
                  },
                },
              ],
            }),
          }),
        );
      });
    });

    it('should scope findAll to tenant', async () => {
      await service.findAll({});

      expect(prismaService.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
      expect(prismaService.quotation.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: mockTenantId }),
      });
    });
  });

  describe('findOne', () => {
    it('should return a quotation with items by id', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );

      const result = await service.findOne('quotation-123');

      expect(result.id).toBe('quotation-123');
      expect(result.quotationNumber).toBe('COT-00001');
      expect(result.items).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(prismaService.quotation.findFirst).toHaveBeenCalledWith({
        where: { id: 'quotation-123', tenantId: mockTenantId },
        include: expect.objectContaining({
          items: { include: { product: true } },
          customer: true,
          user: true,
          convertedToInvoice: true,
        }),
      });
    });

    it('should throw NotFoundException when quotation not found', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct Spanish message', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Cotizacion no encontrada',
      );
    });

    it('should include customer relation in response', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );

      const result = await service.findOne('quotation-123');

      expect(result.customer).toBeDefined();
      expect(result.customer?.name).toBe('Juan Perez');
    });

    it('should include user relation in response', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );

      const result = await service.findOne('quotation-123');

      expect(result.user).toBeDefined();
      expect(result.user?.name).toBe('Admin User');
      expect(result.user?.email).toBe('admin@example.com');
    });

    it('should require tenant context', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );

      await service.findOne('quotation-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateQuotationDto = {
      notes: 'Updated notes',
      validUntil: new Date('2024-03-01'),
    };

    it('should update a DRAFT quotation', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );
      (prismaService.quotation.update as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        notes: 'Updated notes',
        validUntil: new Date('2024-03-01'),
      });

      const result = await service.update('quotation-123', updateDto);

      expect(result.notes).toBe('Updated notes');
      expect(prismaService.quotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quotation-123' },
          data: expect.objectContaining({
            notes: 'Updated notes',
            validUntil: new Date('2024-03-01'),
          }),
        }),
      );
    });

    it('should throw NotFoundException when quotation not found', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quotation is not DRAFT', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        status: QuotationStatus.SENT,
      });

      await expect(
        service.update('quotation-123', updateDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('quotation-123', updateDto),
      ).rejects.toThrow(
        'Solo se pueden editar cotizaciones en estado borrador',
      );
    });

    it('should validate customer exists when customerId is provided', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const dtoWithCustomer: UpdateQuotationDto = {
        customerId: 'nonexistent-customer',
      };

      await expect(
        service.update('quotation-123', dtoWithCustomer),
      ).rejects.toThrow(NotFoundException);
    });

    it('should require tenant context', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );
      (prismaService.quotation.update as jest.Mock).mockResolvedValue(
        mockQuotation,
      );

      await service.update('quotation-123', updateDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a DRAFT quotation', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );
      (prismaService.quotation.delete as jest.Mock).mockResolvedValue(
        mockQuotation,
      );

      await service.remove('quotation-123');

      expect(prismaService.quotation.delete).toHaveBeenCalledWith({
        where: { id: 'quotation-123' },
      });
    });

    it('should throw NotFoundException when quotation not found', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when quotation is not DRAFT', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        status: QuotationStatus.SENT,
      });

      await expect(service.remove('quotation-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('quotation-123')).rejects.toThrow(
        'Solo se pueden eliminar cotizaciones en estado borrador',
      );
    });

    it('should require tenant context', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );
      (prismaService.quotation.delete as jest.Mock).mockResolvedValue(
        mockQuotation,
      );

      await service.remove('quotation-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should transition DRAFT quotation to SENT', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation,
      );
      (prismaService.quotation.update as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        status: QuotationStatus.SENT,
      });

      const result = await service.send('quotation-123');

      expect(result.status).toBe(QuotationStatus.SENT);
      expect(prismaService.quotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quotation-123' },
          data: { status: QuotationStatus.SENT },
        }),
      );
    });

    it('should throw NotFoundException when quotation not found', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.send('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when quotation is not DRAFT', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        status: QuotationStatus.ACCEPTED,
      });

      await expect(service.send('quotation-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.send('quotation-123')).rejects.toThrow(
        'Solo se pueden enviar cotizaciones en estado borrador',
      );
    });
  });

  describe('accept', () => {
    it('should transition SENT quotation to ACCEPTED', async () => {
      const sentQuotation = {
        ...mockQuotation,
        status: QuotationStatus.SENT,
      };
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        sentQuotation,
      );
      (prismaService.quotation.update as jest.Mock).mockResolvedValue({
        ...sentQuotation,
        status: QuotationStatus.ACCEPTED,
      });

      const result = await service.accept('quotation-123');

      expect(result.status).toBe(QuotationStatus.ACCEPTED);
      expect(prismaService.quotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quotation-123' },
          data: { status: QuotationStatus.ACCEPTED },
        }),
      );
    });

    it('should throw NotFoundException when quotation not found', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.accept('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when quotation is not SENT', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation, // DRAFT status
      );

      await expect(service.accept('quotation-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.accept('quotation-123')).rejects.toThrow(
        'Solo se pueden aceptar cotizaciones en estado enviada',
      );
    });
  });

  describe('reject', () => {
    it('should transition SENT quotation to REJECTED', async () => {
      const sentQuotation = {
        ...mockQuotation,
        status: QuotationStatus.SENT,
      };
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        sentQuotation,
      );
      (prismaService.quotation.update as jest.Mock).mockResolvedValue({
        ...sentQuotation,
        status: QuotationStatus.REJECTED,
      });

      const result = await service.reject('quotation-123');

      expect(result.status).toBe(QuotationStatus.REJECTED);
      expect(prismaService.quotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quotation-123' },
          data: { status: QuotationStatus.REJECTED },
        }),
      );
    });

    it('should throw NotFoundException when quotation not found', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.reject('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when quotation is not SENT', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation, // DRAFT status
      );

      await expect(service.reject('quotation-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject('quotation-123')).rejects.toThrow(
        'Solo se pueden rechazar cotizaciones en estado enviada',
      );
    });
  });

  describe('convert', () => {
    const acceptedQuotation = {
      ...mockQuotation,
      status: QuotationStatus.ACCEPTED,
    };

    const mockInvoiceResponse = {
      id: 'invoice-123',
      invoiceNumber: 'INV-00001',
      status: 'DRAFT',
    };

    it('should convert ACCEPTED quotation to invoice', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        acceptedQuotation,
      );
      (invoicesService.create as jest.Mock).mockResolvedValue(
        mockInvoiceResponse,
      );
      (prismaService.quotation.update as jest.Mock).mockResolvedValue({
        ...acceptedQuotation,
        status: QuotationStatus.CONVERTED,
        convertedToInvoiceId: 'invoice-123',
        convertedAt: new Date(),
        convertedToInvoice: mockInvoiceResponse,
      });

      const result = await service.convert('quotation-123', mockUserId);

      expect(result.status).toBe(QuotationStatus.CONVERTED);
      expect(result.convertedToInvoiceId).toBe('invoice-123');
      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: mockCustomer.id,
          items: expect.arrayContaining([
            expect.objectContaining({
              productId: mockProduct.id,
              quantity: 2,
            }),
          ]),
        }),
        mockUserId,
      );
    });

    it('should throw NotFoundException when quotation not found', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.convert('nonexistent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quotation is not ACCEPTED', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        mockQuotation, // DRAFT status
      );

      await expect(
        service.convert('quotation-123', mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.convert('quotation-123', mockUserId),
      ).rejects.toThrow(
        'Solo se pueden convertir cotizaciones en estado aceptada',
      );
    });

    it('should set dueDate 30 days in the future on the created invoice', async () => {
      (prismaService.quotation.findFirst as jest.Mock).mockResolvedValue(
        acceptedQuotation,
      );
      (invoicesService.create as jest.Mock).mockResolvedValue(
        mockInvoiceResponse,
      );
      (prismaService.quotation.update as jest.Mock).mockResolvedValue({
        ...acceptedQuotation,
        status: QuotationStatus.CONVERTED,
        convertedToInvoiceId: 'invoice-123',
        convertedAt: new Date(),
      });

      await service.convert('quotation-123', mockUserId);

      const createCall = (invoicesService.create as jest.Mock).mock.calls[0];
      const invoiceDto = createCall[0];
      const now = new Date();
      const expectedDueDate = new Date();
      expectedDueDate.setDate(expectedDueDate.getDate() + 30);

      // dueDate should be approximately 30 days from now (allow 1 second tolerance)
      expect(invoiceDto.dueDate.getTime()).toBeGreaterThanOrEqual(
        expectedDueDate.getTime() - 1000,
      );
      expect(invoiceDto.dueDate.getTime()).toBeLessThanOrEqual(
        expectedDueDate.getTime() + 1000,
      );
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      (prismaService.quotation.findMany as jest.Mock).mockResolvedValue([
        { status: QuotationStatus.DRAFT, total: 100 },
        { status: QuotationStatus.DRAFT, total: 200 },
        { status: QuotationStatus.SENT, total: 300 },
        { status: QuotationStatus.ACCEPTED, total: 400 },
        { status: QuotationStatus.REJECTED, total: 150 },
      ]);

      const result = await service.getStats();

      expect(result.totalQuotations).toBe(5);
      expect(result.totalValue).toBe(1150);
      expect(result.quotationsByStatus).toEqual({
        [QuotationStatus.DRAFT]: 2,
        [QuotationStatus.SENT]: 1,
        [QuotationStatus.ACCEPTED]: 1,
        [QuotationStatus.REJECTED]: 1,
        [QuotationStatus.EXPIRED]: 0,
        [QuotationStatus.CONVERTED]: 0,
      });
    });

    it('should return zero values when no quotations exist', async () => {
      (prismaService.quotation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalQuotations).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.quotationsByStatus[QuotationStatus.DRAFT]).toBe(0);
    });

    it('should require tenant context', async () => {
      (prismaService.quotation.findMany as jest.Mock).mockResolvedValue([]);

      await service.getStats();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope stats query to tenant', async () => {
      (prismaService.quotation.findMany as jest.Mock).mockResolvedValue([]);

      await service.getStats();

      expect(prismaService.quotation.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: { status: true, total: true },
      });
    });
  });
});
