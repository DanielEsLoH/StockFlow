import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { ImportsService } from './imports.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CacheService } from '../cache';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FileParserService } from './file-parser.service';
import { ProductImportValidator } from './validators/product-import.validator';
import { CustomerImportValidator } from './validators/customer-import.validator';
import { SupplierImportValidator } from './validators/supplier-import.validator';
import {
  ImportModule,
  DuplicateStrategy,
} from './dto/import-file.dto';

describe('ImportsService', () => {
  let service: ImportsService;
  let prismaService: any;
  let tenantContextService: any;
  let cacheService: any;
  let auditLogsService: any;
  let fileParserService: any;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024,
    buffer: Buffer.from('fake'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaService = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      customer: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      supplier: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: any) => any) => fn(prismaService)),
    };

    tenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    cacheService = {
      invalidateMultiple: jest.fn().mockResolvedValue(undefined),
    };

    auditLogsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    fileParserService = {
      parseFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: TenantContextService, useValue: tenantContextService },
        { provide: CacheService, useValue: cacheService },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: FileParserService, useValue: fileParserService },
        ProductImportValidator,
        CustomerImportValidator,
        SupplierImportValidator,
      ],
    }).compile();

    service = module.get<ImportsService>(ImportsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // validateImport
  // ---------------------------------------------------------------------------
  describe('validateImport', () => {
    it('should validate a products file with valid rows', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
        { nombre: 'Producto B', precio_costo: '150', precio_venta: '300' },
      ]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.PRODUCTS,
      );

      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(0);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].errors).toHaveLength(0);
    });

    it('should detect invalid rows', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: '', precio_costo: 'abc', precio_venta: '200' },
      ]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.PRODUCTS,
      );

      expect(result.invalidRows).toBe(1);
      expect(result.rows[0].errors.length).toBeGreaterThan(0);
    });

    it('should mark product duplicates by SKU', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Producto A',
          precio_costo: '100',
          precio_venta: '200',
          sku: 'SKU-001',
        },
        {
          nombre: 'Producto B',
          precio_costo: '150',
          precio_venta: '300',
          sku: 'SKU-002',
        },
      ]);

      prismaService.product.findMany.mockResolvedValue([{ sku: 'SKU-001' }]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.PRODUCTS,
      );

      expect(result.duplicateRows).toBe(1);
      expect(result.rows[0].isDuplicate).toBe(true);
      expect(result.rows[1].isDuplicate).toBe(false);
    });

    it('should mark customer duplicates by documentNumber', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Cliente A',
          tipo_documento: 'CC',
          numero_documento: '1234567890',
        },
      ]);

      prismaService.customer.findMany.mockResolvedValue([
        { documentNumber: '1234567890' },
      ]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.CUSTOMERS,
      );

      expect(result.duplicateRows).toBe(1);
      expect(result.rows[0].isDuplicate).toBe(true);
    });

    it('should mark supplier duplicates by documentNumber', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Proveedor A',
          tipo_documento: 'NIT',
          numero_documento: '900456789-3',
        },
      ]);

      prismaService.supplier.findMany.mockResolvedValue([
        { documentNumber: '900456789-3' },
      ]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.SUPPLIERS,
      );

      expect(result.duplicateRows).toBe(1);
    });

    it('should throw BadRequestException when required columns are missing', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A' }, // missing precio_costo, precio_venta
      ]);

      await expect(
        service.validateImport(mockFile, ImportModule.PRODUCTS),
      ).rejects.toThrow(BadRequestException);
    });

    it('should resolve header aliases before validation', async () => {
      // Use English aliases that should be resolved to Spanish canonical names
      fileParserService.parseFile.mockReturnValue([
        { name: 'Producto A', cost_price: '100', sale_price: '200' },
      ]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.PRODUCTS,
      );

      expect(result.validRows).toBe(1);
      expect(result.rows[0].data).toHaveProperty('name', 'Producto A');
    });

    it('should not mark duplicates when no SKUs match', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Producto A',
          precio_costo: '100',
          precio_venta: '200',
          sku: 'NEW-001',
        },
      ]);

      prismaService.product.findMany.mockResolvedValue([]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.PRODUCTS,
      );

      expect(result.duplicateRows).toBe(0);
    });

    it('should skip duplicate check when no SKUs are present', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
      ]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.PRODUCTS,
      );

      expect(prismaService.product.findMany).not.toHaveBeenCalled();
      expect(result.duplicateRows).toBe(0);
    });

    it('should use row index starting from 2 (skip header)', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: '', precio_costo: 'bad', precio_venta: '200' },
      ]);

      const result = await service.validateImport(
        mockFile,
        ImportModule.PRODUCTS,
      );

      // Errors should reference row 2 (first data row after header)
      expect(result.rows[0].row).toBe(2);
      expect(result.rows[0].errors[0]).toContain('Fila 2');
    });
  });

  // ---------------------------------------------------------------------------
  // executeImport
  // ---------------------------------------------------------------------------
  describe('executeImport', () => {
    it('should create new product records', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
      ]);

      prismaService.product.findFirst.mockResolvedValue(null);
      prismaService.product.findUnique.mockResolvedValue(null);

      const result = await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(1);
      expect(prismaService.product.create).toHaveBeenCalled();
    });

    it('should skip duplicate products with SKIP strategy', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Producto A',
          precio_costo: '100',
          precio_venta: '200',
          sku: 'SKU-001',
        },
      ]);

      prismaService.product.findMany.mockResolvedValue([{ sku: 'SKU-001' }]);

      const result = await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('should update duplicate products with UPDATE strategy', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Producto A Updated',
          precio_costo: '100',
          precio_venta: '200',
          sku: 'SKU-001',
        },
      ]);

      prismaService.product.findMany.mockResolvedValue([{ sku: 'SKU-001' }]);

      const result = await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.UPDATE,
        mockUserId,
      );

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(prismaService.product.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rows have validation errors', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: '', precio_costo: 'abc', precio_venta: '200' },
      ]);

      await expect(
        service.executeImport(
          mockFile,
          ImportModule.PRODUCTS,
          DuplicateStrategy.SKIP,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit log after successful import', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
      ]);

      prismaService.product.findFirst.mockResolvedValue(null);
      prismaService.product.findUnique.mockResolvedValue(null);

      await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(auditLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
          action: AuditAction.IMPORT,
          entityType: 'Product',
          metadata: expect.objectContaining({
            module: ImportModule.PRODUCTS,
            strategy: DuplicateStrategy.SKIP,
            fileName: mockFile.originalname,
          }),
        }),
      );
    });

    it('should invalidate product caches after import', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
      ]);

      prismaService.product.findFirst.mockResolvedValue(null);
      prismaService.product.findUnique.mockResolvedValue(null);

      await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(cacheService.invalidateMultiple).toHaveBeenCalledWith(
        expect.arrayContaining(['products', 'product', 'dashboard']),
        mockTenantId,
      );
    });

    it('should invalidate customer caches after customer import', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Cliente A',
          tipo_documento: 'CC',
          numero_documento: '1234567890',
        },
      ]);

      await service.executeImport(
        mockFile,
        ImportModule.CUSTOMERS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(cacheService.invalidateMultiple).toHaveBeenCalledWith(
        expect.arrayContaining(['customers', 'customer', 'dashboard']),
        mockTenantId,
      );
    });

    it('should invalidate supplier caches after supplier import', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Proveedor A',
          tipo_documento: 'NIT',
          numero_documento: '900456789-3',
        },
      ]);

      await service.executeImport(
        mockFile,
        ImportModule.SUPPLIERS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(cacheService.invalidateMultiple).toHaveBeenCalledWith(
        expect.arrayContaining(['suppliers', 'supplier']),
        mockTenantId,
      );
    });

    it('should create customer records', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Cliente A',
          tipo_documento: 'CC',
          numero_documento: '1234567890',
          correo: 'test@example.com',
        },
      ]);

      const result = await service.executeImport(
        mockFile,
        ImportModule.CUSTOMERS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(result.created).toBe(1);
      expect(prismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            name: 'Cliente A',
            documentType: 'CC',
            documentNumber: '1234567890',
            email: 'test@example.com',
          }),
        }),
      );
    });

    it('should create supplier records', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Proveedor A',
          tipo_documento: 'NIT',
          numero_documento: '900456789-3',
        },
      ]);

      const result = await service.executeImport(
        mockFile,
        ImportModule.SUPPLIERS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(result.created).toBe(1);
      expect(prismaService.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            name: 'Proveedor A',
            documentType: 'NIT',
            documentNumber: '900456789-3',
          }),
        }),
      );
    });

    it('should update existing customer with UPDATE strategy', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Cliente Updated',
          tipo_documento: 'CC',
          numero_documento: '1234567890',
        },
      ]);

      prismaService.customer.findMany.mockResolvedValue([
        { documentNumber: '1234567890' },
      ]);

      const result = await service.executeImport(
        mockFile,
        ImportModule.CUSTOMERS,
        DuplicateStrategy.UPDATE,
        mockUserId,
      );

      expect(result.updated).toBe(1);
      expect(prismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_documentNumber: {
              tenantId: mockTenantId,
              documentNumber: '1234567890',
            },
          },
        }),
      );
    });

    it('should update existing supplier with UPDATE strategy', async () => {
      fileParserService.parseFile.mockReturnValue([
        {
          nombre: 'Proveedor Updated',
          tipo_documento: 'NIT',
          numero_documento: '900456789-3',
        },
      ]);

      prismaService.supplier.findMany.mockResolvedValue([
        { documentNumber: '900456789-3' },
      ]);

      const result = await service.executeImport(
        mockFile,
        ImportModule.SUPPLIERS,
        DuplicateStrategy.UPDATE,
        mockUserId,
      );

      expect(result.updated).toBe(1);
      expect(prismaService.supplier.update).toHaveBeenCalled();
    });

    it('should generate SKU when not provided for products', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
      ]);

      prismaService.product.findFirst.mockResolvedValue(null);
      prismaService.product.findUnique.mockResolvedValue(null);

      await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(prismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sku: 'PROD-00001',
          }),
        }),
      );
    });

    it('should generate sequential SKU based on last product', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
      ]);

      prismaService.product.findFirst.mockResolvedValue({ sku: 'PROD-00042' });
      prismaService.product.findUnique.mockResolvedValue(null);

      await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(prismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sku: 'PROD-00043',
          }),
        }),
      );
    });

    it('should handle errors in individual rows gracefully', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
        { nombre: 'Producto B', precio_costo: '150', precio_venta: '300' },
      ]);

      prismaService.product.findFirst.mockResolvedValue(null);
      prismaService.product.findUnique.mockResolvedValue(null);
      prismaService.product.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB constraint violation'));

      const result = await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('DB constraint violation');
    });

    it('should not fail when cache invalidation fails', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
      ]);

      prismaService.product.findFirst.mockResolvedValue(null);
      prismaService.product.findUnique.mockResolvedValue(null);
      cacheService.invalidateMultiple.mockRejectedValue(
        new Error('Redis down'),
      );

      // Should not throw
      const result = await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(result.created).toBe(1);
    });

    it('should limit error messages to 50 when many rows have errors', async () => {
      // Create 60 invalid rows
      const rows = Array.from({ length: 60 }, () => ({
        nombre: '',
        precio_costo: 'invalid',
        precio_venta: 'invalid',
      }));

      fileParserService.parseFile.mockReturnValue(rows);

      await expect(
        service.executeImport(
          mockFile,
          ImportModule.PRODUCTS,
          DuplicateStrategy.SKIP,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.executeImport(
          mockFile,
          ImportModule.PRODUCTS,
          DuplicateStrategy.SKIP,
          mockUserId,
        );
      } catch (e: any) {
        const response = e.getResponse();
        expect(response.errors.length).toBeLessThanOrEqual(50);
      }
    });

    it('should use Prisma transaction with 60s timeout', async () => {
      fileParserService.parseFile.mockReturnValue([
        { nombre: 'Producto A', precio_costo: '100', precio_venta: '200' },
      ]);

      prismaService.product.findFirst.mockResolvedValue(null);
      prismaService.product.findUnique.mockResolvedValue(null);

      await service.executeImport(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUserId,
      );

      expect(prismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 60000 },
      );
    });
  });
});
