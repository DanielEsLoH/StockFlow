import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Response for single file upload
 */
export interface UploadResponse {
  url: string;
}

/**
 * Response for multiple file uploads
 */
export interface MultiUploadResponse {
  urls: string[];
}

/**
 * Allowed image MIME types
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * UploadService handles file upload operations for product images.
 *
 * Features:
 * - Single and multiple file uploads
 * - File validation (type, size, extension)
 * - Unique filename generation
 * - Tenant-based file organization (optional)
 * - File deletion with existence validation
 *
 * Files are stored in the ./uploads/products directory relative to the server root.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    // Set upload directory - defaults to ./uploads/products
    const baseDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
    this.uploadDir = path.join(baseDir, 'products');
    this.ensureUploadDirectoryExists();
  }

  /**
   * Ensures the upload directory exists, creating it if necessary.
   */
  private ensureUploadDirectoryExists(): void {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`Created upload directory: ${this.uploadDir}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create upload directory: ${this.uploadDir}`,
        error,
      );
      throw new Error(`Unable to create upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Gets the tenant-specific upload directory.
   *
   * @param tenantId - Optional tenant ID for subdirectory organization
   * @returns The upload directory path
   */
  private getTenantUploadDir(tenantId?: string): string {
    if (tenantId) {
      const tenantDir = path.join(this.uploadDir, tenantId);
      if (!fs.existsSync(tenantDir)) {
        fs.mkdirSync(tenantDir, { recursive: true });
        this.logger.debug(`Created tenant upload directory: ${tenantDir}`);
      }
      return tenantDir;
    }
    return this.uploadDir;
  }

  /**
   * Validates an uploaded file.
   *
   * @param file - The uploaded file to validate
   * @throws BadRequestException if file is invalid
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension: ${ext}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }
  }

  /**
   * Generates a unique filename for an uploaded file.
   *
   * @param originalName - The original filename
   * @returns A unique filename in format: product-{timestamp}-{random}.{ext}
   */
  generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    return `product-${timestamp}-${random}${ext}`;
  }

  /**
   * Uploads a single file to the server.
   *
   * @param file - The file to upload
   * @param tenantId - Optional tenant ID for organizing files by tenant
   * @returns Upload response with the URL path to the file
   * @throws BadRequestException if file validation fails
   */
  async uploadFile(
    file: Express.Multer.File,
    tenantId?: string,
  ): Promise<UploadResponse> {
    this.validateFile(file);

    const uploadDir = this.getTenantUploadDir(tenantId);
    const filename = this.generateUniqueFilename(file.originalname);
    const filePath = path.join(uploadDir, filename);

    try {
      // Write file to disk
      await fs.promises.writeFile(filePath, file.buffer);

      // Generate URL path
      const urlPath = tenantId
        ? `/uploads/products/${tenantId}/${filename}`
        : `/uploads/products/${filename}`;

      this.logger.log(
        `File uploaded: ${filename} (${file.size} bytes)${tenantId ? ` for tenant ${tenantId}` : ''}`,
      );

      return { url: urlPath };
    } catch (error) {
      this.logger.error(`Failed to write file: ${filename}`, error);
      throw new BadRequestException('Failed to save uploaded file');
    }
  }

  /**
   * Uploads multiple files to the server.
   *
   * @param files - Array of files to upload
   * @param tenantId - Optional tenant ID for organizing files by tenant
   * @returns Upload response with array of URL paths
   * @throws BadRequestException if any file validation fails
   */
  async uploadFiles(
    files: Express.Multer.File[],
    tenantId?: string,
  ): Promise<MultiUploadResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate all files first
    for (const file of files) {
      this.validateFile(file);
    }

    const urls: string[] = [];
    const uploadedFiles: string[] = [];

    try {
      for (const file of files) {
        const result = await this.uploadFile(file, tenantId);
        urls.push(result.url);
        uploadedFiles.push(result.url);
      }

      this.logger.log(
        `Uploaded ${files.length} files${tenantId ? ` for tenant ${tenantId}` : ''}`,
      );

      return { urls };
    } catch (error) {
      // Clean up any files that were already uploaded
      for (const url of uploadedFiles) {
        try {
          const filename = path.basename(url);
          await this.deleteFile(filename, tenantId);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Deletes a file from the server.
   *
   * @param filename - The filename to delete
   * @param tenantId - Optional tenant ID for tenant-scoped files
   * @throws NotFoundException if file does not exist
   * @throws BadRequestException if deletion fails
   */
  async deleteFile(filename: string, tenantId?: string): Promise<void> {
    // Validate filename to prevent path traversal attacks
    const sanitizedFilename = path.basename(filename);
    if (sanitizedFilename !== filename || filename.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }

    const uploadDir = this.getTenantUploadDir(tenantId);
    const filePath = path.join(uploadDir, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`File not found for deletion: ${filename}`);
      throw new NotFoundException(`File not found: ${filename}`);
    }

    try {
      await fs.promises.unlink(filePath);
      this.logger.log(
        `File deleted: ${filename}${tenantId ? ` for tenant ${tenantId}` : ''}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filename}`, error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Gets the full file path for a filename.
   *
   * @param filename - The filename
   * @param tenantId - Optional tenant ID
   * @returns The full file path
   */
  getFilePath(filename: string, tenantId?: string): string {
    const uploadDir = this.getTenantUploadDir(tenantId);
    return path.join(uploadDir, filename);
  }

  /**
   * Checks if a file exists.
   *
   * @param filename - The filename to check
   * @param tenantId - Optional tenant ID
   * @returns True if file exists, false otherwise
   */
  fileExists(filename: string, tenantId?: string): boolean {
    const filePath = this.getFilePath(filename, tenantId);
    return fs.existsSync(filePath);
  }

  /**
   * Gets the allowed MIME types for file uploads.
   *
   * @returns Array of allowed MIME types
   */
  getAllowedMimeTypes(): string[] {
    return [...ALLOWED_MIME_TYPES];
  }

  /**
   * Gets the maximum file size in bytes.
   *
   * @returns Maximum file size in bytes
   */
  getMaxFileSize(): number {
    return MAX_FILE_SIZE;
  }
}
