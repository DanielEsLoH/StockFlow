import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CollectionRemindersService } from './collection-reminders.service';
import type {
  CollectionReminderResponse,
  PaginatedRemindersResponse,
  ReminderStats,
  CollectionDashboard,
  OverdueInvoiceInfo,
} from './collection-reminders.service';
import {
  CreateCollectionReminderDto,
  FilterCollectionRemindersDto,
  MarkFailedDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

/**
 * CollectionRemindersController handles all collection reminder endpoints.
 *
 * All endpoints require JWT authentication and ADMIN or MANAGER role.
 *
 * Endpoints:
 * - GET /collection-reminders - List with filters
 * - GET /collection-reminders/stats - Statistics
 * - GET /collection-reminders/dashboard - Dashboard summary
 * - GET /collection-reminders/overdue-invoices - Overdue invoices list
 * - GET /collection-reminders/:id - Detail
 * - POST /collection-reminders - Create manual reminder
 * - POST /collection-reminders/generate - Generate auto reminders
 * - PATCH /collection-reminders/:id/cancel - Cancel
 * - PATCH /collection-reminders/:id/mark-sent - Mark as sent
 * - PATCH /collection-reminders/:id/mark-failed - Mark as failed
 */
@ApiTags('collection-reminders')
@ApiBearerAuth('JWT-auth')
@Controller('collection-reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class CollectionRemindersController {
  private readonly logger = new Logger(CollectionRemindersController.name);

  constructor(
    private readonly collectionRemindersService: CollectionRemindersService,
  ) {}

  /**
   * Lists all collection reminders with filtering and pagination.
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of reminders
   */
  @Get()
  @ApiOperation({
    summary: 'Listar recordatorios de cobranza',
    description:
      'Retorna una lista paginada de recordatorios de cobranza con filtros opcionales por estado, tipo, canal, factura, cliente y rango de fechas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de recordatorios obtenida exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Permisos insuficientes',
  })
  async findAll(
    @Query() filters: FilterCollectionRemindersDto,
  ): Promise<PaginatedRemindersResponse> {
    this.logger.log(
      `Listing reminders - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.collectionRemindersService.findAll(filters);
  }

  /**
   * Gets aggregated statistics for reminders by status and type.
   *
   * @returns Reminder statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadisticas de recordatorios',
    description:
      'Retorna conteos de recordatorios agrupados por estado (PENDING, SENT, FAILED, CANCELLED) y por tipo (BEFORE_DUE, ON_DUE, AFTER_DUE, MANUAL).',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadisticas obtenidas exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  async getStats(): Promise<ReminderStats> {
    this.logger.log('Getting reminder statistics');
    return this.collectionRemindersService.getStats();
  }

  /**
   * Gets the collection dashboard summary for the current tenant.
   *
   * @returns Dashboard with overdue amounts, invoice counts, and reminder counts
   */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Obtener dashboard de cobranza',
    description:
      'Retorna un resumen del estado de cobranza del tenant: monto total vencido, cantidad de facturas vencidas, recordatorios pendientes, enviados y fallidos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard obtenido exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  async getDashboard(): Promise<CollectionDashboard> {
    this.logger.log('Getting collection dashboard');
    return this.collectionRemindersService.getDashboard();
  }

  /**
   * Gets overdue invoices that may need collection reminders.
   *
   * @returns List of overdue invoices with last reminder info
   */
  @Get('overdue-invoices')
  @ApiOperation({
    summary: 'Listar facturas vencidas',
    description:
      'Retorna facturas vencidas (SENT u OVERDUE, no pagadas) con informacion sobre el ultimo recordatorio enviado. Util para identificar facturas que necesitan seguimiento de cobranza.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de facturas vencidas obtenida exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  async getOverdueInvoices(): Promise<OverdueInvoiceInfo[]> {
    this.logger.log('Getting overdue invoices');
    return this.collectionRemindersService.getOverdueInvoices();
  }

  /**
   * Gets a single reminder by ID with invoice and customer details.
   *
   * @param id - Reminder ID
   * @returns Reminder detail with relations
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de recordatorio',
    description:
      'Retorna un recordatorio de cobranza con su factura y cliente asociados.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del recordatorio (formato CUID)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Recordatorio obtenido exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  @ApiResponse({ status: 404, description: 'Recordatorio no encontrado' })
  async findOne(
    @Param('id') id: string,
  ): Promise<CollectionReminderResponse> {
    this.logger.log(`Getting reminder: ${id}`);
    return this.collectionRemindersService.findOne(id);
  }

  /**
   * Creates a manual collection reminder for a specific invoice.
   *
   * @param dto - Reminder creation data
   * @returns Created reminder
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear recordatorio manual',
    description:
      'Crea un recordatorio de cobranza manual para una factura especifica. El tipo sera MANUAL. Si no se proporciona customerId, se infiere de la factura.',
  })
  @ApiResponse({
    status: 201,
    description: 'Recordatorio creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud invalida - Datos de entrada incorrectos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Permisos insuficientes',
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  async create(
    @Body() dto: CreateCollectionReminderDto,
  ): Promise<CollectionReminderResponse> {
    this.logger.log(`Creating manual reminder for invoice ${dto.invoiceId}`);
    return this.collectionRemindersService.create(dto);
  }

  /**
   * Generates automatic reminders for all overdue and upcoming invoices.
   *
   * @returns Count of reminders generated
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generar recordatorios automaticos',
    description:
      'Escanea todas las facturas vencidas y proximas a vencer del tenant y genera recordatorios automaticos segun el calendario predefinido: -3 dias (BEFORE_DUE), 0 dias (ON_DUE), +7, +15, +30 dias (AFTER_DUE). No duplica recordatorios ya existentes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recordatorios generados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Permisos insuficientes',
  })
  async generate(): Promise<{ generated: number }> {
    this.logger.log('Generating auto reminders');
    return this.collectionRemindersService.generateAutoReminders();
  }

  /**
   * Cancels a pending reminder.
   *
   * @param id - Reminder ID
   * @returns Updated reminder
   */
  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar recordatorio',
    description:
      'Cancela un recordatorio pendiente. Solo se pueden cancelar recordatorios con estado PENDING.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del recordatorio a cancelar',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Recordatorio cancelado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden cancelar recordatorios pendientes',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  @ApiResponse({ status: 404, description: 'Recordatorio no encontrado' })
  async cancel(
    @Param('id') id: string,
  ): Promise<CollectionReminderResponse> {
    this.logger.log(`Cancelling reminder: ${id}`);
    return this.collectionRemindersService.cancel(id);
  }

  /**
   * Marks a pending reminder as sent.
   *
   * @param id - Reminder ID
   * @returns Updated reminder
   */
  @Patch(':id/mark-sent')
  @ApiOperation({
    summary: 'Marcar recordatorio como enviado',
    description:
      'Marca un recordatorio pendiente como enviado y registra la fecha de envio. Solo se pueden marcar como enviados recordatorios con estado PENDING.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del recordatorio a marcar como enviado',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Recordatorio marcado como enviado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden marcar como enviados recordatorios pendientes',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  @ApiResponse({ status: 404, description: 'Recordatorio no encontrado' })
  async markSent(
    @Param('id') id: string,
  ): Promise<CollectionReminderResponse> {
    this.logger.log(`Marking reminder as sent: ${id}`);
    return this.collectionRemindersService.markSent(id);
  }

  /**
   * Marks a pending reminder as failed with optional failure notes.
   *
   * @param id - Reminder ID
   * @param dto - Optional failure notes
   * @returns Updated reminder
   */
  @Patch(':id/mark-failed')
  @ApiOperation({
    summary: 'Marcar recordatorio como fallido',
    description:
      'Marca un recordatorio pendiente como fallido. Opcionalmente incluye notas explicando la razon del fallo. Solo se pueden marcar como fallidos recordatorios con estado PENDING.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del recordatorio a marcar como fallido',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Recordatorio marcado como fallido exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden marcar como fallidos recordatorios pendientes',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o faltante',
  })
  @ApiResponse({ status: 404, description: 'Recordatorio no encontrado' })
  async markFailed(
    @Param('id') id: string,
    @Body() dto: MarkFailedDto,
  ): Promise<CollectionReminderResponse> {
    this.logger.log(`Marking reminder as failed: ${id}`);
    return this.collectionRemindersService.markFailed(id, dto.notes);
  }
}
