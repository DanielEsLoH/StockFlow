import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth';
import { TenantContextService } from '../common/services';
import {
  UploadService,
  UploadResponse,
  MultiUploadResponse,
} from './upload.service';
import { RateLimitGuard, RateLimit } from '../arcjet';
import {
  UploadResponseEntity,
  MultiUploadResponseEntity,
} from './entities/upload.entity';

/**
 * Multer configuration for file uploads.
 * Uses memory storage to allow for validation before writing to disk.
 */
const multerOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
};

/**
 * UploadController handles file upload endpoints for product images.
 *
 * All endpoints require JWT authentication.
 *
 * Endpoints:
 * - POST /upload/product-image - Upload single product image
 * - POST /upload/product-images - Upload multiple product images (max 5)
 * - DELETE /upload/:filename - Delete an uploaded file
 */
@ApiTags('upload')
@ApiBearerAuth('JWT-auth')
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly uploadService: UploadService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Uploads a single product image.
   *
   * Rate limit: 20 uploads per hour per user (heavy operation)
   *
   * @param file - The uploaded image file
   * @returns Upload response with URL path to the file
   *
   * @example
   * POST /upload/product-image
   * Content-Type: multipart/form-data
   * file: <image file>
   *
   * Response:
   * { "url": "/uploads/products/product-1234567890-987654321.jpg" }
   */
  @Post('product-image')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ requests: 20, window: '1h', byUser: true })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({
    summary: 'Upload single product image',
    description:
      'Uploads a single product image. Accepts JPEG, PNG, GIF, and WebP files up to 5MB. Rate limited to 20 uploads per hour per user.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (JPEG, PNG, GIF, WebP, max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: UploadResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - No file provided or invalid file type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const tenantId = this.tenantContext.getTenantId();

    this.logger.log(
      `Uploading product image: ${file.originalname} (${file.size} bytes)${tenantId ? ` for tenant ${tenantId}` : ''}`,
    );

    return this.uploadService.uploadFile(file, tenantId ?? undefined);
  }

  /**
   * Uploads multiple product images (up to 5).
   *
   * Rate limit: 10 batch uploads per hour per user (heavy operation)
   *
   * @param files - Array of uploaded image files
   * @returns Upload response with array of URL paths
   *
   * @example
   * POST /upload/product-images
   * Content-Type: multipart/form-data
   * files: <image file 1>
   * files: <image file 2>
   * ...
   *
   * Response:
   * { "urls": ["/uploads/products/product-1.jpg", "/uploads/products/product-2.jpg"] }
   */
  @Post('product-images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ requests: 10, window: '1h', byUser: true })
  @UseInterceptors(FilesInterceptor('files', 5, multerOptions))
  @ApiOperation({
    summary: 'Upload multiple product images',
    description:
      'Uploads multiple product images (up to 5). Accepts JPEG, PNG, GIF, and WebP files up to 5MB each. Rate limited to 10 batch uploads per hour per user.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Image files to upload (max 5 files, JPEG/PNG/GIF/WebP, max 5MB each)',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    type: MultiUploadResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - No files provided or invalid file types',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<MultiUploadResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const tenantId = this.tenantContext.getTenantId();

    this.logger.log(
      `Uploading ${files.length} product images${tenantId ? ` for tenant ${tenantId}` : ''}`,
    );

    return this.uploadService.uploadFiles(files, tenantId ?? undefined);
  }

  /**
   * Deletes an uploaded file.
   *
   * @param filename - The filename to delete
   *
   * @example
   * DELETE /upload/product-1234567890-987654321.jpg
   */
  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete uploaded file',
    description:
      'Deletes an uploaded file by filename. Only files belonging to the current tenant can be deleted.',
  })
  @ApiParam({
    name: 'filename',
    description: 'Filename to delete',
    example: 'product-1234567890-987654321.jpg',
  })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('filename') filename: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    this.logger.log(
      `Deleting file: ${filename}${tenantId ? ` for tenant ${tenantId}` : ''}`,
    );

    await this.uploadService.deleteFile(filename, tenantId ?? undefined);
  }
}
