import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { UploadController } from './upload.controller';
import {
  UploadService,
  UploadResponse,
  MultiUploadResponse,
} from './upload.service';
import { TenantContextService } from '../common/services';
import { ArcjetService } from '../arcjet/arcjet.service';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: jest.Mocked<UploadService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const createMockFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 100, // 100KB
    buffer: Buffer.from('test file content'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
    ...overrides,
  });

  const mockUploadResponse: UploadResponse = {
    url: 'https://stockflow-images.daniel-esloh.workers.dev/api/images/products/product-123.jpg',
  };

  const mockMultiUploadResponse: MultiUploadResponse = {
    urls: [
      'https://stockflow-images.daniel-esloh.workers.dev/api/images/products/product-123.jpg',
      'https://stockflow-images.daniel-esloh.workers.dev/api/images/products/product-456.jpg',
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUploadService = {
      uploadFile: jest.fn(),
      uploadFiles: jest.fn(),
      uploadAvatar: jest.fn(),
      deleteByUrl: jest.fn(),
      validateFile: jest.fn(),
      generateUniqueFilename: jest.fn(),
      getAllowedMimeTypes: jest.fn(),
      getMaxFileSize: jest.fn(),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
      enforceLimit: jest.fn().mockResolvedValue(undefined),
      checkLimit: jest.fn().mockResolvedValue(true),
      getTenant: jest.fn(),
    };

    const mockArcjetService = {
      isProtectionEnabled: jest.fn().mockReturnValue(false),
      checkRateLimit: jest
        .fn()
        .mockResolvedValue({ allowed: true, reason: 'DISABLED' }),
      checkBot: jest
        .fn()
        .mockResolvedValue({ allowed: true, reason: 'DISABLED' }),
      getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: mockUploadService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: ArcjetService, useValue: mockArcjetService },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    uploadService = module.get(UploadService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
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

  describe('uploadProductImage', () => {
    it('should upload a single file successfully', async () => {
      const file = createMockFile();
      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);

      const result = await controller.uploadProductImage(file);

      expect(result).toEqual(mockUploadResponse);
      expect(uploadService.uploadFile).toHaveBeenCalledWith(file, mockTenantId);
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.uploadProductImage(null as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.uploadProductImage(null as any)).rejects.toThrow(
        'No file provided',
      );
    });

    it('should pass tenant ID to upload service', async () => {
      const file = createMockFile();
      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);

      await controller.uploadProductImage(file);

      expect(tenantContextService.getTenantId).toHaveBeenCalled();
      expect(uploadService.uploadFile).toHaveBeenCalledWith(file, mockTenantId);
    });

    it('should handle undefined tenant ID', async () => {
      const file = createMockFile();
      tenantContextService.getTenantId.mockReturnValue(null as any);
      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);

      await controller.uploadProductImage(file);

      expect(uploadService.uploadFile).toHaveBeenCalledWith(file, undefined);
    });

    it('should propagate service validation errors', async () => {
      const file = createMockFile();
      const error = new BadRequestException('Invalid file type');
      uploadService.uploadFile.mockRejectedValue(error);

      await expect(controller.uploadProductImage(file)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log upload operation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const file = createMockFile();
      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);

      await controller.uploadProductImage(file);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Uploading product image'),
      );
    });
  });

  describe('uploadProductImages', () => {
    it('should upload multiple files successfully', async () => {
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({ originalname: 'image2.jpg' }),
      ];
      uploadService.uploadFiles.mockResolvedValue(mockMultiUploadResponse);

      const result = await controller.uploadProductImages(files);

      expect(result).toEqual(mockMultiUploadResponse);
      expect(uploadService.uploadFiles).toHaveBeenCalledWith(
        files,
        mockTenantId,
      );
    });

    it('should throw BadRequestException when no files provided', async () => {
      await expect(controller.uploadProductImages([] as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when files is null', async () => {
      await expect(controller.uploadProductImages(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log batch upload operation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({ originalname: 'image2.jpg' }),
        createMockFile({ originalname: 'image3.jpg' }),
      ];
      uploadService.uploadFiles.mockResolvedValue({
        urls: ['/a.jpg', '/b.jpg', '/c.jpg'],
      });

      await controller.uploadProductImages(files);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Uploading 3 product images'),
      );
    });
  });

  describe('uploadAvatar', () => {
    const mockUser = { id: mockUserId };

    it('should upload avatar successfully', async () => {
      const file = createMockFile();
      uploadService.uploadAvatar.mockResolvedValue(mockUploadResponse);

      const result = await controller.uploadAvatar(file, mockUser);

      expect(result).toEqual(mockUploadResponse);
      expect(uploadService.uploadAvatar).toHaveBeenCalledWith(
        file,
        mockTenantId,
        mockUserId,
      );
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadAvatar(null as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when tenant context missing', async () => {
      tenantContextService.getTenantId.mockReturnValue(null as any);
      const file = createMockFile();

      await expect(
        controller.uploadAvatar(file, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log avatar upload operation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const file = createMockFile();
      uploadService.uploadAvatar.mockResolvedValue(mockUploadResponse);

      await controller.uploadAvatar(file, mockUser);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Uploading avatar for user ${mockUserId}`),
      );
    });
  });

  describe('tenant context', () => {
    it('should include tenant ID in upload log when available', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const file = createMockFile();
      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);

      await controller.uploadProductImage(file);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`for tenant ${mockTenantId}`),
      );
    });

    it('should not include tenant ID in log when not available', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      tenantContextService.getTenantId.mockReturnValue(null as any);
      const file = createMockFile();
      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);

      await controller.uploadProductImage(file);

      const logCall = logSpy.mock.calls[0][0] as string;
      expect(logCall).not.toContain('for tenant null');
    });
  });

  describe('response format', () => {
    it('should return correct format for single upload', async () => {
      const file = createMockFile();
      uploadService.uploadFile.mockResolvedValue({
        url: 'https://stockflow-images.daniel-esloh.workers.dev/api/images/products/product-123.jpg',
      });

      const result = await controller.uploadProductImage(file);

      expect(result).toHaveProperty('url');
      expect(typeof result.url).toBe('string');
    });

    it('should return correct format for batch upload', async () => {
      const files = [createMockFile(), createMockFile()];
      uploadService.uploadFiles.mockResolvedValue({
        urls: [
          'https://stockflow-images.daniel-esloh.workers.dev/api/images/products/p1.jpg',
          'https://stockflow-images.daniel-esloh.workers.dev/api/images/products/p2.jpg',
        ],
      });

      const result = await controller.uploadProductImages(files);

      expect(result).toHaveProperty('urls');
      expect(Array.isArray(result.urls)).toBe(true);
      expect(result.urls).toHaveLength(2);
    });
  });
});
