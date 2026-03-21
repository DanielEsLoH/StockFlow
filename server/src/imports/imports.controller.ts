import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
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
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth';
import { CurrentUser } from '../common/decorators';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions/permission.enum';
import type { RequestUser } from '../auth/types';
import { ImportsService } from './imports.service';
import { TemplateGeneratorService } from './templates/template-generator.service';
import {
  ImportFileDto,
  ImportModule,
  DuplicateStrategy,
  type ImportValidationResult,
  type ImportResult,
} from './dto/import-file.dto';

const multerOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          'Formato de archivo no soportado. Use archivos CSV (.csv) o Excel (.xlsx)',
        ),
        false,
      );
    }
  },
};

/**
 * ImportsController handles all data import endpoints.
 *
 * Endpoints:
 * - GET /imports/templates/:module - Download an import template
 * - POST /imports/validate - Validate an import file
 * - POST /imports/execute - Execute an import operation
 *
 * All endpoints (except template download) require JWT authentication
 * and the DATA_IMPORT permission.
 */
@ApiTags('imports')
@ApiBearerAuth('JWT-auth')
@Controller('imports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.DATA_IMPORT)
export class ImportsController {
  private readonly logger = new Logger(ImportsController.name);

  constructor(
    private readonly importsService: ImportsService,
    private readonly templateGeneratorService: TemplateGeneratorService,
  ) {}

  /**
   * Downloads an Excel template for the specified import module.
   * The template includes example data and instructions.
   */
  @Get('templates/:module')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download import template',
    description:
      'Downloads an Excel template with headers, example data, and instructions for the specified module.',
  })
  @ApiParam({
    name: 'module',
    enum: ImportModule,
    description: 'The target module for the template',
  })
  @ApiResponse({ status: 200, description: 'Excel template file' })
  @ApiResponse({ status: 400, description: 'Invalid module' })
  async downloadTemplate(
    @Param('module') module: ImportModule,
    @Res() res: Response,
  ): Promise<void> {
    if (!Object.values(ImportModule).includes(module)) {
      throw new BadRequestException(
        `Modulo invalido: ${module}. Use products, customers o suppliers.`,
      );
    }

    this.logger.log(`Downloading template for module: ${module}`);

    const buffer = this.templateGeneratorService.generateTemplate(module);

    const filename = `plantilla_importacion_${module}.xlsx`;

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }

  /**
   * Validates an import file without persisting data.
   * Returns per-row validation results including errors and duplicate detection.
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({
    summary: 'Validate import file',
    description:
      'Validates the uploaded file against the module schema. Returns per-row validation results without persisting data.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        module: {
          type: 'string',
          enum: ['products', 'customers', 'suppliers'],
        },
      },
      required: ['file', 'module'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation results with per-row details',
  })
  @ApiResponse({ status: 400, description: 'Invalid file or module' })
  async validateImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportFileDto,
  ): Promise<ImportValidationResult> {
    if (!file) {
      throw new BadRequestException('No se proporciono ningun archivo');
    }

    this.logger.log(
      `Validating import: ${file.originalname} for module ${dto.module}`,
    );

    return this.importsService.validateImport(file, dto.module);
  }

  /**
   * Executes an import operation, persisting validated data to the database.
   * All rows must be valid; returns counts of created, updated, and skipped records.
   */
  @Post('execute')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({
    summary: 'Execute import',
    description:
      'Parses, validates, and imports the file data into the database. All rows must pass validation.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        module: {
          type: 'string',
          enum: ['products', 'customers', 'suppliers'],
        },
        duplicateStrategy: {
          type: 'string',
          enum: ['skip', 'update'],
          default: 'skip',
        },
      },
      required: ['file', 'module'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import executed successfully with result counts',
  })
  @ApiResponse({ status: 400, description: 'Validation errors found' })
  async executeImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportFileDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('No se proporciono ningun archivo');
    }

    this.logger.log(
      `Executing import: ${file.originalname} for module ${dto.module}, strategy: ${dto.duplicateStrategy ?? DuplicateStrategy.SKIP}`,
    );

    return this.importsService.executeImport(
      file,
      dto.module,
      dto.duplicateStrategy ?? DuplicateStrategy.SKIP,
      user.userId,
    );
  }
}
