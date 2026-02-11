import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudflareStorageService } from './cloudflare-storage.service';
import { CommonModule } from '../common';

@Module({
  imports: [CommonModule],
  controllers: [UploadController],
  providers: [CloudflareStorageService, UploadService],
  exports: [UploadService],
})
export class UploadModule {}
