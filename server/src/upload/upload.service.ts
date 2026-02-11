import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as path from 'path';
import { CloudflareStorageService } from './cloudflare-storage.service';

export interface UploadResponse {
  url: string;
}

export interface MultiUploadResponse {
  urls: string[];
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly storage: CloudflareStorageService) {}

  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension: ${ext}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }
  }

  generateUniqueFilename(prefix: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    return `${prefix}-${timestamp}-${random}${ext}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    tenantId?: string,
  ): Promise<UploadResponse> {
    this.validateFile(file);

    const filename = this.generateUniqueFilename('product', file.originalname);
    const key = tenantId
      ? `products/${tenantId}/${filename}`
      : `products/${filename}`;

    const url = await this.storage.upload(key, file.buffer, file.mimetype);

    this.logger.log(
      `Product image uploaded: ${filename} (${file.size} bytes)${tenantId ? ` for tenant ${tenantId}` : ''}`,
    );

    return { url };
  }

  async uploadFiles(
    files: Express.Multer.File[],
    tenantId?: string,
  ): Promise<MultiUploadResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    for (const file of files) {
      this.validateFile(file);
    }

    const urls: string[] = [];
    const uploadedKeys: string[] = [];

    try {
      for (const file of files) {
        const result = await this.uploadFile(file, tenantId);
        urls.push(result.url);
        const key = this.storage.extractKeyFromUrl(result.url);
        if (key) uploadedKeys.push(key);
      }

      this.logger.log(
        `Uploaded ${files.length} files${tenantId ? ` for tenant ${tenantId}` : ''}`,
      );

      return { urls };
    } catch (error) {
      for (const key of uploadedKeys) {
        try {
          await this.storage.delete(key);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  async uploadAvatar(
    file: Express.Multer.File,
    tenantId: string,
    userId: string,
  ): Promise<UploadResponse> {
    this.validateFile(file);

    const filename = this.generateUniqueFilename('avatar', file.originalname);
    const key = `avatars/${tenantId}/${userId}/${filename}`;

    const url = await this.storage.upload(key, file.buffer, file.mimetype);

    this.logger.log(`Avatar uploaded for user ${userId}`);

    return { url };
  }

  async deleteByUrl(url: string): Promise<void> {
    const key = this.storage.extractKeyFromUrl(url);
    if (!key) {
      this.logger.warn(`Cannot extract storage key from URL: ${url}`);
      return;
    }

    await this.storage.delete(key);
    this.logger.log(`Deleted file: ${key}`);
  }

  getAllowedMimeTypes(): string[] {
    return [...ALLOWED_MIME_TYPES];
  }

  getMaxFileSize(): number {
    return MAX_FILE_SIZE;
  }
}
