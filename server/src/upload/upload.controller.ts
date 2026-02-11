import {
  Controller,
  Post,
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
import { CurrentUser } from '../common/decorators';

const multerOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};

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

  @Post('product-image')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ requests: 20, window: '1h', byUser: true })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'Upload single product image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: UploadResponseEntity })
  @ApiResponse({ status: 400 })
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

  @Post('product-images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ requests: 10, window: '1h', byUser: true })
  @UseInterceptors(FilesInterceptor('files', 5, multerOptions))
  @ApiOperation({ summary: 'Upload multiple product images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({ status: 201, type: MultiUploadResponseEntity })
  @ApiResponse({ status: 400 })
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

  @Post('avatar')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ requests: 10, window: '1h', byUser: true })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: UploadResponseEntity })
  @ApiResponse({ status: 400 })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }

    this.logger.log(
      `Uploading avatar for user ${user.id} in tenant ${tenantId}`,
    );

    return this.uploadService.uploadAvatar(file, tenantId, user.id);
  }
}
