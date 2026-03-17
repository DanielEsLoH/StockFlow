import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import {
  RequirePermissions,
  PermissionsGuard,
  Permission,
} from '../common';
import { CurrentUser } from '../common/decorators';

interface JwtUser {
  userId: string;
  tenantId: string;
  role: string;
}
import { PhysicalInventoryCountsService } from './physical-inventory-counts.service';
import { CreatePhysicalCountDto } from './dto/create-count.dto';
import { AddCountItemDto, UpdateCountItemDto } from './dto/add-count-item.dto';
import { PhysicalCountStatus } from '@prisma/client';

@ApiTags('physical-inventory-counts')
@ApiBearerAuth('JWT-auth')
@Controller('physical-inventory-counts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PhysicalInventoryCountsController {
  constructor(
    private readonly service: PhysicalInventoryCountsService,
  ) {}

  @Post()
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Crear un nuevo conteo físico de inventario' })
  async create(
    @Body() dto: CreatePhysicalCountDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.create(dto, user.userId);
  }

  @Get()
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Listar conteos físicos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PhysicalCountStatus })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PhysicalCountStatus,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      warehouseId,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Obtener detalle de un conteo físico' })
  @ApiParam({ name: 'id', description: 'ID del conteo' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/items')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Agregar o actualizar ítem en el conteo' })
  @ApiParam({ name: 'id', description: 'ID del conteo' })
  async addItem(
    @Param('id') countId: string,
    @Body() dto: AddCountItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.addItem(countId, dto, user.userId);
  }

  @Put(':id/items/:itemId')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Actualizar cantidad de un ítem contado' })
  @ApiParam({ name: 'id', description: 'ID del conteo' })
  @ApiParam({ name: 'itemId', description: 'ID del ítem' })
  async updateItem(
    @Param('id') countId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCountItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.updateItem(countId, itemId, dto, user.userId);
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar ítem del conteo' })
  @ApiParam({ name: 'id', description: 'ID del conteo' })
  @ApiParam({ name: 'itemId', description: 'ID del ítem' })
  async removeItem(
    @Param('id') countId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.removeItem(countId, itemId);
  }

  @Post(':id/start')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar conteo (DRAFT → IN_PROGRESS)' })
  @ApiParam({ name: 'id', description: 'ID del conteo' })
  async startCount(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.startCount(id, user.userId);
  }

  @Post(':id/complete')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completar conteo y generar ajustes de inventario' })
  @ApiParam({ name: 'id', description: 'ID del conteo' })
  async completeCount(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.completeCount(id, user.userId);
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar conteo' })
  @ApiParam({ name: 'id', description: 'ID del conteo' })
  async cancelCount(@Param('id') id: string) {
    return this.service.cancelCount(id);
  }
}
