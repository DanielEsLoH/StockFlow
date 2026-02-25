import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PurchaseOrderStatus } from '@prisma/client';
import { WithholdingCertificatesService } from './withholding-certificates.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';

const mockTenantId = 'tenant-123';

const mockSupplier = {
  id: 'supplier-123',
  tenantId: mockTenantId,
  name: 'Proveedor Test',
  documentType: 'NIT',
  documentNumber: '900123456-1',
  status: 'ACTIVE',
};

const mockSupplier2 = {
  id: 'supplier-456',
  tenantId: mockTenantId,
  name: 'Proveedor Dos',
  documentType: 'NIT',
  documentNumber: '900654321-2',
  status: 'ACTIVE',
};

const mockCertificate = {
  id: 'cert-123',
  tenantId: mockTenantId,
  supplierId: 'supplier-123',
  year: 2025,
  certificateNumber: 'CRT-2025-00001',
  totalBase: { toNumber: () => 10000 },
  totalWithheld: { toNumber: () => 250 },
  withholdingType: 'RENTA',
  generatedAt: new Date('2026-01-15'),
  pdfUrl: null,
  createdAt: new Date('2026-01-15'),
  supplier: mockSupplier,
};

const mockCertificateIVA = {
  ...mockCertificate,
  id: 'cert-456',
  certificateNumber: 'CRT-2025-00002',
  withholdingType: 'IVA',
  totalBase: { toNumber: () => 8000 },
  totalWithheld: { toNumber: () => 228 },
};

const mockPurchaseOrders = [
  {
    subtotal: 5000,
    tax: 950,
  },
  {
    subtotal: 5000,
    tax: 570,
  },
];

