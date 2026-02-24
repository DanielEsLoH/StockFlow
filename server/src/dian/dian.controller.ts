import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole, DianDocumentStatus } from '@prisma/client';
import { DianService } from './dian.service';
import {
  CreateDianConfigDto,
  UpdateDianConfigDto,
  SetDianSoftwareDto,
  SetDianResolutionDto,
  SendInvoiceDto,
  CheckDocumentStatusDto,
  GenerateCreditNoteDto,
  GenerateDebitNoteDto,
  SetNoteConfigDto,
} from './dto';
import { DianConfigEntity } from './entities/dian-config.entity';
import {
  DianDocumentWithInvoiceEntity,
  PaginatedDianDocumentsEntity,
} from './entities/dian-document.entity';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

@ApiTags('dian')
@ApiBearerAuth('JWT-auth')
@Controller('dian')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DianController {
  private readonly logger = new Logger(DianController.name);

  constructor(private readonly dianService: DianService) {}

  // ============================================================================
  // CONFIGURATION ENDPOINTS
  // ============================================================================

  @Get('config')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get DIAN configuration',
    description:
      'Returns the current DIAN electronic invoicing configuration for the tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration found',
    type: DianConfigEntity,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfig() {
    this.logger.log('Getting DIAN config');
    return this.dianService.getConfig();
  }

  @Post('config')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create DIAN configuration',
    description:
      'Creates or updates the DIAN electronic invoicing configuration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuration created',
    type: DianConfigEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createConfig(@Body() dto: CreateDianConfigDto) {
    this.logger.log('Creating DIAN config');
    return this.dianService.createConfig(dto);
  }

  @Put('config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update DIAN configuration',
    description: 'Updates the existing DIAN configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated',
    type: DianConfigEntity,
  })
  async updateConfig(@Body() dto: UpdateDianConfigDto) {
    this.logger.log('Updating DIAN config');
    return this.dianService.updateConfig(dto);
  }

  @Post('config/software')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set software credentials',
    description:
      'Sets the software ID, PIN, and technical key provided by DIAN.',
  })
  @ApiResponse({ status: 200, description: 'Credentials set successfully' })
  async setSoftwareCredentials(@Body() dto: SetDianSoftwareDto) {
    this.logger.log('Setting software credentials');
    return this.dianService.setSoftwareCredentials(dto);
  }

  @Post('config/resolution')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set invoice resolution',
    description:
      'Sets the DIAN authorization resolution for electronic invoicing.',
  })
  @ApiResponse({ status: 200, description: 'Resolution set successfully' })
  async setResolution(@Body() dto: SetDianResolutionDto) {
    this.logger.log('Setting resolution');
    return this.dianService.setResolution(dto);
  }

  @Post('config/certificate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload digital certificate',
    description:
      'Uploads the .p12/.pfx digital certificate for signing documents.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        password: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate uploaded successfully',
  })
  async uploadCertificate(
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
  ) {
    this.logger.log('Uploading certificate');
    return this.dianService.uploadCertificate(file.buffer, password);
  }

  // ============================================================================
  // DOCUMENT PROCESSING ENDPOINTS
  // ============================================================================

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send invoice to DIAN',
    description:
      'Processes and sends an invoice to DIAN for electronic validation.',
  })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'Configuration missing or invalid invoice',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async sendInvoice(@Body() dto: SendInvoiceDto) {
    this.logger.log(`Sending invoice ${dto.invoiceId} to DIAN`);
    return this.dianService.processInvoice(dto.invoiceId, dto.force);
  }

  @Post('check-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check document status',
    description: 'Checks the status of a previously sent document with DIAN.',
  })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async checkStatus(@Body() dto: CheckDocumentStatusDto) {
    this.logger.log(`Checking status for document ${dto.documentId}`);
    return this.dianService.checkDocumentStatus(dto.documentId);
  }

  @Post('credit-note')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create credit note',
    description:
      'Generates and sends a credit note (nota crédito) to DIAN for an existing invoice.',
  })
  @ApiResponse({ status: 200, description: 'Credit note created and sent' })
  @ApiResponse({ status: 400, description: 'Invalid data or invoice not accepted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async createCreditNote(@Body() dto: GenerateCreditNoteDto) {
    this.logger.log(`Creating credit note for invoice ${dto.invoiceId}`);
    return this.dianService.processCreditNote(dto);
  }

  @Post('debit-note')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create debit note',
    description:
      'Generates and sends a debit note (nota débito) to DIAN for an existing invoice.',
  })
  @ApiResponse({ status: 200, description: 'Debit note created and sent' })
  @ApiResponse({ status: 400, description: 'Invalid data or invoice not accepted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async createDebitNote(@Body() dto: GenerateDebitNoteDto) {
    this.logger.log(`Creating debit note for invoice ${dto.invoiceId}`);
    return this.dianService.processDebitNote(dto);
  }

  @Post('config/notes')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set note numbering configuration',
    description:
      'Configures prefixes and starting numbers for credit and debit notes.',
  })
  @ApiResponse({ status: 200, description: 'Note configuration updated' })
  async setNoteConfig(@Body() dto: SetNoteConfigDto) {
    this.logger.log('Setting note configuration');
    return this.dianService.setNoteConfig(dto);
  }

  // ============================================================================
  // DOCUMENT LISTING ENDPOINTS
  // ============================================================================

  @Get('documents')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'List DIAN documents',
    description:
      'Returns a paginated list of DIAN documents with optional filters.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DianDocumentStatus })
  @ApiQuery({ name: 'fromDate', required: false, type: Date })
  @ApiQuery({ name: 'toDate', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
    type: PaginatedDianDocumentsEntity,
  })
  async listDocuments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: DianDocumentStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    return this.dianService.listDocuments(
      pageNum,
      limitNum,
      status,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get('documents/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get document details',
    description: 'Returns the details of a specific DIAN document.',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document details',
    type: DianDocumentWithInvoiceEntity,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(@Param('id') id: string) {
    this.logger.log(`Getting document ${id}`);
    return this.dianService.getDocument(id);
  }

  @Get('documents/:id/xml')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Download document XML',
    description: 'Downloads the XML file for a DIAN document.',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'XML file' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadXml(@Param('id') id: string, @Res() res: Response) {
    this.logger.log(`Downloading XML for document ${id}`);
    const { xml, fileName } = await this.dianService.downloadXml(id);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(xml);
  }

  // ============================================================================
  // STATISTICS ENDPOINT
  // ============================================================================

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get DIAN statistics',
    description: 'Returns statistics about electronic invoicing.',
  })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStats() {
    this.logger.log('Getting DIAN stats');
    return this.dianService.getStats();
  }
}
