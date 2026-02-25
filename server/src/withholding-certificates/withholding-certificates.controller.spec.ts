import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { WithholdingCertificatesController } from './withholding-certificates.controller';
import { WithholdingCertificatesService } from './withholding-certificates.service';
import { JwtAuthGuard, RolesGuard } from '../auth';

const mockCertificate = {
  id: 'cert-123',
  tenantId: 'tenant-123',
  supplierId: 'supplier-123',
  year: 2025,
  certificateNumber: 'CRT-2025-00001',
  totalBase: 10000,
  totalWithheld: 250,
  withholdingType: 'RENTA',
  generatedAt: new Date('2026-01-15'),
  pdfUrl: null,
  createdAt: new Date('2026-01-15'),
  supplier: {
    id: 'supplier-123',
    name: 'Proveedor Test',
    documentNumber: '900123456-1',
  },
};

const mockPaginatedResponse = {
  data: [mockCertificate],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
};

const mockStatsResponse = {
  year: 2025,
  totalCertificates: 3,
  totalBase: 25000,
  totalWithheld: 625,
  byType: {
    RENTA: { count: 2, base: 20000, withheld: 500 },
    IVA: { count: 1, base: 5000, withheld: 125 },
  },
};

const mockGenerateAllResult = {
  generated: 2,
  certificates: [mockCertificate, { ...mockCertificate, id: 'cert-456' }],
};

describe('WithholdingCertificatesController', () => {
  let controller: WithholdingCertificatesController;
  let service: jest.Mocked<WithholdingCertificatesService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
      findOne: jest.fn().mockResolvedValue(mockCertificate),
      generate: jest.fn().mockResolvedValue(mockCertificate),
      generateAll: jest.fn().mockResolvedValue(mockGenerateAllResult),
      remove: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockResolvedValue(mockStatsResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithholdingCertificatesController],
      providers: [
        { provide: WithholdingCertificatesService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WithholdingCertificatesController>(
      WithholdingCertificatesController,
    );
    service = module.get(WithholdingCertificatesService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
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

  // ─── FINDALL ────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated certificates', async () => {
      const result = await controller.findAll({});

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filter parameters to service', async () => {
      const filters = { year: 2025, withholdingType: 'RENTA', page: 1, limit: 20 };

      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass supplierId filter to service', async () => {
      const filters = { supplierId: 'supplier-123' };

      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });
  });

  // ─── GETSTATS ───────────────────────────────────────────────────
  describe('getStats', () => {
    it('should return statistics for the given year', async () => {
      const result = await controller.getStats(2025);

      expect(result).toEqual(mockStatsResponse);
      expect(service.getStats).toHaveBeenCalledWith(2025);
    });

    it('should convert string year to number', async () => {
      await controller.getStats('2025' as unknown as number);

      expect(service.getStats).toHaveBeenCalledWith(2025);
    });
  });

  // ─── FINDONE ────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return a certificate by ID', async () => {
      const result = await controller.findOne('cert-123');

      expect(result).toEqual(mockCertificate);
      expect(service.findOne).toHaveBeenCalledWith('cert-123');
    });

    it('should propagate NotFoundException from service', async () => {
      (service.findOne as jest.Mock).mockRejectedValue(
        new NotFoundException('Certificado de retencion no encontrado'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── GENERATE ───────────────────────────────────────────────────
  describe('generate', () => {
    it('should generate a certificate', async () => {
      const dto = {
        supplierId: 'supplier-123',
        year: 2025,
        withholdingType: 'RENTA',
      };

      const result = await controller.generate(dto);

      expect(result).toEqual(mockCertificate);
      expect(service.generate).toHaveBeenCalledWith(dto);
    });

    it('should propagate NotFoundException for invalid supplier', async () => {
      (service.generate as jest.Mock).mockRejectedValue(
        new NotFoundException('Proveedor no encontrado'),
      );

      await expect(
        controller.generate({
          supplierId: 'invalid',
          year: 2025,
          withholdingType: 'RENTA',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException when no POs found', async () => {
      (service.generate as jest.Mock).mockRejectedValue(
        new BadRequestException('No se encontraron ordenes de compra'),
      );

      await expect(
        controller.generate({
          supplierId: 'supplier-123',
          year: 2020,
          withholdingType: 'RENTA',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── GENERATEALL ────────────────────────────────────────────────
  describe('generateAll', () => {
    it('should generate certificates for all suppliers', async () => {
      const dto = { year: 2025, withholdingType: 'RENTA' };

      const result = await controller.generateAll(dto);

      expect(result).toEqual(mockGenerateAllResult);
      expect(service.generateAll).toHaveBeenCalledWith(dto);
    });

    it('should accept dto without explicit withholdingType', async () => {
      const dto = { year: 2025 };

      await controller.generateAll(dto);

      expect(service.generateAll).toHaveBeenCalledWith(dto);
    });
  });

  // ─── REMOVE ─────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delete a certificate', async () => {
      await controller.remove('cert-123');

      expect(service.remove).toHaveBeenCalledWith('cert-123');
    });

    it('should propagate NotFoundException from service', async () => {
      (service.remove as jest.Mock).mockRejectedValue(
        new NotFoundException('Certificado de retencion no encontrado'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