describe('WithholdingCertificatesService', () => {
  let service: WithholdingCertificatesService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let mockTx: Record<string, Record<string, jest.Mock>>;

  const createMockTx = () => ({
    withholdingCertificate: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx = createMockTx();

    const mockPrismaService = {
      withholdingCertificate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      purchaseOrder: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      }),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithholdingCertificatesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<WithholdingCertificatesService>(WithholdingCertificatesService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

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

  // ─── FINDALL ────────────────────────────────────────────────────
  describe('findAll', () => {
    beforeEach(() => {
      (prismaService.withholdingCertificate.findMany as jest.Mock).mockResolvedValue([
        mockCertificate,
      ]);
      (prismaService.withholdingCertificate.count as jest.Mock).mockResolvedValue(1);
    });

    it('should return paginated certificates with default params', async () => {
      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate correct skip for page 2', async () => {
      await service.findAll({ page: 2, limit: 10 });

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should return empty data when no certificates exist', async () => {
      (prismaService.withholdingCertificate.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.withholdingCertificate.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should filter by year when provided', async () => {
      await service.findAll({ year: 2025 });

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            year: 2025,
          }),
        }),
      );
    });

    it('should filter by supplierId when provided', async () => {
      await service.findAll({ supplierId: 'supplier-123' });

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supplierId: 'supplier-123',
          }),
        }),
      );
    });

    it('should filter by withholdingType when provided', async () => {
      await service.findAll({ withholdingType: 'IVA' });

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            withholdingType: 'IVA',
          }),
        }),
      );
    });

    it('should order by generatedAt descending', async () => {
      await service.findAll();

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { generatedAt: 'desc' },
        }),
      );
    });

    it('should scope queries to tenant', async () => {
      await service.findAll();

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should include supplier relation', async () => {
      await service.findAll();

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            supplier: expect.any(Object),
          }),
        }),
      );
    });
  });

  // ─── FINDONE ────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return a certificate with supplier info', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(
        mockCertificate,
      );

      const result = await service.findOne('cert-123');

      expect(result.id).toBe('cert-123');
      expect(result.supplier).toBeDefined();
      expect(result.supplier!.name).toBe('Proveedor Test');
    });

    it('should throw NotFoundException when certificate not found', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Certificado de retencion no encontrado',
      );
    });

    it('should scope query to tenant', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(
        mockCertificate,
      );

      await service.findOne('cert-123');

      expect(prismaService.withholdingCertificate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cert-123', tenantId: mockTenantId },
        }),
      );
    });

    it('should map Decimal fields to numbers in response', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(
        mockCertificate,
      );

      const result = await service.findOne('cert-123');

      expect(typeof result.totalBase).toBe('number');
      expect(typeof result.totalWithheld).toBe('number');
    });
  });

  // ─── GENERATE ───────────────────────────────────────────────────
  describe('generate', () => {
    beforeEach(() => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue(mockPurchaseOrders);
      mockTx.withholdingCertificate.findFirst.mockResolvedValue(null); // no existing certificates
      mockTx.withholdingCertificate.upsert.mockResolvedValue(mockCertificate);
    });

    it('should generate a certificate for a supplier', async () => {
      const result = await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      expect(result.id).toBe('cert-123');
      expect(result.certificateNumber).toBe('CRT-2025-00001');
    });

    it('should throw NotFoundException when supplier not found', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.generate({
          supplierId: 'invalid-supplier',
          year: 2025,
          withholdingType: 'RENTA',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generate({
          supplierId: 'invalid-supplier',
          year: 2025,
          withholdingType: 'RENTA',
        }),
      ).rejects.toThrow('Proveedor no encontrado');
    });

    it('should throw BadRequestException when no purchase orders found', async () => {
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.generate({
          supplierId: 'supplier-123',
          year: 2025,
          withholdingType: 'RENTA',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generate({
          supplierId: 'supplier-123',
          year: 2025,
          withholdingType: 'RENTA',
        }),
      ).rejects.toThrow('No se encontraron ordenes de compra recibidas');
    });

    it('should query only RECEIVED purchase orders for the given year', async () => {
      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          supplierId: 'supplier-123',
          status: PurchaseOrderStatus.RECEIVED,
          receivedDate: {
            gte: new Date(2025, 0, 1),
            lt: new Date(2026, 0, 1),
          },
        },
        select: {
          subtotal: true,
          tax: true,
        },
      });
    });

    it('should calculate RENTA withholding at 2.5% of base', async () => {
      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      const upsertCall = mockTx.withholdingCertificate.upsert.mock.calls[0][0];
      // totalBase: 5000 + 5000 = 10000
      // totalWithheld: 10000 * 0.025 = 250
      expect(upsertCall.create.totalBase).toBe(10000);
      expect(upsertCall.create.totalWithheld).toBe(250);
    });

    it('should calculate IVA withholding at 15% of tax amount', async () => {
      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'IVA',
      });

      const upsertCall = mockTx.withholdingCertificate.upsert.mock.calls[0][0];
      // totalTax: 950 + 570 = 1520
      // totalWithheld: 1520 * 0.15 = 228
      expect(upsertCall.create.totalWithheld).toBe(228);
    });

    it('should calculate ICA withholding at 0.966% of base', async () => {
      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'ICA',
      });

      const upsertCall = mockTx.withholdingCertificate.upsert.mock.calls[0][0];
      // totalBase: 10000
      // totalWithheld: 10000 * 0.00966 = 96.6
      expect(upsertCall.create.totalWithheld).toBe(96.6);
    });

    it('should generate CRT-{year}-00001 when no previous certificates exist', async () => {
      mockTx.withholdingCertificate.findFirst.mockResolvedValue(null);

      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      const upsertCall = mockTx.withholdingCertificate.upsert.mock.calls[0][0];
      expect(upsertCall.create.certificateNumber).toBe('CRT-2025-00001');
    });

    it('should increment certificate number based on last existing', async () => {
      mockTx.withholdingCertificate.findFirst.mockResolvedValue({
        certificateNumber: 'CRT-2025-00042',
      });

      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      const upsertCall = mockTx.withholdingCertificate.upsert.mock.calls[0][0];
      expect(upsertCall.create.certificateNumber).toBe('CRT-2025-00043');
    });

    it('should upsert on unique constraint (tenantId + supplierId + year + withholdingType)', async () => {
      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      const upsertCall = mockTx.withholdingCertificate.upsert.mock.calls[0][0];
      expect(upsertCall.where).toEqual({
        tenantId_supplierId_year_withholdingType: {
          tenantId: mockTenantId,
          supplierId: 'supplier-123',
          year: 2025,
          withholdingType: 'RENTA',
        },
      });
    });

    it('should update totalBase and totalWithheld on upsert', async () => {
      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      const upsertCall = mockTx.withholdingCertificate.upsert.mock.calls[0][0];
      expect(upsertCall.update.totalBase).toBe(10000);
      expect(upsertCall.update.totalWithheld).toBe(250);
      expect(upsertCall.update.generatedAt).toBeInstanceOf(Date);
    });

    it('should use transaction for atomicity', async () => {
      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should validate supplier belongs to tenant', async () => {
      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      expect(prismaService.supplier.findFirst).toHaveBeenCalledWith({
        where: { id: 'supplier-123', tenantId: mockTenantId },
      });
    });

    it('should require tenant context', async () => {
      (tenantContextService.requireTenantId as jest.Mock).mockImplementation(() => {
        throw new Error('Tenant not found');
      });

      await expect(
        service.generate({
          supplierId: 'supplier-123',
          year: 2025,
          withholdingType: 'RENTA',
        }),
      ).rejects.toThrow('Tenant not found');
    });
  });

  // ─── GENERATEALL ────────────────────────────────────────────────
  describe('generateAll', () => {
    beforeEach(() => {
      (prismaService.purchaseOrder.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { supplierId: 'supplier-123' },
          { supplierId: 'supplier-456' },
        ])
        .mockResolvedValue(mockPurchaseOrders);
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      mockTx.withholdingCertificate.findFirst.mockResolvedValue(null);
      mockTx.withholdingCertificate.upsert.mockResolvedValue(mockCertificate);
    });

    it('should generate certificates for all suppliers with purchases', async () => {
      const result = await service.generateAll({ year: 2025 });

      expect(result.generated).toBe(2);
      expect(result.certificates).toHaveLength(2);
    });

    it('should return empty when no suppliers have purchases', async () => {
      // Reset mock and set empty result for distinct suppliers query
      (prismaService.purchaseOrder.findMany as jest.Mock).mockReset();
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateAll({ year: 2025 });

      expect(result.generated).toBe(0);
      expect(result.certificates).toEqual([]);
    });

    it('should query distinct suppliers with RECEIVED POs in the year', async () => {
      await service.generateAll({ year: 2025 });

      expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: PurchaseOrderStatus.RECEIVED,
          receivedDate: {
            gte: new Date(2025, 0, 1),
            lt: new Date(2026, 0, 1),
          },
        },
        select: { supplierId: true },
        distinct: ['supplierId'],
      });
    });

    it('should default withholdingType to RENTA', async () => {
      const result = await service.generateAll({ year: 2025 });

      expect(result.generated).toBeGreaterThan(0);
    });

    it('should continue if a single supplier generation fails', async () => {
      // First supplier succeeds, second fails
      (prismaService.supplier.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockSupplier)
        .mockResolvedValueOnce(null); // supplier not found for second

      const result = await service.generateAll({ year: 2025, withholdingType: 'RENTA' });

      // Only 1 should succeed
      expect(result.generated).toBe(1);
    });
  });

  // ─── REMOVE ─────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delete a certificate', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(
        mockCertificate,
      );

      await service.remove('cert-123');

      expect(prismaService.withholdingCertificate.delete).toHaveBeenCalledWith({
        where: { id: 'cert-123' },
      });
    });

    it('should throw NotFoundException when certificate not found', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        'Certificado de retencion no encontrado',
      );
    });

    it('should scope query to tenant', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(
        mockCertificate,
      );

      await service.remove('cert-123');

      expect(prismaService.withholdingCertificate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cert-123', tenantId: mockTenantId },
        }),
      );
    });
  });

  // ─── GETSTATS ───────────────────────────────────────────────────
  describe('getStats', () => {
    it('should return correct statistics by type', async () => {
      (prismaService.withholdingCertificate.findMany as jest.Mock).mockResolvedValue([
        { withholdingType: 'RENTA', totalBase: 10000, totalWithheld: 250 },
        { withholdingType: 'RENTA', totalBase: 8000, totalWithheld: 200 },
        { withholdingType: 'IVA', totalBase: 5000, totalWithheld: 142.5 },
      ]);

      const result = await service.getStats(2025);

      expect(result.year).toBe(2025);
      expect(result.totalCertificates).toBe(3);
      expect(result.totalBase).toBe(23000);
      expect(result.totalWithheld).toBe(592.5);
      expect(result.byType.RENTA).toEqual({ count: 2, base: 18000, withheld: 450 });
      expect(result.byType.IVA).toEqual({ count: 1, base: 5000, withheld: 142.5 });
    });

    it('should return zeros when no certificates exist', async () => {
      (prismaService.withholdingCertificate.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats(2025);

      expect(result.totalCertificates).toBe(0);
      expect(result.totalBase).toBe(0);
      expect(result.totalWithheld).toBe(0);
      expect(result.byType).toEqual({});
    });

    it('should scope to tenant and year', async () => {
      (prismaService.withholdingCertificate.findMany as jest.Mock).mockResolvedValue([]);

      await service.getStats(2025);

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, year: 2025 },
        select: {
          withholdingType: true,
          totalBase: true,
          totalWithheld: true,
        },
      });
    });
  });

  // ─── CALCULATEWITHHOLDING ───────────────────────────────────────
  describe('calculateWithholding', () => {
    it('should calculate RENTA at 2.5%', () => {
      const result = service.calculateWithholding(10000, 'RENTA', 0);
      expect(result).toBe(250);
    });

    it('should calculate ICA at 0.966%', () => {
      const result = service.calculateWithholding(10000, 'ICA', 0);
      expect(result).toBe(96.6);
    });

    it('should calculate IVA at 15% of tax amount', () => {
      const result = service.calculateWithholding(10000, 'IVA', 1520);
      expect(result).toBe(228);
    });

    it('should round to 2 decimal places', () => {
      const result = service.calculateWithholding(3333, 'RENTA', 0);
      // 3333 * 0.025 = 83.325 → rounded to 83.33
      expect(result).toBe(83.33);
    });

    it('should default to RENTA rate for unknown types', () => {
      const result = service.calculateWithholding(10000, 'UNKNOWN', 0);
      expect(result).toBe(250);
    });

    it('should return 0 for zero base with RENTA', () => {
      const result = service.calculateWithholding(0, 'RENTA', 0);
      expect(result).toBe(0);
    });

    it('should return 0 for zero tax with IVA', () => {
      const result = service.calculateWithholding(10000, 'IVA', 0);
      expect(result).toBe(0);
    });
  });

  // ─── TENANT ISOLATION ──────────────────────────────────────────
  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.withholdingCertificate.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.withholdingCertificate.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.withholdingCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(
        mockCertificate,
      );

      await service.findOne('cert-123');

      expect(prismaService.withholdingCertificate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cert-123', tenantId: mockTenantId },
        }),
      );
    });

    it('should scope remove to tenant', async () => {
      (prismaService.withholdingCertificate.findFirst as jest.Mock).mockResolvedValue(
        mockCertificate,
      );

      await service.remove('cert-123');

      expect(prismaService.withholdingCertificate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cert-123', tenantId: mockTenantId },
        }),
      );
    });

    it('should scope supplier validation to tenant in generate', async () => {
      (prismaService.supplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);
      (prismaService.purchaseOrder.findMany as jest.Mock).mockResolvedValue(mockPurchaseOrders);
      mockTx.withholdingCertificate.findFirst.mockResolvedValue(null);
      mockTx.withholdingCertificate.upsert.mockResolvedValue(mockCertificate);

      await service.generate({
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      });

      expect(prismaService.supplier.findFirst).toHaveBeenCalledWith({
        where: { id: 'supplier-123', tenantId: mockTenantId },
      });
    });
  });
});
