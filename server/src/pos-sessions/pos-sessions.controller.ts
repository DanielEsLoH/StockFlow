import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { POSSessionStatus, UserRole } from '@prisma/client';
import { POSSessionsService } from './pos-sessions.service';
import type {
  POSSessionWithDetails,
  PaginatedSessionsResponse,
  XZReport,
  CashMovementResponse,
} from './pos-sessions.service';
import { OpenSessionDto, CloseSessionDto, CashMovementDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { CurrentUser, Roles } from '../common/decorators';
import {
  POSSessionWithDetailsEntity,
  PaginatedSessionsEntity,
  XZReportEntity,
  CashRegisterMovementEntity,
} from './entities/pos-session.entity';

interface JwtUser {
  id: string;
  tenantId: string;
  role: UserRole;
}

/**
 * POSSessionsController handles all POS session operations.
 *
 * All endpoints require JWT authentication.
 * Session operations are scoped to the authenticated user or require manager/admin role.
 */
@ApiTags('pos-sessions')
@ApiBearerAuth('JWT-auth')
@Controller('pos-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class POSSessionsController {
  private readonly logger = new Logger(POSSessionsController.name);

  constructor(private readonly posSessionsService: POSSessionsService) {}

  /**
   * Opens a new POS session for a cash register.
   */
  @Post('open')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Open a new POS session',
    description:
      'Opens a new POS session for a cash register with initial cash amount. Only one active session per cash register is allowed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Session opened successfully',
    type: POSSessionWithDetailsEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cash register not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Cash register already has an active session',
  })
  async openSession(
    @Body() dto: OpenSessionDto,
    @CurrentUser() user: JwtUser,
  ): Promise<POSSessionWithDetails> {
    this.logger.log(`Opening session for cash register: ${dto.cashRegisterId}`);
    return this.posSessionsService.openSession(dto, user.id);
  }

  /**
   * Closes an active POS session with cash count.
   */
  @Post(':id/close')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close a POS session',
    description:
      'Closes an active POS session with physical cash count (arqueo). Calculates difference between expected and declared amounts.',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID to close',
  })
  @ApiResponse({
    status: 200,
    description: 'Session closed successfully',
    type: POSSessionWithDetailsEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Session not active' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not session owner or manager',
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async closeSession(
    @Param('id') id: string,
    @Body() dto: CloseSessionDto,
    @CurrentUser() user: JwtUser,
  ): Promise<POSSessionWithDetails> {
    this.logger.log(`Closing session: ${id}`);
    return this.posSessionsService.closeSession(id, dto, user.id);
  }

  /**
   * Registers a cash in/out movement.
   */
  @Post(':id/cash-movement')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register cash movement',
    description:
      'Registers a cash in (ingreso) or cash out (retiro) movement in an active session.',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Movement registered successfully',
    type: CashRegisterMovementEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Session not active' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async registerCashMovement(
    @Param('id') id: string,
    @Body() dto: CashMovementDto,
    @CurrentUser() user: JwtUser,
  ): Promise<CashMovementResponse> {
    this.logger.log(`Registering cash movement for session: ${id}`);
    return this.posSessionsService.registerCashMovement(id, dto, user.id);
  }

  /**
   * Gets the current active session for the user.
   */
  @Get('current')
  @ApiOperation({
    summary: 'Get current active session',
    description:
      'Returns the current active session for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current session or null if none active',
    type: POSSessionWithDetailsEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentSession(
    @CurrentUser() user: JwtUser,
  ): Promise<POSSessionWithDetails | null> {
    this.logger.log(`Getting current session for user: ${user.id}`);
    return this.posSessionsService.getCurrentSession(user.id);
  }

  /**
   * Lists sessions with pagination and filters.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'List POS sessions',
    description:
      'Returns a paginated list of POS sessions with optional filters. Only managers and admins can view all sessions.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cashRegisterId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: POSSessionStatus })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: Date })
  @ApiQuery({ name: 'toDate', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'List of sessions',
    type: PaginatedSessionsEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cashRegisterId') cashRegisterId?: string,
    @Query('status') status?: POSSessionStatus,
    @Query('userId') userId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<PaginatedSessionsResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(`Listing sessions - page: ${pageNum}, limit: ${limitNum}`);

    return this.posSessionsService.findAll(
      pageNum,
      limitNum,
      cashRegisterId,
      status,
      userId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  /**
   * Gets a session by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get session by ID',
    description: 'Returns a single session with full details.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details',
    type: POSSessionWithDetailsEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOne(@Param('id') id: string): Promise<POSSessionWithDetails> {
    this.logger.log(`Getting session: ${id}`);
    return this.posSessionsService.findOne(id);
  }

  /**
   * Gets session movements.
   */
  @Get(':id/movements')
  @ApiOperation({
    summary: 'Get session movements',
    description: 'Returns all cash movements for a session.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'List of movements',
    type: [CashRegisterMovementEntity],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getMovements(@Param('id') id: string): Promise<CashMovementResponse[]> {
    this.logger.log(`Getting movements for session: ${id}`);
    return this.posSessionsService.getSessionMovements(id);
  }

  /**
   * Generates X report (intraday).
   */
  @Get(':id/x-report')
  @ApiOperation({
    summary: 'Generate X report',
    description:
      'Generates an X report (intraday report) without closing the session.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'X report generated',
    type: XZReportEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async generateXReport(@Param('id') id: string): Promise<XZReport> {
    this.logger.log(`Generating X report for session: ${id}`);
    return this.posSessionsService.generateXReport(id);
  }

  /**
   * Generates Z report (closing).
   */
  @Get(':id/z-report')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Generate Z report',
    description:
      'Generates a Z report (closing report) for a closed session. Only managers and admins can access this.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Z report generated',
    type: XZReportEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Session must be closed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async generateZReport(@Param('id') id: string): Promise<XZReport> {
    this.logger.log(`Generating Z report for session: ${id}`);
    return this.posSessionsService.generateZReport(id);
  }
}
