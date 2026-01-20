import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
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
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
import type {
  PaginatedAuditLogsResponse,
  AuditStatsResponse,
} from './audit-logs.service';
import { QueryAuditLogsDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles, CurrentUser } from '../common/decorators';
import type { RequestUser } from '../auth/types';
import {
  PaginatedAuditLogsEntity,
  AuditStatsEntity,
  AuditCleanupResponseEntity,
} from './entities/audit-log.entity';

/**
 * AuditLogsController handles all audit log endpoints.
 *
 * All endpoints require JWT authentication and respect tenant isolation.
 * Most endpoints are restricted to ADMIN and MANAGER roles.
 *
 * Endpoints:
 * - GET /audit-logs - List audit logs with filters (ADMIN, MANAGER)
 * - GET /audit-logs/stats - Get audit statistics (ADMIN, MANAGER)
 * - GET /audit-logs/entity/:entityType/:entityId - Get entity history (ADMIN, MANAGER)
 * - GET /audit-logs/user/:userId - Get user activity (ADMIN, MANAGER)
 * - DELETE /audit-logs/cleanup - Cleanup old logs (ADMIN only)
 */
@ApiTags('audit-logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  private readonly logger = new Logger(AuditLogsController.name);

  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * Lists all audit logs for the current tenant with filters.
   *
   * @param user - The authenticated user
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of audit logs
   *
   * @example
   * GET /audit-logs?page=1&limit=20&action=CREATE&entityType=Product
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'List audit logs',
    description:
      'Returns a paginated list of audit logs with optional filters for action, entity type, user, and date range. Only ADMIN and MANAGER users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    type: PaginatedAuditLogsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: QueryAuditLogsDto,
  ): Promise<PaginatedAuditLogsResponse> {
    this.logger.log(
      `Listing audit logs - tenant: ${user.tenantId}, page: ${query.page ?? 1}, limit: ${query.limit ?? 20}`,
    );

    return this.auditLogsService.findAll(user.tenantId, query);
  }

  /**
   * Gets audit statistics for the current tenant.
   *
   * @param user - The authenticated user
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   * @returns Audit statistics
   *
   * @example
   * GET /audit-logs/stats?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get audit statistics',
    description:
      'Returns audit statistics including counts by action type, entity type, and unique users. Can optionally filter by date range. Only ADMIN and MANAGER users can access this endpoint.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (ISO format)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (ISO format)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit statistics retrieved successfully',
    type: AuditStatsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getStats(
    @CurrentUser() user: RequestUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditStatsResponse> {
    this.logger.log(`Getting audit stats for tenant: ${user.tenantId}`);

    return this.auditLogsService.getStats(user.tenantId, {
      startDate,
      endDate,
    });
  }

  /**
   * Gets the audit history for a specific entity.
   *
   * @param user - The authenticated user
   * @param entityType - The entity type (e.g., 'Product', 'User')
   * @param entityId - The entity's ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated list of audit logs for the entity
   *
   * @example
   * GET /audit-logs/entity/Product/abc123?page=1&limit=20
   */
  @Get('entity/:entityType/:entityId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get entity audit history',
    description:
      'Returns the audit history for a specific entity. Useful for tracking all changes made to a particular record. Only ADMIN and MANAGER users can access this endpoint.',
  })
  @ApiParam({
    name: 'entityType',
    description: 'Entity type (e.g., Product, User, Invoice)',
    example: 'Product',
  })
  @ApiParam({
    name: 'entityId',
    description: 'Entity ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Entity audit history retrieved successfully',
    type: PaginatedAuditLogsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findByEntity(
    @CurrentUser() user: RequestUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedAuditLogsResponse> {
    const parsedPage = parseInt(page ?? '1', 10);
    const parsedLimit = parseInt(limit ?? '20', 10);
    const pageNum = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
    const limitNum = Math.min(
      100,
      Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit),
    );

    this.logger.log(
      `Getting audit history for ${entityType} ${entityId} - tenant: ${user.tenantId}`,
    );

    return this.auditLogsService.findByEntity(
      user.tenantId,
      entityType,
      entityId,
      pageNum,
      limitNum,
    );
  }

  /**
   * Gets all audit logs for a specific user's actions.
   *
   * @param user - The authenticated user
   * @param userId - The user's ID to query
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated list of audit logs by the user
   *
   * @example
   * GET /audit-logs/user/user123?page=1&limit=20
   */
  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get user activity logs',
    description:
      'Returns all audit logs for a specific user actions. Useful for tracking user activity and changes. Only ADMIN and MANAGER users can access this endpoint.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to query (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'User activity logs retrieved successfully',
    type: PaginatedAuditLogsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findByUser(
    @CurrentUser() user: RequestUser,
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedAuditLogsResponse> {
    const parsedPage = parseInt(page ?? '1', 10);
    const parsedLimit = parseInt(limit ?? '20', 10);
    const pageNum = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
    const limitNum = Math.min(
      100,
      Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit),
    );

    this.logger.log(
      `Getting audit logs for user ${userId} - tenant: ${user.tenantId}`,
    );

    return this.auditLogsService.findByUser(
      user.tenantId,
      userId,
      pageNum,
      limitNum,
    );
  }

  /**
   * Deletes old audit logs based on retention policy.
   * Only ADMIN users can perform this operation.
   *
   * @param user - The authenticated user
   * @param days - Number of days to retain (delete logs older than this)
   * @returns Count of deleted records
   *
   * @example
   * DELETE /audit-logs/cleanup?days=90
   */
  @Delete('cleanup')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cleanup old audit logs',
    description:
      'Deletes audit logs older than the specified number of days. Useful for data retention compliance. Only ADMIN users can perform this operation.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description:
      'Number of days to retain (delete logs older than this, default: 90, min: 1)',
    example: 90,
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs cleaned up successfully',
    type: AuditCleanupResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid days parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async cleanup(
    @CurrentUser() user: RequestUser,
    @Query('days') days?: string,
  ): Promise<{ deleted: number }> {
    const daysNum = parseInt(days ?? '90', 10);

    if (isNaN(daysNum) || daysNum < 1) {
      throw new BadRequestException(
        'Days must be a positive integer. Minimum retention is 1 day.',
      );
    }

    const olderThan = new Date();
    olderThan.setDate(olderThan.getDate() - daysNum);

    this.logger.log(
      `Cleaning up audit logs older than ${daysNum} days for tenant: ${user.tenantId}`,
    );

    const deleted = await this.auditLogsService.cleanup(
      user.tenantId,
      olderThan,
    );

    return { deleted };
  }
}
