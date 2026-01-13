import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService, UploadResponse, MultiUploadResponse } from './upload.service';
import { TenantContextService } from '../common/services';
import { ArcjetService } from '../arcjet/arcjet.service';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: jest.Mocked<UploadService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

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
    url: '/uploads/products/product-1234567890-123456789.jpg',
  };

  const mockMultiUploadResponse: MultiUploadResponse = {
    urls: [
      '/uploads/products/product-1234567890-123456789.jpg',
      '/uploads/products/product-1234567891-987654321.jpg',
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUploadService = {
      uploadFile: jest.fn(),
      uploadFiles: jest.fn(),
      deleteFile: jest.fn(),
      validateFile: jest.fn(),
      generateUniqueFilename: jest.fn(),
      getFilePath: jest.fn(),
      fileExists: jest.fn(),
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
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, reason: 'DISABLED' }),
      checkBot: jest.fn().mockResolvedValue({ allowed: true, reason: 'DISABLED' }),
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

  describe('uploadProductImage', () => {
    it('should upload a single file successfully', async () => {
      const file = createMockFile();
      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);

      const result = await controller.uploadProductImage(file);

      expect(result).toEqual(mockUploadResponse);
      expect(uploadService.uploadFile).toHaveBeenCalledWith(file, mockTenantId);
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadProductImage(null as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.uploadProductImage(null as any),
      ).rejects.toThrow('No file provided');
    });

    it('should throw BadRequestException when file is undefined', async () => {
      await expect(
        controller.uploadProductImage(undefined as any),
      ).rejects.toThrow(BadRequestException);
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
      await expect(controller.uploadProductImage(file)).rejects.toThrow(
        'Invalid file type',
      );
    });

    it('should propagate service errors', async () => {
      const file = createMockFile();
      const error = new Error('Upload failed');
      uploadService.uploadFile.mockRejectedValue(error);

      await expect(controller.uploadProductImage(file)).rejects.toThrow(error);
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

    it('should log file details', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const file = createMockFile({
        originalname: 'my-photo.png',
        size: 2048,
      });
      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);

      await controller.uploadProductImage(file);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('my-photo.png'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2048'));
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
      await expect(
        controller.uploadProductImages([] as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.uploadProductImages([] as any),
      ).rejects.toThrow('No files provided');
    });

    it('should throw BadRequestException when files is null', async () => {
      await expect(
        controller.uploadProductImages(null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when files is undefined', async () => {
      await expect(
        controller.uploadProductImages(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass tenant ID to upload service', async () => {
      const files = [createMockFile()];
      uploadService.uploadFiles.mockResolvedValue(mockMultiUploadResponse);

      await controller.uploadProductImages(files);

      expect(tenantContextService.getTenantId).toHaveBeenCalled();
      expect(uploadService.uploadFiles).toHaveBeenCalledWith(
        files,
        mockTenantId,
      );
    });

    it('should handle undefined tenant ID', async () => {
      const files = [createMockFile()];
      tenantContextService.getTenantId.mockReturnValue(null as any);
      uploadService.uploadFiles.mockResolvedValue(mockMultiUploadResponse);

      await controller.uploadProductImages(files);

      expect(uploadService.uploadFiles).toHaveBeenCalledWith(files, undefined);
    });

    it('should propagate service validation errors', async () => {
      const files = [createMockFile()];
      const error = new BadRequestException('File size exceeds limit');
      uploadService.uploadFiles.mockRejectedValue(error);

      await expect(controller.uploadProductImages(files)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate service errors', async () => {
      const files = [createMockFile()];
      const error = new Error('Upload failed');
      uploadService.uploadFiles.mockRejectedValue(error);

      await expect(controller.uploadProductImages(files)).rejects.toThrow(
        error,
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

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      uploadService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile('product-123-456.jpg');

      expect(uploadService.deleteFile).toHaveBeenCalledWith(
        'product-123-456.jpg',
        mockTenantId,
      );
    });

    it('should pass tenant ID to delete service', async () => {
      uploadService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile('product-123-456.jpg');

      expect(tenantContextService.getTenantId).toHaveBeenCalled();
      expect(uploadService.deleteFile).toHaveBeenCalledWith(
        'product-123-456.jpg',
        mockTenantId,
      );
    });

    it('should handle undefined tenant ID', async () => {
      tenantContextService.getTenantId.mockReturnValue(null as any);
      uploadService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile('product-123-456.jpg');

      expect(uploadService.deleteFile).toHaveBeenCalledWith(
        'product-123-456.jpg',
        undefined,
      );
    });

    it('should propagate NotFoundException', async () => {
      const error = new NotFoundException('File not found');
      uploadService.deleteFile.mockRejectedValue(error);

      await expect(
        controller.deleteFile('nonexistent.jpg'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.deleteFile('nonexistent.jpg'),
      ).rejects.toThrow('File not found');
    });

    it('should propagate BadRequestException for invalid filename', async () => {
      const error = new BadRequestException('Invalid filename');
      uploadService.deleteFile.mockRejectedValue(error);

      await expect(
        controller.deleteFile('../secret.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Delete failed');
      uploadService.deleteFile.mockRejectedValue(error);

      await expect(
        controller.deleteFile('product-123-456.jpg'),
      ).rejects.toThrow(error);
    });

    it('should log delete operation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      uploadService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile('product-123-456.jpg');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deleting file'),
      );
    });

    it('should log filename in delete operation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      uploadService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile('my-product-image.jpg');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('my-product-image.jpg'),
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

    it('should include tenant ID in batch upload log when available', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const files = [createMockFile()];
      uploadService.uploadFiles.mockResolvedValue(mockMultiUploadResponse);

      await controller.uploadProductImages(files);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`for tenant ${mockTenantId}`),
      );
    });

    it('should include tenant ID in delete log when available', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      uploadService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile('product-123.jpg');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`for tenant ${mockTenantId}`),
      );
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors in single upload', async () => {
      const file = createMockFile();
      const error = new Error('Unexpected error');
      uploadService.uploadFile.mockRejectedValue(error);

      await expect(controller.uploadProductImage(file)).rejects.toThrow(
        'Unexpected error',
      );
    });

    it('should handle unexpected errors in batch upload', async () => {
      const files = [createMockFile()];
      const error = new Error('Unexpected error');
      uploadService.uploadFiles.mockRejectedValue(error);

      await expect(controller.uploadProductImages(files)).rejects.toThrow(
        'Unexpected error',
      );
    });

    it('should handle unexpected errors in delete', async () => {
      const error = new Error('Unexpected error');
      uploadService.deleteFile.mockRejectedValue(error);

      await expect(controller.deleteFile('test.jpg')).rejects.toThrow(
        'Unexpected error',
      );
    });
  });

  describe('response format', () => {
    it('should return correct format for single upload', async () => {
      const file = createMockFile();
      uploadService.uploadFile.mockResolvedValue({
        url: '/uploads/products/product-123.jpg',
      });

      const result = await controller.uploadProductImage(file);

      expect(result).toHaveProperty('url');
      expect(typeof result.url).toBe('string');
      expect(result.url).toMatch(/^\/uploads\/products\//);
    });

    it('should return correct format for batch upload', async () => {
      const files = [createMockFile(), createMockFile()];
      uploadService.uploadFiles.mockResolvedValue({
        urls: ['/uploads/products/p1.jpg', '/uploads/products/p2.jpg'],
      });

      const result = await controller.uploadProductImages(files);

      expect(result).toHaveProperty('urls');
      expect(Array.isArray(result.urls)).toBe(true);
      expect(result.urls).toHaveLength(2);
      result.urls.forEach((url) => {
        expect(url).toMatch(/^\/uploads\/products\//);
      });
    });
  });
});