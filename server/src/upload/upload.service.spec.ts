import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { UploadService } from './upload.service';
import { CloudflareStorageService } from './cloudflare-storage.service';

describe('UploadService', () => {
  let service: UploadService;
  let storageService: jest.Mocked<CloudflareStorageService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockPublicUrl = 'https://stockflow-images.daniel-esloh.workers.dev/api/images';

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

    const mockStorageService = {
      upload: jest
        .fn()
        .mockResolvedValue(`${mockPublicUrl}/products/product-123.jpg`),
      delete: jest.fn().mockResolvedValue(undefined),
      getPublicUrl: jest
        .fn()
        .mockImplementation(
          (key: string) => `${mockPublicUrl}/${key}`,
        ),
      extractKeyFromUrl: jest
        .fn()
        .mockImplementation((url: string) => {
          const prefix = `${mockPublicUrl}/`;
          return url.startsWith(prefix) ? url.slice(prefix.length) : null;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: CloudflareStorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    storageService = module.get(CloudflareStorageService);

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
      expect(service).toBeDefined();
    });
  });

  describe('validateFile', () => {
    it('should accept valid JPEG file', () => {
      const file = createMockFile({ mimetype: 'image/jpeg' });
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
  });

  describe('generateUniqueFilename', () => {
    it('should generate filename with given prefix', () => {
      const filename = service.generateUniqueFilename('product', 'test.jpg');
      expect(filename).toMatch(/^product-\d+-\d+\.jpg$/);
    });

    it('should preserve file extension', () => {
      const jpgFilename = service.generateUniqueFilename('product', 'test.jpg');
      expect(jpgFilename).toMatch(/\.jpg$/);

      const pngFilename = service.generateUniqueFilename('product', 'test.png');
      expect(pngFilename).toMatch(/\.png$/);
    });

    it('should generate unique filenames', () => {
      const filename1 = service.generateUniqueFilename('product', 'test.jpg');
      const filename2 = service.generateUniqueFilename('product', 'test.jpg');
      expect(filename1).not.toBe(filename2);
    });

    it('should lowercase the extension', () => {
      const filename = service.generateUniqueFilename('product', 'test.JPG');
      expect(filename).toMatch(/\.jpg$/);
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const file = createMockFile();
      const result = await service.uploadFile(file);

      expect(result).toHaveProperty('url');
      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^products\/product-\d+-\d+\.jpg$/),
        file.buffer,
        file.mimetype,
      );
    });

    it('should upload file with tenant ID in key path', async () => {
      const file = createMockFile();
      await service.uploadFile(file, mockTenantId);

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringContaining(`products/${mockTenantId}/`),
        file.buffer,
        file.mimetype,
      );
    });

    it('should validate file before upload', async () => {
      const invalidFile = createMockFile({ mimetype: 'application/pdf' });

      await expect(service.uploadFile(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(storageService.upload).not.toHaveBeenCalled();
    });
  });

  describe('uploadFiles', () => {
    it('should upload multiple files successfully', async () => {
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({ originalname: 'image2.jpg' }),
      ];

      const result = await service.uploadFiles(files);

      expect(result.urls).toHaveLength(2);
      expect(storageService.upload).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when no files provided', async () => {
      await expect(service.uploadFiles([])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadFiles([])).rejects.toThrow(
        'No files provided',
      );
    });

    it('should validate all files before uploading any', async () => {
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({
          mimetype: 'application/pdf',
          originalname: 'doc.pdf',
        }),
      ];

      await expect(service.uploadFiles(files)).rejects.toThrow(
        BadRequestException,
      );
      expect(storageService.upload).not.toHaveBeenCalled();
    });

    it('should cleanup already-uploaded files when a subsequent upload fails', async () => {
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({ originalname: 'image2.jpg' }),
        createMockFile({ originalname: 'image3.jpg' }),
      ];

      const uploadError = new Error('Storage service unavailable');

      // First upload succeeds, second succeeds, third fails
      storageService.upload
        .mockResolvedValueOnce(`${mockPublicUrl}/products/product-1.jpg`)
        .mockResolvedValueOnce(`${mockPublicUrl}/products/product-2.jpg`)
        .mockRejectedValueOnce(uploadError);

      await expect(service.uploadFiles(files, mockTenantId)).rejects.toThrow(
        uploadError,
      );

      // Should have attempted to delete the two already-uploaded keys
      expect(storageService.delete).toHaveBeenCalledTimes(2);
      expect(storageService.delete).toHaveBeenCalledWith('products/product-1.jpg');
      expect(storageService.delete).toHaveBeenCalledWith('products/product-2.jpg');
    });

    it('should still throw original error even if cleanup delete fails', async () => {
      const files = [
        createMockFile({ originalname: 'image1.jpg' }),
        createMockFile({ originalname: 'image2.jpg' }),
      ];

      const uploadError = new Error('Upload failed');

      storageService.upload
        .mockResolvedValueOnce(`${mockPublicUrl}/products/product-1.jpg`)
        .mockRejectedValueOnce(uploadError);

      // Make the cleanup delete also fail
      storageService.delete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.uploadFiles(files, mockTenantId)).rejects.toThrow(
        uploadError,
      );

      // Cleanup was attempted despite failing
      expect(storageService.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar with correct key path', async () => {
      const file = createMockFile();
      await service.uploadAvatar(file, mockTenantId, mockUserId);

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`^avatars/${mockTenantId}/${mockUserId}/avatar-\\d+-\\d+\\.jpg$`),
        ),
        file.buffer,
        file.mimetype,
      );
    });

    it('should validate file before upload', async () => {
      const invalidFile = createMockFile({ mimetype: 'application/pdf' });

      await expect(
        service.uploadAvatar(invalidFile, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
      expect(storageService.upload).not.toHaveBeenCalled();
    });
  });

  describe('deleteByUrl', () => {
    it('should extract key from URL and delete from storage', async () => {
      const url = `${mockPublicUrl}/products/tenant-123/product-123.jpg`;
      await service.deleteByUrl(url);

      expect(storageService.extractKeyFromUrl).toHaveBeenCalledWith(url);
      expect(storageService.delete).toHaveBeenCalledWith(
        'products/tenant-123/product-123.jpg',
      );
    });

    it('should log warning when key cannot be extracted', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      storageService.extractKeyFromUrl.mockReturnValue(null);

      await service.deleteByUrl('https://unknown.com/file.jpg');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot extract storage key'),
      );
      expect(storageService.delete).not.toHaveBeenCalled();
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should return array of allowed MIME types', () => {
      const mimeTypes = service.getAllowedMimeTypes();

      expect(mimeTypes).toContain('image/jpeg');
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

  describe('tenant isolation', () => {
    it('should isolate files by tenant', async () => {
      const file = createMockFile();

      await service.uploadFile(file, 'tenant-1');
      await service.uploadFile(file, 'tenant-2');

      const calls = storageService.upload.mock.calls;
      expect(calls[0][0]).toContain('tenant-1');
      expect(calls[1][0]).toContain('tenant-2');
    });
  });
});
