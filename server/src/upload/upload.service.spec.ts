import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { UploadService } from './upload.service';
import * as fs from 'fs';

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('UploadService', () => {
  let service: UploadService;

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

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default mock implementations
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

    const mockConfigService = {
      get: jest.fn().mockReturnValue('./uploads'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);

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
      expect(service).toBeDefined();
    });

    it('should create upload directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UploadService,
          { provide: ConfigService, useValue: { get: () => './uploads' } },
        ],
      }).compile();

      const newService = module.get<UploadService>(UploadService);
      expect(newService).toBeDefined();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('products'),
        { recursive: true },
      );
    });

    it('should use default upload directory when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UploadService,
          { provide: ConfigService, useValue: { get: () => undefined } },
        ],
      }).compile();

      const newService = module.get<UploadService>(UploadService);
      expect(newService).toBeDefined();
    });
  });

  describe('validateFile', () => {
    it('should accept valid JPEG file', () => {
      const file = createMockFile({ mimetype: 'image/jpeg' });
      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should accept valid JPG file', () => {
      const file = createMockFile({ mimetype: 'image/jpg' });
      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should accept valid PNG file', () => {
      const file = createMockFile({
        mimetype: 'image/png',
        originalname: 'test.png',
      });
      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should accept valid GIF file', () => {
      const file = createMockFile({
        mimetype: 'image/gif',
        originalname: 'test.gif',
      });
      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should accept valid WebP file', () => {
      const file = createMockFile({
        mimetype: 'image/webp',
        originalname: 'test.webp',
      });
      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should throw BadRequestException when no file provided', () => {
      expect(() => service.validateFile(null as any)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateFile(null as any)).toThrow(
        'No file provided',
      );
    });

    it('should throw BadRequestException for invalid MIME type', () => {
      const file = createMockFile({ mimetype: 'application/pdf' });
      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow('Invalid file type');
    });

    it('should throw BadRequestException for text file', () => {
      const file = createMockFile({
        mimetype: 'text/plain',
        originalname: 'test.txt',
      });
      expect(() => service.validateFile(file)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid extension', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        originalname: 'test.pdf',
      });
      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow(
        'Invalid file extension',
      );
    });

    it('should throw BadRequestException when file exceeds max size', () => {
      const file = createMockFile({ size: 6 * 1024 * 1024 }); // 6MB
      expect(() => service.validateFile(file)).toThrow(BadRequestException);
      expect(() => service.validateFile(file)).toThrow('File size exceeds');
    });

    it('should accept file at exactly max size', () => {
      const file = createMockFile({ size: 5 * 1024 * 1024 }); // 5MB
      expect(() => service.validateFile(file)).not.toThrow();
    });

    it('should handle case-insensitive extensions', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        originalname: 'test.JPG',
      });
      expect(() => service.validateFile(file)).not.toThrow();
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate filename with product prefix', () => {
      const filename = service.generateUniqueFilename('test.jpg');
      expect(filename).toMatch(/^product-\d+-\d+\.jpg$/);
    });

    it('should preserve file extension', () => {
      const jpgFilename = service.generateUniqueFilename('test.jpg');
      expect(jpgFilename).toMatch(/\.jpg$/);

      const pngFilename = service.generateUniqueFilename('test.png');
      expect(pngFilename).toMatch(/\.png$/);
    });

    it('should include timestamp in filename', () => {
      const before = Date.now();
      const filename = service.generateUniqueFilename('test.jpg');
      const after = Date.now();

      const match = filename.match(/^product-(\d+)-\d+\.jpg$/);
      expect(match).not.toBeNull();

      const timestamp = parseInt(match![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate unique filenames', () => {
      const filename1 = service.generateUniqueFilename('test.jpg');
      const filename2 = service.generateUniqueFilename('test.jpg');
      expect(filename1).not.toBe(filename2);
    });

    it('should lowercase the extension', () => {
      const filename = service.generateUniqueFilename('test.JPG');
      expect(filename).toMatch(/\.jpg$/);
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const file = createMockFile();
      const result = await service.uploadFile(file);

      expect(result).toHaveProperty('url');
      expect(result.url).toMatch(/^\/uploads\/products\/product-\d+-\d+\.jpg$/);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should upload file with tenant ID', async () => {
      const file = createMockFile();
      const result = await service.uploadFile(file, mockTenantId);

      expect(result.url).toContain(`/uploads/products/${mockTenantId}/`);
    });

    it('should create tenant directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes(mockTenantId)) {
          return false;
        }
        return true;
      });

      const file = createMockFile();
      await service.uploadFile(file, mockTenantId);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
        { recursive: true },
      );
    });

    it('should validate file before upload', async () => {
      const invalidFile = createMockFile({ mimetype: 'application/pdf' });

      await expect(service.uploadFile(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on write error', async () => {
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(
        new Error('Write error'),
      );

      const file = createMockFile();
      await expect(service.uploadFile(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadFile(file)).rejects.toThrow(
        'Failed to save uploaded file',
      );
    });

    it('should log upload operation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const file = createMockFile();

      await service.uploadFile(file);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('File uploaded'),
      );
    });
  });

  describe('uploadFiles', () => {
    it('should upload multiple files successfully', async () => {
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({ originalname: 'image2.jpg' }),
        createMockFile({ originalname: 'image3.jpg' }),
      ];

      const result = await service.uploadFiles(files);

      expect(result.urls).toHaveLength(3);
      result.urls.forEach((url) => {
        expect(url).toMatch(/^\/uploads\/products\/product-\d+-\d+\.jpg$/);
      });
    });

    it('should throw BadRequestException when no files provided', async () => {
      await expect(service.uploadFiles([])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadFiles([])).rejects.toThrow(
        'No files provided',
      );
    });

    it('should throw BadRequestException when files is null', async () => {
      await expect(service.uploadFiles(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate all files before uploading any', async () => {
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({
          mimetype: 'application/pdf',
          originalname: 'doc.pdf',
        }),
        createMockFile({ originalname: 'image3.jpg' }),
      ];

      await expect(service.uploadFiles(files)).rejects.toThrow(
        BadRequestException,
      );
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it('should upload files with tenant ID', async () => {
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({ originalname: 'image2.jpg' }),
      ];

      const result = await service.uploadFiles(files, mockTenantId);

      result.urls.forEach((url) => {
        expect(url).toContain(`/uploads/products/${mockTenantId}/`);
      });
    });

    it('should log batch upload operation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({ originalname: 'image2.jpg' }),
      ];

      await service.uploadFiles(files);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Uploaded 2'),
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      await service.deleteFile('product-123-456.jpg');

      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it('should delete file with tenant ID', async () => {
      await service.deleteFile('product-123-456.jpg', mockTenantId);

      expect(fs.promises.unlink).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
      );
    });

    it('should throw NotFoundException when file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.deleteFile('nonexistent.jpg')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteFile('nonexistent.jpg')).rejects.toThrow(
        'File not found',
      );
    });

    it('should throw BadRequestException for path traversal attempt', async () => {
      await expect(service.deleteFile('../secret.jpg')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteFile('../secret.jpg')).rejects.toThrow(
        'Invalid filename',
      );
    });

    it('should throw BadRequestException for directory traversal', async () => {
      await expect(service.deleteFile('../../etc/passwd')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on deletion error', async () => {
      (fs.promises.unlink as jest.Mock).mockRejectedValue(
        new Error('Permission denied'),
      );

      await expect(service.deleteFile('product-123-456.jpg')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteFile('product-123-456.jpg')).rejects.toThrow(
        'Failed to delete file',
      );
    });

    it('should log delete operation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.deleteFile('product-123-456.jpg');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('File deleted'),
      );
    });

    it('should log warning when file not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      try {
        await service.deleteFile('nonexistent.jpg');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found for deletion'),
      );
    });
  });

  describe('getFilePath', () => {
    it('should return correct file path without tenant', () => {
      const filePath = service.getFilePath('product-123-456.jpg');
      expect(filePath).toContain('products');
      expect(filePath).toContain('product-123-456.jpg');
    });

    it('should return correct file path with tenant', () => {
      const filePath = service.getFilePath('product-123-456.jpg', mockTenantId);
      expect(filePath).toContain(mockTenantId);
      expect(filePath).toContain('product-123-456.jpg');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      expect(service.fileExists('product-123-456.jpg')).toBe(true);
    });

    it('should return false when file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(service.fileExists('nonexistent.jpg')).toBe(false);
    });

    it('should check tenant-specific path when tenant ID provided', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      service.fileExists('product-123-456.jpg', mockTenantId);

      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
      );
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should return array of allowed MIME types', () => {
      const mimeTypes = service.getAllowedMimeTypes();

      expect(mimeTypes).toContain('image/jpeg');
      expect(mimeTypes).toContain('image/jpg');
      expect(mimeTypes).toContain('image/png');
      expect(mimeTypes).toContain('image/gif');
      expect(mimeTypes).toContain('image/webp');
    });

    it('should return a copy of the array', () => {
      const mimeTypes1 = service.getAllowedMimeTypes();
      const mimeTypes2 = service.getAllowedMimeTypes();

      expect(mimeTypes1).not.toBe(mimeTypes2);
      expect(mimeTypes1).toEqual(mimeTypes2);
    });
  });

  describe('getMaxFileSize', () => {
    it('should return max file size in bytes', () => {
      const maxSize = service.getMaxFileSize();
      expect(maxSize).toBe(5 * 1024 * 1024); // 5MB
    });
  });

  describe('error handling', () => {
    it('should handle directory creation failure gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(
        Test.createTestingModule({
          providers: [
            UploadService,
            { provide: ConfigService, useValue: { get: () => './uploads' } },
          ],
        }).compile(),
      ).rejects.toThrow('Unable to create upload directory');
    });
  });

  describe('tenant isolation', () => {
    it('should isolate files by tenant', async () => {
      const file = createMockFile();

      const result1 = await service.uploadFile(file, 'tenant-1');
      const result2 = await service.uploadFile(file, 'tenant-2');

      expect(result1.url).toContain('/tenant-1/');
      expect(result2.url).toContain('/tenant-2/');
      expect(result1.url).not.toBe(result2.url);
    });
  });

  describe('logging', () => {
    it('should log when creating upload directory', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await Test.createTestingModule({
        providers: [
          UploadService,
          { provide: ConfigService, useValue: { get: () => './uploads' } },
        ],
      }).compile();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created upload directory'),
      );
    });

    it('should log debug when creating tenant directory', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('new-tenant')) return false;
        return true;
      });

      const file = createMockFile();
      await service.uploadFile(file, 'new-tenant');

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created tenant upload directory'),
      );
    });

    it('should log error on write failure', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(
        new Error('Write error'),
      );

      const file = createMockFile();
      try {
        await service.uploadFile(file);
      } catch {
        // Expected
      }

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write file'),
        expect.any(Error),
      );
    });

    it('should log error on delete failure', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (fs.promises.unlink as jest.Mock).mockRejectedValue(
        new Error('Delete error'),
      );

      try {
        await service.deleteFile('product-123.jpg');
      } catch {
        // Expected
      }

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete file'),
        expect.any(Error),
      );
    });
  });
});
