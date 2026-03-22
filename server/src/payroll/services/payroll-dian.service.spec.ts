import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PayrollEntryStatus, PayrollPeriodStatus } from '@prisma/client';
import { PayrollDianService } from './payroll-dian.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/services/tenant-context.service';
import { PayrollConfigService } from '../payroll-config.service';
import { PayrollXmlGeneratorService } from './payroll-xml-generator.service';
import { PayrollCuneGeneratorService } from './payroll-cune-generator.service';
import { XmlSignerService } from '../../dian/services/xml-signer.service';
import { DianClientService } from '../../dian/services/dian-client.service';

describe('PayrollDianService', () => {
  let service: PayrollDianService;
  let prisma: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<PayrollConfigService>;
  let xmlGenerator: jest.Mocked<PayrollXmlGeneratorService>;
  let cuneGenerator: jest.Mocked<PayrollCuneGeneratorService>;
  let xmlSigner: jest.Mocked<XmlSignerService>;
  let dianClient: jest.Mocked<DianClientService>;

  const mockTenantId = 'tenant-123';

  const mockEntry = {
    id: 'entry-1',
    tenantId: mockTenantId,
    entryNumber: 'NOM-001-001',
    status: PayrollEntryStatus.APPROVED,
    periodId: 'period-1',
    employeeId: 'emp-1',
    baseSalary: 2000000,
    daysWorked: 30,
    totalDevengados: 2162000,
    totalDeducciones: 160000,
    totalNeto: 2002000,
    sueldo: 2000000,
    auxilioTransporte: 162000,
    horasExtras: 0,
    bonificaciones: 0,
    comisiones: 0,
    viaticos: 0,
    incapacidad: 0,
    licencia: 0,
    vacaciones: 0,
    otrosDevengados: 0,
    saludEmpleado: 80000,
    pensionEmpleado: 80000,
    fondoSolidaridad: 0,
    retencionFuente: 0,
    sindicato: 0,
    libranzas: 0,
    otrasDeducciones: 0,
    saludEmpleador: 0,
    pensionEmpleador: 240000,
    arlEmpleador: 10440,
    cajaEmpleador: 80000,
    senaEmpleador: 40000,
    icbfEmpleador: 60000,
    cune: null,
    employee: {
      id: 'emp-1',
      documentType: 'CC',
      documentNumber: '1234567890',
      firstName: 'Juan',
      lastName: 'Pérez',
      contractType: 'TERMINO_INDEFINIDO',
      arlRiskLevel: 'LEVEL_I',
      startDate: new Date('2023-01-01'),
      endDate: null,
      departmentCode: '11',
      cityCode: '11001',
      address: 'Calle 123',
    },
    period: {
      name: 'Enero 2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      paymentDate: new Date('2024-01-31'),
    },
  };

  const mockDianConfig = {
    nit: '900123456',
    dv: '7',
    businessName: 'Test Company',
    address: 'Calle 123',
    departmentCode: '11',
    cityCode: '11001',
  };

  const mockConfig = {
    id: 'config-1',
    smmlv: 1300000,
    auxilioTransporteVal: 162000,
    uvtValue: 47065,
    payrollSoftwareId: 'soft-id',
    payrollSoftwarePin: 'soft-pin',
    payrollTestSetId: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      payrollEntry: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      payrollPeriod: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockConfigService = {
      getOrFail: jest.fn().mockResolvedValue(mockConfig),
    };

    const mockXmlGenerator = {
      generateNominaIndividualXml: jest
        .fn()
        .mockReturnValue('<xml>payroll</xml>'),
      generateNominaAjusteXml: jest
        .fn()
        .mockReturnValue('<xml>adjustment</xml>'),
    };

    const mockCuneGenerator = {
      generateTimestamp: jest.fn().mockReturnValue({
        date: '2024-01-31',
        time: '10:00:00',
      }),
      generateCune: jest.fn().mockReturnValue('cune-generated-hash'),
      formatMoney: jest
        .fn()
        .mockImplementation((val: number) => val.toFixed(2)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollDianService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: PayrollConfigService, useValue: mockConfigService },
        {
          provide: PayrollXmlGeneratorService,
          useValue: mockXmlGenerator,
        },
        {
          provide: PayrollCuneGeneratorService,
          useValue: mockCuneGenerator,
        },
        {
          provide: XmlSignerService,
          useValue: {
            signXml: jest.fn().mockResolvedValue('<signed>xml</signed>'),
          },
        },
        {
          provide: DianClientService,
          useValue: {
            sendDocument: jest
              .fn()
              .mockResolvedValue({ statusCode: 200, isValid: true }),
            sendTestSetDocument: jest
              .fn()
              .mockResolvedValue({ statusCode: 200, isValid: true }),
          },
        },
      ],
    }).compile();

    service = module.get<PayrollDianService>(PayrollDianService);
    prisma = module.get(PrismaService);
    configService = module.get(PayrollConfigService);
    xmlGenerator = module.get(PayrollXmlGeneratorService);
    cuneGenerator = module.get(PayrollCuneGeneratorService);
    xmlSigner = module.get(XmlSignerService);
    dianClient = module.get(DianClientService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateEntryXml', () => {
    it('should generate XML and CUNE for approved entry', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: mockDianConfig,
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.generateEntryXml('entry-1');

      expect(result.cune).toBe('cune-generated-hash');
      expect(result.xml).toBe('<xml>payroll</xml>');
      expect(cuneGenerator.generateCune).toHaveBeenCalled();
      expect(xmlGenerator.generateNominaIndividualXml).toHaveBeenCalled();
      expect(prisma.payrollEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cune: 'cune-generated-hash',
            xmlContent: '<xml>payroll</xml>',
          }),
        }),
      );
    });

    it('should throw NotFoundException when entry not found', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.generateEntryXml('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-APPROVED entry', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: PayrollEntryStatus.DRAFT,
      });

      await expect(service.generateEntryXml('entry-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.generateEntryXml('entry-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no DIAN config', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: null,
      });

      await expect(service.generateEntryXml('entry-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generatePeriodXmls', () => {
    it('should generate XMLs for all approved entries in period', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'period-1',
        tenantId: mockTenantId,
        name: 'Enero 2024',
        status: PayrollPeriodStatus.APPROVED,
      });
      (prisma.payrollEntry.findMany as jest.Mock).mockResolvedValue([
        { ...mockEntry, id: 'entry-1', entryNumber: 'NOM-001-001' },
        { ...mockEntry, id: 'entry-2', entryNumber: 'NOM-001-002' },
      ]);
      // For each generateEntryXml call
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: mockDianConfig,
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.generatePeriodXmls('period-1');

      expect(result.generated).toBe(2);
      expect(result.entries).toHaveLength(2);
    });

    it('should throw NotFoundException when period not found', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.generatePeriodXmls('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-APPROVED period', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'period-1',
        tenantId: mockTenantId,
        status: PayrollPeriodStatus.OPEN,
      });

      await expect(service.generatePeriodXmls('period-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return zero when no entries need XML generation', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'period-1',
        tenantId: mockTenantId,
        name: 'Enero 2024',
        status: PayrollPeriodStatus.APPROVED,
      });
      (prisma.payrollEntry.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generatePeriodXmls('period-1');

      expect(result.generated).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });

  describe('generateEntryXml - adjustment entries', () => {
    it('should generate adjustment XML (tipo 103) for NOMINA_AJUSTE', async () => {
      const adjustmentEntry = {
        ...mockEntry,
        dianDocumentType: 'NOMINA_AJUSTE',
        originalEntryId: 'original-entry-1',
        notes: 'REPLACE',
      };
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(
        adjustmentEntry,
      );
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: mockDianConfig,
      });
      (prisma.payrollEntry.findUnique as jest.Mock).mockResolvedValue({
        cune: 'original-cune-123',
        entryNumber: 'NOM-001-000',
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(
        adjustmentEntry,
      );

      const result = await service.generateEntryXml('entry-1');

      expect(result.cune).toBe('cune-generated-hash');
      expect(result.xml).toBe('<xml>adjustment</xml>');
      expect(xmlGenerator.generateNominaAjusteXml).toHaveBeenCalled();
      expect(cuneGenerator.generateCune).toHaveBeenCalledWith(
        expect.objectContaining({ tipoXML: '103' }),
      );
    });

    it('should use test set ID when configured (ambiente = 2)', async () => {
      const configWithTestSet = {
        ...mockConfig,
        payrollTestSetId: 'test-set-abc',
      };
      configService.getOrFail.mockResolvedValue(configWithTestSet as any);
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: mockDianConfig,
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(mockEntry);

      await service.generateEntryXml('entry-1');

      expect(cuneGenerator.generateCune).toHaveBeenCalledWith(
        expect.objectContaining({ tipoAmb: '2' }),
      );
    });
  });

  describe('signAndSubmitEntry', () => {
    const entryWithXml = {
      ...mockEntry,
      cune: 'cune-generated-hash',
      xmlContent: '<xml>payroll</xml>',
      status: PayrollEntryStatus.APPROVED,
    };

    it('should sign and submit entry to DIAN successfully', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(
        entryWithXml,
      );
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: {
          ...mockDianConfig,
          certificateFile: Buffer.from('cert-data'),
          certificatePassword: 'pass123',
        },
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(entryWithXml);
      xmlSigner.loadCertificate = jest.fn().mockReturnValue({
        privateKeyPem: 'pem',
        certDerBase64: 'certDer',
        certDigestBase64: 'digest',
        issuerName: 'issuer',
        serialNumber: '123',
      });
      xmlSigner.signXml = jest.fn().mockReturnValue('<signed>xml</signed>');
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-123',
      });
      configService.getOrFail.mockResolvedValue(mockConfig as any);

      const result = await service.signAndSubmitEntry('entry-1');

      expect(result.success).toBe(true);
      expect(result.status).toBe(PayrollEntryStatus.ACCEPTED);
      expect(result.trackId).toBe('track-123');
      expect(xmlSigner.loadCertificate).toHaveBeenCalled();
      expect(xmlSigner.signXml).toHaveBeenCalled();
    });

    it('should send without signing when no certificate configured', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(
        entryWithXml,
      );
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: {
          ...mockDianConfig,
          certificateFile: null,
          certificatePassword: null,
        },
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(entryWithXml);
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-456',
      });
      configService.getOrFail.mockResolvedValue(mockConfig as any);

      const result = await service.signAndSubmitEntry('entry-1');

      expect(result.success).toBe(true);
      // Should still update with the original xml (unsigned)
      expect(prisma.payrollEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'entry-1' },
          data: { signedXml: '<xml>payroll</xml>' },
        }),
      );
    });

    it('should use sendTestSetDocument when testSetId is configured', async () => {
      const configWithTestSet = {
        ...mockConfig,
        payrollTestSetId: 'test-set-abc',
      };
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(
        entryWithXml,
      );
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: { ...mockDianConfig },
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(entryWithXml);
      (dianClient.sendTestSetDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'test-track',
      });
      configService.getOrFail.mockResolvedValue(configWithTestSet as any);

      const result = await service.signAndSubmitEntry('entry-1');

      expect(dianClient.sendTestSetDocument).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should set REJECTED status when DIAN rejects the entry', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(
        entryWithXml,
      );
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: { ...mockDianConfig },
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(entryWithXml);
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: false,
        trackId: 'track-err',
        statusDescription: 'Documento rechazado',
        errors: ['Error de validacion'],
      });
      configService.getOrFail.mockResolvedValue(mockConfig as any);

      const result = await service.signAndSubmitEntry('entry-1');

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayrollEntryStatus.REJECTED);
      expect(result.message).toBe('Documento rechazado');
    });

    it('should set SENT status when DIAN response is neither success nor invalid', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(
        entryWithXml,
      );
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: { ...mockDianConfig },
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(entryWithXml);
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: undefined,
        trackId: 'track-pending',
      });
      configService.getOrFail.mockResolvedValue(mockConfig as any);

      const result = await service.signAndSubmitEntry('entry-1');

      expect(result.status).toBe(PayrollEntryStatus.SENT);
    });

    it('should throw NotFoundException when entry not found', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.signAndSubmitEntry('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when entry has no XML', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue({
        ...mockEntry,
        cune: null,
        xmlContent: null,
      });

      await expect(service.signAndSubmitEntry('entry-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when entry already sent', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue({
        ...entryWithXml,
        status: PayrollEntryStatus.SENT,
      });

      await expect(service.signAndSubmitEntry('entry-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when entry already accepted', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue({
        ...entryWithXml,
        status: PayrollEntryStatus.ACCEPTED,
      });

      await expect(service.signAndSubmitEntry('entry-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when tenant has no DIAN config', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(
        entryWithXml,
      );
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: null,
      });

      await expect(service.signAndSubmitEntry('entry-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submitPeriod', () => {
    const approvedPeriod = {
      id: 'period-1',
      tenantId: mockTenantId,
      name: 'Enero 2024',
      status: PayrollPeriodStatus.APPROVED,
    };

    it('should throw NotFoundException when period not found', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.submitPeriod('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-APPROVED period', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue({
        ...approvedPeriod,
        status: PayrollPeriodStatus.OPEN,
      });

      await expect(service.submitPeriod('period-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no approved entries exist', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue(
        approvedPeriod,
      );
      (prisma.payrollEntry.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.submitPeriod('period-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate XML for entries without it, then submit all', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue(
        approvedPeriod,
      );
      const entryWithoutXml = {
        ...mockEntry,
        id: 'entry-1',
        cune: null,
        xmlContent: null,
      };
      const entryWithXml2 = {
        ...mockEntry,
        id: 'entry-2',
        entryNumber: 'NOM-001-002',
        cune: 'existing-cune',
        xmlContent: '<xml>existing</xml>',
      };
      (prisma.payrollEntry.findMany as jest.Mock).mockResolvedValue([
        entryWithoutXml,
        entryWithXml2,
      ]);

      // Spy on internal methods to avoid deep mocking chains
      const generateSpy = jest
        .spyOn(service, 'generateEntryXml')
        .mockResolvedValue({ cune: 'new-cune', xml: '<xml>new</xml>' });
      const submitSpy = jest
        .spyOn(service, 'signAndSubmitEntry')
        .mockResolvedValue({
          success: true,
          entryId: 'entry-1',
          entryNumber: 'NOM-001-001',
          cune: 'cune-1',
          trackId: 'track-1',
          status: PayrollEntryStatus.ACCEPTED,
          message: 'OK',
        } as any);

      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({});

      const result = await service.submitPeriod('period-1');

      expect(result.total).toBe(2);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      // generateEntryXml called only for the one without cune
      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(generateSpy).toHaveBeenCalledWith('entry-1');
      // signAndSubmitEntry called for both
      expect(submitSpy).toHaveBeenCalledTimes(2);

      generateSpy.mockRestore();
      submitSpy.mockRestore();
    });

    it('should handle mixed success/failure in entries', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue(
        approvedPeriod,
      );
      const entries = [
        {
          ...mockEntry,
          id: 'entry-1',
          cune: 'cune-1',
          xmlContent: '<xml>1</xml>',
        },
        {
          ...mockEntry,
          id: 'entry-2',
          entryNumber: 'NOM-002',
          cune: 'cune-2',
          xmlContent: '<xml>2</xml>',
        },
      ];
      (prisma.payrollEntry.findMany as jest.Mock).mockResolvedValue(entries);

      const submitSpy = jest
        .spyOn(service, 'signAndSubmitEntry')
        .mockResolvedValueOnce({
          success: true,
          entryId: 'entry-1',
          entryNumber: 'NOM-001-001',
          cune: 'cune-1',
          trackId: 'track-1',
          status: PayrollEntryStatus.ACCEPTED,
          message: 'OK',
        } as any)
        .mockRejectedValueOnce(new Error('DIAN connection timeout'));

      const result = await service.submitPeriod('period-1');

      expect(result.total).toBe(2);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.entries[1].success).toBe(false);
      expect(result.entries[1].message).toBe('DIAN connection timeout');
      // Period status should NOT be updated since not all succeeded
      expect(prisma.payrollPeriod.update).not.toHaveBeenCalled();

      submitSpy.mockRestore();
    });

    it('should update period status to SENT_TO_DIAN when all succeed', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue(
        approvedPeriod,
      );
      const entries = [
        {
          ...mockEntry,
          id: 'entry-1',
          cune: 'cune-1',
          xmlContent: '<xml>1</xml>',
        },
      ];
      (prisma.payrollEntry.findMany as jest.Mock).mockResolvedValue(entries);

      const submitSpy = jest
        .spyOn(service, 'signAndSubmitEntry')
        .mockResolvedValue({
          success: true,
          entryId: 'entry-1',
          entryNumber: 'NOM-001-001',
          cune: 'cune-1',
          trackId: 'track-1',
          status: PayrollEntryStatus.ACCEPTED,
          message: 'OK',
        } as any);

      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({});

      const result = await service.submitPeriod('period-1');

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(prisma.payrollPeriod.update).toHaveBeenCalledWith({
        where: { id: 'period-1' },
        data: { status: PayrollPeriodStatus.SENT_TO_DIAN },
      });

      submitSpy.mockRestore();
    });
  });
});
