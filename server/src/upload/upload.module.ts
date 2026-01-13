import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CommonModule } from '../common';

/**
 * UploadModule provides file upload functionality for product images.
 *
 * Features:
 * - Single file upload (POST /upload/product-image)
 * - Multiple file upload (POST /upload/product-images, max 5 files)
 * - File deletion (DELETE /upload/:filename)
 * - File validation (type, size, extension)
 * - Tenant-based file organization
 *
 * Files are stored in ./uploads/products directory.
 * All endpoints require JWT authentication.
 *
 * Dependencies:
 * - CommonModule: Provides TenantContextService for multi-tenant support
 *
 * To enable static file serving, configure in main.ts:
 * ```typescript
 * import { NestExpressApplication } from '@nestjs/platform-express';
 * import { join } from 'path';
 *
 * const app = await NestFactory.create<NestExpressApplication>(AppModule);
 * app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
 * ```
 */
@Module({
  imports: [CommonModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
