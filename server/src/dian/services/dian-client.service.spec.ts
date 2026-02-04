import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DianClientService } from './dian-client.service';
import type { TenantDianConfig } from '@prisma/client';
import * as https from 'https';

// Mock https module
jest.mock('https');

describe('DianClientService', () => {
  let service: DianClientService;
  const mockHttpsRequest = https.request as jest.MockedFunction<typeof https.request>;

  const mockDianConfig = {
    id: 'config-123',
    tenantId: 'tenant-123',
    nit: '900123456',
    dv: '7',
    businessName: 'Test Company S.A.S',
    tradeName: 'Test Company',
    taxResponsibilities: ['O-15'],
    economicActivity: '4711',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    cityCode: '11001',
    department: 'Bogota D.C.',
    departmentCode: '11',
    postalCode: '110111',
    phone: '3001234567',
    email: 'test@company.com',
    testMode: true,
    softwareId: 'software-123',
    softwarePin: 'pin-123',
    technicalKey: 'tech-key-123',
    resolutionNumber: '18760000001',
    resolutionDate: new Date('2024-01-01'),
    resolutionPrefix: 'SETT',
    resolutionRangeFrom: 1,
    resolutionRangeTo: 5000000,
    currentNumber: 100,
    certificateFile: null,
    certificatePassword: null,
    country: 'Colombia',
    countryCode: 'CO',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TenantDianConfig;

  const mockSuccessResponse = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
      <soap:Body>
        <SendBillSyncResponse>
          <IsValid>true</IsValid>
          <StatusCode>00</StatusCode>
          <StatusDescription>Procesado Correctamente</StatusDescription>
          <StatusMessage>Documento validado</StatusMessage>
          <TrackId>track-123</TrackId>
        </SendBillSyncResponse>
      </soap:Body>
    </soap:Envelope>`;

  const mockErrorResponse = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
      <soap:Body>
        <SendBillSyncResponse>
          <IsValid>false</IsValid>
          <StatusCode>99</StatusCode>
          <StatusDescription>Error de validacion</StatusDescription>
          <ErrorMessage>NIT invalido</ErrorMessage>
        </SendBillSyncResponse>
      </soap:Body>
    </soap:Envelope>`;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DianClientService],
    }).compile();

    service = module.get<DianClientService>(DianClientService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to mock successful HTTP request
  const mockSuccessfulRequest = (responseBody: string) => {
    const mockReq = {
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      setTimeout: jest.fn(),
      destroy: jest.fn(),
    };

    mockHttpsRequest.mockImplementation((options, callback) => {
      const mockRes = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(responseBody);
          }
          if (event === 'end') {
            handler();
          }
          return mockRes;
        }),
      };
      callback?.(mockRes as any);
      return mockReq as any;
    });
  };

  // Helper to mock failed HTTP request
  const mockFailedRequest = (errorMessage: string) => {
    const mockReq = {
      on: jest.fn((event, handler) => {
        if (event === 'error') {
          handler(new Error(errorMessage));
        }
        return mockReq;
      }),
      write: jest.fn(),
      end: jest.fn(),
      setTimeout: jest.fn(),
      destroy: jest.fn(),
    };

    mockHttpsRequest.mockImplementation(() => mockReq as any);
  };

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('sendDocument', () => {
    it('should send document successfully', async () => {
      mockSuccessfulRequest(mockSuccessResponse);

      const result = await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'fvSETT100.xml',
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe('00');
      expect(result.trackId).toBe('track-123');
    });

    it('should handle validation errors', async () => {
      mockSuccessfulRequest(mockErrorResponse);

      const result = await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'fvSETT100.xml',
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe('99');
      expect(result.errors).toContain('NIT invalido');
    });

    it('should handle network errors', async () => {
      mockFailedRequest('Connection refused');

      const result = await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'fvSETT100.xml',
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe('ERROR');
      expect(result.errors).toContain('Connection refused');
    });

    it('should use production URL when testMode is false', async () => {
      mockSuccessfulRequest(mockSuccessResponse);
      const prodConfig = { ...mockDianConfig, testMode: false };

      await service.sendDocument(
        prodConfig as TenantDianConfig,
        '<xml>test</xml>',
        'fvSETT100.xml',
      );

      expect(mockHttpsRequest).toHaveBeenCalled();
      const callArgs = mockHttpsRequest.mock.calls[0][0] as https.RequestOptions;
      expect(callArgs.hostname).toBe('vpfe.dian.gov.co');
    });

    it('should use test URL when testMode is true', async () => {
      mockSuccessfulRequest(mockSuccessResponse);

      await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'fvSETT100.xml',
      );

      expect(mockHttpsRequest).toHaveBeenCalled();
      const callArgs = mockHttpsRequest.mock.calls[0][0] as https.RequestOptions;
      expect(callArgs.hostname).toBe('vpfe-hab.dian.gov.co');
    });
  });

  describe('sendTestSetDocument', () => {
    it('should send test set document successfully', async () => {
      mockSuccessfulRequest(mockSuccessResponse);

      const result = await service.sendTestSetDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'fvSETT100.xml',
        'test-set-123',
      );

      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      mockFailedRequest('Timeout');

      const result = await service.sendTestSetDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'fvSETT100.xml',
        'test-set-123',
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe('ERROR');
    });
  });

  describe('getDocumentStatus', () => {
    const mockStatusResponse = `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
        <soap:Body>
          <GetStatusResponse>
            <IsValid>true</IsValid>
            <StatusCode>00</StatusCode>
            <StatusDescription>Documento aprobado</StatusDescription>
            <DocumentStatus>Aprobado</DocumentStatus>
          </GetStatusResponse>
        </soap:Body>
      </soap:Envelope>`;

    it('should get document status successfully', async () => {
      mockSuccessfulRequest(mockStatusResponse);

      const result = await service.getDocumentStatus(
        mockDianConfig,
        'track-123',
      );

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.documentStatus).toBe('Aprobado');
    });

    it('should handle errors', async () => {
      mockFailedRequest('Service unavailable');

      const result = await service.getDocumentStatus(
        mockDianConfig,
        'track-123',
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe('ERROR');
    });
  });

  describe('getDocumentStatusByCufe', () => {
    const mockStatusResponse = `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
        <soap:Body>
          <GetStatusZipResponse>
            <IsValid>true</IsValid>
            <StatusCode>00</StatusCode>
            <StatusDescription>Documento encontrado</StatusDescription>
          </GetStatusZipResponse>
        </soap:Body>
      </soap:Envelope>`;

    it('should get document status by CUFE successfully', async () => {
      mockSuccessfulRequest(mockStatusResponse);
      const cufe = 'a'.repeat(96);

      const result = await service.getDocumentStatusByCufe(
        mockDianConfig,
        cufe,
      );

      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      mockFailedRequest('Connection reset');
      const cufe = 'a'.repeat(96);

      const result = await service.getDocumentStatusByCufe(
        mockDianConfig,
        cufe,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('parseSendResponse', () => {
    it('should parse successful response', async () => {
      mockSuccessfulRequest(mockSuccessResponse);

      const result = await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'test.xml',
      );

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.statusCode).toBe('00');
    });

    it('should parse response with warnings', async () => {
      const responseWithWarnings = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
          <soap:Body>
            <SendBillSyncResponse>
              <IsValid>true</IsValid>
              <StatusCode>00</StatusCode>
              <StatusDescription>Procesado</StatusDescription>
              <WarningMessage>Campo opcional vacio</WarningMessage>
            </SendBillSyncResponse>
          </soap:Body>
        </soap:Envelope>`;

      mockSuccessfulRequest(responseWithWarnings);

      const result = await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'test.xml',
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Campo opcional vacio');
    });

    it('should handle malformed XML response', async () => {
      mockSuccessfulRequest('invalid xml');

      const result = await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'test.xml',
      );

      // Should not crash, returns default values
      expect(result).toBeDefined();
    });
  });

  describe('HTTP error handling', () => {
    it('should handle HTTP error status codes', async () => {
      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        setTimeout: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsRequest.mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 500,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler('Internal Server Error');
            }
            if (event === 'end') {
              handler();
            }
            return mockRes;
          }),
        };
        callback?.(mockRes as any);
        return mockReq as any;
      });

      const result = await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'test.xml',
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe('ERROR');
    });

    it('should handle request timeout', async () => {
      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        setTimeout: jest.fn((timeout: number, callback: () => void) => {
          // Simulate timeout
          callback();
          return mockReq;
        }),
        destroy: jest.fn(),
      };

      mockHttpsRequest.mockImplementation(() => mockReq as any);

      const result = await service.sendDocument(
        mockDianConfig,
        '<xml>test</xml>',
        'test.xml',
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Request timeout');
    });
  });
});
