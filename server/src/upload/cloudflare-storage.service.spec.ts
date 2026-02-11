import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudflareStorageService } from './cloudflare-storage.service';

describe('CloudflareStorageService', () => {
  let service: CloudflareStorageService;
  let fetchSpy: jest.SpyInstance;

  const mockWorkerUrl = 'https://stockflow-images.daniel-esloh.workers.dev';
  const mockAuthSecret = 'test-auth-secret';

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          CF_WORKER_URL: mockWorkerUrl,
          CF_AUTH_SECRET: mockAuthSecret,
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudflareStorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CloudflareStorageService>(CloudflareStorageService);

    fetchSpy = jest.spyOn(global, 'fetch');

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

  describe('upload', () => {
    const key = 'products/tenant-123/product-123.jpg';
    const buffer = Buffer.from('test image content');
    const contentType = 'image/jpeg';

    it('should send POST to worker upload endpoint', async () => {
      const mockUrl = `${mockWorkerUrl}/api/images/${key}`;
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ url: mockUrl, key }),
      });

      const result = await service.upload(key, buffer, contentType);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${mockWorkerUrl}/api/images/upload`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAuthSecret}`,
            'X-Storage-Key': key,
          }),
        }),
      );
      expect(result).toBe(mockUrl);
    });

    it('should throw InternalServerErrorException on worker error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(service.upload(key, buffer, contentType)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(
        service.upload(key, buffer, contentType),
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    const key = 'products/tenant-123/product-123.jpg';

    it('should send DELETE to worker with auth header', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 204,
      });

      await service.delete(key);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${mockWorkerUrl}/api/images/${key}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAuthSecret}`,
          }),
        }),
      );
    });

    it('should not throw on 404 (already deleted)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(service.delete(key)).resolves.toBeUndefined();
    });

    it('should throw InternalServerErrorException on other errors', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      });

      await expect(service.delete(key)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getPublicUrl', () => {
    it('should return correct URL with worker base', () => {
      const key = 'products/tenant-123/file.jpg';
      const url = service.getPublicUrl(key);
      expect(url).toBe(`${mockWorkerUrl}/api/images/${key}`);
    });
  });

  describe('extractKeyFromUrl', () => {
    it('should extract key from valid worker URL', () => {
      const key = 'products/tenant-123/file.jpg';
      const url = `${mockWorkerUrl}/api/images/${key}`;
      expect(service.extractKeyFromUrl(url)).toBe(key);
    });

    it('should return null for non-matching URL', () => {
      expect(service.extractKeyFromUrl('https://other.com/file.jpg')).toBeNull();
    });

    it('should handle URLs with nested paths', () => {
      const key = 'avatars/tenant-123/user-456/avatar-123.jpg';
      const url = `${mockWorkerUrl}/api/images/${key}`;
      expect(service.extractKeyFromUrl(url)).toBe(key);
    });
  });
});
