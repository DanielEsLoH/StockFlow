import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { IntegrationsSyncService } from './sync.service';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  CreateProductMappingDto,
} from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

/**
 * IntegrationsController — REST endpoints for e-commerce integrations.
 *
 * nestjs-best-practices applied:
 * - security-use-guards: JWT + permissions guard on all routes
 * - security-validate-all-input: DTOs with class-validator
 * - api-use-dto-serialization: structured DTOs for all inputs
 * - arch-single-responsibility: delegates to service layer
 */
@ApiTags('integrations')
@ApiBearerAuth('JWT-auth')
@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly syncService: IntegrationsSyncService,
  ) {}

  // ────────────────────── Integration CRUD ──────────────────────

  @Get()
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'List all integrations' })
  @ApiResponse({ status: 200, description: 'Integrations listed' })
  findAll() {
    return this.integrationsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Get integration details' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Integration found' })
  findOne(@Param('id') id: string) {
    return this.integrationsService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Create a new integration' })
  @ApiResponse({ status: 201, description: 'Integration created' })
  create(@Body() dto: CreateIntegrationDto) {
    return this.integrationsService.create(dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Update an integration' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Integration updated' })
  update(@Param('id') id: string, @Body() dto: UpdateIntegrationDto) {
    return this.integrationsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Delete an integration' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Integration deleted' })
  remove(@Param('id') id: string) {
    return this.integrationsService.remove(id);
  }

  @Post(':id/verify')
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Verify integration connection' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Connection status returned' })
  verifyConnection(@Param('id') id: string) {
    return this.integrationsService.verifyConnection(id);
  }

  // ────────────────────── Product Mappings ──────────────────────

  @Get(':id/mappings')
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'List product mappings for an integration' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Mappings listed' })
  findMappings(@Param('id') id: string) {
    return this.integrationsService.findMappings(id);
  }

  @Post(':id/mappings')
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Create a product mapping' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 201, description: 'Mapping created' })
  createMapping(@Param('id') id: string, @Body() dto: CreateProductMappingDto) {
    return this.integrationsService.createMapping(id, dto);
  }

  @Delete(':id/mappings/:mappingId')
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Delete a product mapping' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiParam({ name: 'mappingId', description: 'Mapping ID' })
  @ApiResponse({ status: 200, description: 'Mapping deleted' })
  removeMapping(
    @Param('id') id: string,
    @Param('mappingId') mappingId: string,
  ) {
    return this.integrationsService.removeMapping(id, mappingId);
  }

  // ────────────────────── Sync Operations ──────────────────────

  @Post(':id/sync')
  @RequirePermissions(Permission.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Run all enabled syncs for an integration' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  syncAll(@Param('id') id: string) {
    return this.syncService.syncAll(id);
  }

  @Post(':id/sync/products')
  @RequirePermissions(Permission.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Sync products from external platform' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Product sync completed' })
  syncProducts(@Param('id') id: string) {
    return this.syncService.syncProducts(id);
  }

  @Post(':id/sync/orders')
  @RequirePermissions(Permission.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Sync orders from external platform' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Order sync completed' })
  syncOrders(@Param('id') id: string) {
    return this.syncService.syncOrders(id);
  }

  @Post(':id/sync/inventory')
  @RequirePermissions(Permission.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Push inventory to external platform' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Inventory sync completed' })
  syncInventory(@Param('id') id: string) {
    return this.syncService.syncInventory(id);
  }

  @Get(':id/sync/unmapped')
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({
    summary: 'Get unmapped external products for mapping',
  })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({
    status: 200,
    description: 'Unmapped external products returned',
  })
  getUnmappedProducts(@Param('id') id: string) {
    return this.syncService.getUnmappedProducts(id);
  }

  // ────────────────────── Sync Logs ──────────────────────

  @Get(':id/logs')
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Get sync logs for an integration' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max logs to return (default 20)',
  })
  @ApiResponse({ status: 200, description: 'Sync logs listed' })
  findSyncLogs(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.integrationsService.findSyncLogs(
      id,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
