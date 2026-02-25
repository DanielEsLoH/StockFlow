import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SupportDocumentsService } from './support-documents.service';
import type {
  SupportDocumentResponse,
  PaginatedSupportDocumentsResponse,
} from './support-documents.service';
import {
  CreateSupportDocumentDto,
  UpdateSupportDocumentDto,
  FilterSupportDocumentsDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles, CurrentUser } from '../common/decorators';
import type { RequestUser } from '../auth/types';

/**
 * SupportDocumentsController handles all endpoints for Documento Soporte Electronico.
 *
 * Support documents are required by DIAN (Colombia) for purchases from
 * non-invoicers (no obligados a facturar).
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List/View: All authenticated roles
 * - Create/Update/Delete/Generate: ADMIN, MANAGER
 */
@ApiTags('support-documents')
@ApiBearerAuth('JWT-auth')
@Controller('support-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportDocumentsController {
  private readonly logger = new Logger(SupportDocumentsController.name);

  constructor(
    private readonly supportDocumentsService: SupportDocumentsService,
  ) {}

  /**
   * Lists all support documents in the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of support documents
   *
   * @example
   * GET /support-documents?page=1&limit=20&status=DRAFT
   */
  @Get()
  @ApiOperation({
    summary: 'List all support documents',
    description:
      'Returns a paginated list of support documents with optional filters for status, supplier, and date range. All authenticated users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of support documents retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() filters: FilterSupportDocumentsDto,
  ): Promise<PaginatedSupportDocumentsResponse> {
    this.logger.log(
      `Listing support documents - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.supportDocumentsService.findAll(filters);
  }

  /**
   * Gets aggregated statistics for all support documents in the tenant.
   *
   * @returns Support document statistics
   *
   * @example
   * GET /support-documents/stats
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get support document statistics',
    description:
      'Returns aggregated statistics for all support documents in the tenant including count by status and total value.',
  })
  @ApiResponse({
    status: 200,
    description: 'Support document statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats() {
    this.logger.log('Getting support document statistics');
    return this.supportDocumentsService.getStats();
  }

  /**
   * Gets a support document by ID.
   * Includes all items, supplier, and user relations.
   *
   * @param id - Support document ID
   * @returns Support document data with all relations
   *
   * @example
   * GET /support-documents/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get support document by ID',
    description:
      'Returns a single support document with all its items, supplier, and user relations. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Support document ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Support document retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Support document not found' })
  async findOne(
    @Param('id') id: string,
  ): Promise<SupportDocumentResponse> {
    this.logger.log(`Getting support document: ${id}`);

    return this.supportDocumentsService.findOne(id);
  }

  /**
   * Creates a new support document in the tenant.
   * Only ADMIN and MANAGER users can create support documents.
   * Generates document number (DS-00001) and calculates totals.
   *
   * @param dto - Support document creation data
   * @param user - Current authenticated user
   * @returns Created support document data
   *
   * @example
   * POST /support-documents
   * {
   *   "supplierName": "Juan Carlos Perez",
   *   "supplierDocument": "1234567890",
   *   "supplierDocType": "CC",
   *   "items": [
   *     {
   *       "description": "Servicio de transporte",
   *       "quantity": 1,
   *       "unitPrice": 150000,
   *       "taxRate": 0
   *     }
   *   ]
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new support document',
    description:
      'Creates a new support document (Documento Soporte) for purchases from non-invoicers. Automatically generates document number and calculates totals. Only ADMIN and MANAGER users can create support documents.',
  })
  @ApiResponse({
    status: 201,
    description: 'Support document created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async create(
    @Body() dto: CreateSupportDocumentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SupportDocumentResponse> {
    this.logger.log(`Creating support document by user ${user.userId}`);

    return this.supportDocumentsService.create(dto, user.userId);
  }

  /**
   * Updates a support document.
   * Only ADMIN and MANAGER users can update support documents.
   * Only DRAFT support documents can be updated.
   *
   * @param id - Support document ID to update
   * @param dto - Update data
   * @returns Updated support document data
   *
   * @example
   * PATCH /support-documents/:id
   * {
   *   "supplierName": "Juan Carlos Perez Rodriguez",
   *   "notes": "Actualizado"
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update a support document',
    description:
      'Updates an existing support document. Only DRAFT documents can be updated. When items are provided, all existing items are replaced. Only ADMIN and MANAGER users can update support documents.',
  })
  @ApiParam({
    name: 'id',
    description: 'Support document ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Support document updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or document is not in DRAFT status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Support document not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupportDocumentDto,
  ): Promise<SupportDocumentResponse> {
    this.logger.log(`Updating support document: ${id}`);

    return this.supportDocumentsService.update(id, dto);
  }

  /**
   * Deletes a support document.
   * Only ADMIN and MANAGER users can delete support documents.
   * Only DRAFT support documents can be deleted.
   *
   * @param id - Support document ID to delete
   *
   * @example
   * DELETE /support-documents/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a support document',
    description:
      'Deletes a DRAFT support document. Only ADMIN and MANAGER users can delete support documents. Only DRAFT documents can be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Support document ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 204,
    description: 'Support document deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Document is not in DRAFT status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Support document not found' })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting support document: ${id}`);

    return this.supportDocumentsService.remove(id);
  }

  /**
   * Generates a support document (DRAFT -> GENERATED).
   * In the future this will produce the DIAN-compliant XML.
   * Only ADMIN and MANAGER users can generate support documents.
   *
   * @param id - Support document ID to generate
   * @returns Updated support document with GENERATED status
   *
   * @example
   * PATCH /support-documents/:id/generate
   */
  @Patch(':id/generate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Generate support document',
    description:
      'Transitions a support document from DRAFT to GENERATED status. Will generate DIAN-compliant XML in the future. Only ADMIN and MANAGER users can generate support documents.',
  })
  @ApiParam({
    name: 'id',
    description: 'Support document ID to generate',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Support document generated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Document is not in DRAFT status or has no items',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Support document not found' })
  async generate(
    @Param('id') id: string,
  ): Promise<SupportDocumentResponse> {
    this.logger.log(`Generating support document: ${id}`);

    return this.supportDocumentsService.generate(id);
  }
}
