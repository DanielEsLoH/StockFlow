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
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CostCentersService } from './cost-centers.service';
import type {
  CostCenterResponse,
  CostCenterOptionResponse,
} from './cost-centers.service';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

/**
 * CostCentersController maneja todos los endpoints de gestión de centros de costos.
 *
 * Todos los endpoints requieren autenticación JWT.
 * El acceso basado en roles se aplica por endpoint:
 * - Listar centros de costos: ADMIN, MANAGER, EMPLOYEE
 * - Opciones para dropdown: ADMIN, MANAGER, EMPLOYEE
 * - Ver centro de costos: ADMIN, MANAGER
 * - Crear centro de costos: ADMIN
 * - Actualizar centro de costos: ADMIN
 * - Eliminar centro de costos: ADMIN
 */
@ApiTags('cost-centers')
@ApiBearerAuth('JWT-auth')
@Controller('cost-centers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CostCentersController {
  private readonly logger = new Logger(CostCentersController.name);

  constructor(private readonly costCentersService: CostCentersService) {}

  /**
   * Lista todos los centros de costos del tenant actual.
   * Soporta búsqueda por nombre o código.
   *
   * @param search - Consulta de búsqueda opcional
   * @returns Lista de centros de costos
   *
   * @example
   * GET /cost-centers
   * GET /cost-centers?search=admin
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({
    summary: 'Listar todos los centros de costos',
    description:
      'Retorna una lista de todos los centros de costos del tenant actual. Soporta búsqueda por nombre o código. Accesible para ADMIN, MANAGER y EMPLOYEE.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Búsqueda por nombre o código del centro de costos',
    example: 'Administración',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de centros de costos obtenida exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Permisos insuficientes',
  })
  async findAll(
    @Query('search') search?: string,
  ): Promise<CostCenterResponse[]> {
    const searchQuery = search?.trim() || undefined;

    this.logger.log(
      `Listing cost centers - search: "${searchQuery ?? ''}"`,
    );

    return this.costCentersService.findAll(searchQuery);
  }

  /**
   * Retorna opciones simplificadas de centros de costos para uso en dropdowns.
   * Solo incluye centros de costos activos con id, código y nombre.
   *
   * @returns Lista de opciones de centros de costos
   *
   * @example
   * GET /cost-centers/options
   */
  @Get('options')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({
    summary: 'Obtener opciones de centros de costos para dropdowns',
    description:
      'Retorna una lista simplificada de centros de costos activos (id, código, nombre) para uso en formularios y selectores. Accesible para todos los roles autenticados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Opciones de centros de costos obtenidas exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  async getOptions(): Promise<CostCenterOptionResponse[]> {
    this.logger.log('Getting cost center options');
    return this.costCentersService.getOptions();
  }

  /**
   * Obtiene un centro de costos por ID.
   * Incluye el conteo de líneas de asiento contable asociadas.
   *
   * @param id - ID del centro de costos
   * @returns Datos del centro de costos con estadísticas de uso
   *
   * @example
   * GET /cost-centers/:id
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Obtener centro de costos por ID',
    description:
      'Retorna un centro de costos por su ID, incluyendo estadísticas de uso (conteo de líneas de asiento contable). Accesible para ADMIN y MANAGER.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del centro de costos (formato CUID)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Centro de costos obtenido exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Permisos insuficientes',
  })
  @ApiResponse({ status: 404, description: 'Centro de costos no encontrado' })
  async findOne(@Param('id') id: string): Promise<CostCenterResponse> {
    this.logger.log(`Getting cost center: ${id}`);

    return this.costCentersService.findOne(id);
  }

  /**
   * Crea un nuevo centro de costos en el tenant.
   * Solo usuarios ADMIN pueden crear centros de costos.
   *
   * @param dto - Datos de creación del centro de costos
   * @returns Datos del centro de costos creado
   *
   * @example
   * POST /cost-centers
   * {
   *   "code": "CC-001",
   *   "name": "Administración",
   *   "description": "Centro de costos para gastos administrativos"
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo centro de costos',
    description:
      'Crea un nuevo centro de costos en el tenant actual. Solo usuarios ADMIN pueden crear centros de costos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Centro de costos creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud inválida - Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Permisos insuficientes',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El código del centro de costos ya existe',
  })
  async create(
    @Body() dto: CreateCostCenterDto,
  ): Promise<CostCenterResponse> {
    this.logger.log(`Creating cost center: ${dto.code} - ${dto.name}`);
    return this.costCentersService.create(dto);
  }

  /**
   * Actualiza un centro de costos existente.
   * Solo usuarios ADMIN pueden actualizar centros de costos.
   *
   * @param id - ID del centro de costos a actualizar
   * @param dto - Datos de actualización
   * @returns Datos del centro de costos actualizado
   *
   * @example
   * PATCH /cost-centers/:id
   * {
   *   "name": "Administración General",
   *   "isActive": false
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar un centro de costos',
    description:
      'Actualiza un centro de costos existente. Solo usuarios ADMIN pueden actualizar centros de costos.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del centro de costos a actualizar',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Centro de costos actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud inválida - Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Permisos insuficientes',
  })
  @ApiResponse({ status: 404, description: 'Centro de costos no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El código del centro de costos ya existe',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
  ): Promise<CostCenterResponse> {
    this.logger.log(`Updating cost center: ${id}`);
    return this.costCentersService.update(id, dto);
  }

  /**
   * Elimina un centro de costos.
   * Solo usuarios ADMIN pueden eliminar centros de costos.
   * La eliminación falla si el centro de costos tiene líneas de asiento contable asociadas.
   *
   * @param id - ID del centro de costos a eliminar
   *
   * @example
   * DELETE /cost-centers/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un centro de costos',
    description:
      'Elimina un centro de costos. Solo usuarios ADMIN pueden eliminar centros de costos. La eliminación falla si tiene líneas de asiento contable asociadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del centro de costos a eliminar',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 204,
    description: 'Centro de costos eliminado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Solicitud inválida - El centro de costos tiene líneas de asiento contable asociadas',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Permisos insuficientes',
  })
  @ApiResponse({ status: 404, description: 'Centro de costos no encontrado' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting cost center: ${id}`);
    return this.costCentersService.remove(id);
  }
}
