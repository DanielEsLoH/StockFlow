import {
  Controller,
  Get,
  Post,
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
import { WithholdingCertificatesService } from './withholding-certificates.service';
import {
  FilterWithholdingCertificatesDto,
  GenerateCertificateDto,
  GenerateAllCertificatesDto,
} from './dto';
import {
  WithholdingCertificateEntity,
  PaginatedWithholdingCertificatesEntity,
  WithholdingCertificateStatsEntity,
} from './entities/withholding-certificate.entity';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

/**
 * WithholdingCertificatesController handles all endpoints for managing
 * annual withholding certificates (Certificados de Retencion).
 *
 * All endpoints require JWT authentication and ADMIN role.
 * Certificates are generated from RECEIVED purchase order data
 * for a given supplier, year, and withholding type.
 */
@ApiTags('withholding-certificates')
@ApiBearerAuth('JWT-auth')
@Controller('withholding-certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class WithholdingCertificatesController {
  private readonly logger = new Logger(WithholdingCertificatesController.name);

  constructor(
    private readonly withholdingCertificatesService: WithholdingCertificatesService,
  ) {}

  /**
   * Lists all withholding certificates in the current tenant with
   * optional filters for year, supplier, and withholding type.
   *
   * @param query - Filter and pagination parameters
   * @returns Paginated list of withholding certificates
   *
   * @example
   * GET /withholding-certificates?year=2025&withholdingType=RENTA&page=1&limit=20
   */
  @Get()
  @ApiOperation({
    summary: 'Listar certificados de retencion',
    description:
      'Retorna una lista paginada de certificados de retencion con filtros opcionales por ano, proveedor y tipo de retencion.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de certificados de retencion obtenida exitosamente',
    type: PaginatedWithholdingCertificatesEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Se requiere rol ADMIN',
  })
  async findAll(
    @Query() query: FilterWithholdingCertificatesDto,
  ): Promise<PaginatedWithholdingCertificatesEntity> {
    this.logger.log(
      `Listando certificados de retencion - pagina: ${query.page ?? 1}, limite: ${query.limit ?? 10}`,
    );

    return this.withholdingCertificatesService.findAll(query);
  }

  /**
   * Gets aggregated statistics for withholding certificates in a given year.
   *
   * @param year - Fiscal year
   * @returns Statistics including totals and breakdown by type
   *
   * @example
   * GET /withholding-certificates/stats?year=2025
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadisticas de certificados de retencion',
    description:
      'Retorna estadisticas agregadas de certificados de retencion por ano, incluyendo totales y desglose por tipo.',
  })
  @ApiQuery({
    name: 'year',
    description: 'Ano fiscal para las estadisticas',
    example: 2025,
    type: Number,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Estadisticas obtenidas exitosamente',
    type: WithholdingCertificateStatsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Se requiere rol ADMIN',
  })
  async getStats(
    @Query('year') year: number,
  ): Promise<WithholdingCertificateStatsEntity> {
    this.logger.log(`Obteniendo estadisticas de certificados, ano: ${year}`);

    return this.withholdingCertificatesService.getStats(Number(year));
  }

  /**
   * Gets a withholding certificate by ID.
   * Includes supplier information.
   *
   * @param id - Certificate ID
   * @returns Certificate data with supplier info
   *
   * @example
   * GET /withholding-certificates/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener certificado de retencion por ID',
    description:
      'Retorna un certificado de retencion con la informacion del proveedor.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del certificado de retencion (formato CUID)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificado de retencion obtenido exitosamente',
    type: WithholdingCertificateEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Se requiere rol ADMIN',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificado de retencion no encontrado',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<WithholdingCertificateEntity> {
    this.logger.log(`Obteniendo certificado de retencion: ${id}`);

    return this.withholdingCertificatesService.findOne(id);
  }

  /**
   * Generates a withholding certificate for a specific supplier, year, and type.
   * If a certificate already exists for the same supplier/year/type, it is updated.
   *
   * @param dto - Generation parameters
   * @returns Generated or updated certificate
   *
   * @example
   * POST /withholding-certificates/generate
   * { "supplierId": "...", "year": 2025, "withholdingType": "RENTA" }
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generar certificado de retencion para un proveedor',
    description:
      'Genera un certificado de retencion basado en las ordenes de compra recibidas del proveedor en el ano indicado. Si ya existe un certificado para la misma combinacion proveedor/ano/tipo, se actualiza con los valores recalculados.',
  })
  @ApiResponse({
    status: 201,
    description: 'Certificado de retencion generado exitosamente',
    type: WithholdingCertificateEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud invalida - No se encontraron ordenes de compra para el periodo',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Se requiere rol ADMIN',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  async generate(
    @Body() dto: GenerateCertificateDto,
  ): Promise<WithholdingCertificateEntity> {
    this.logger.log(
      `Generando certificado: proveedor ${dto.supplierId}, ano ${dto.year}, tipo ${dto.withholdingType}`,
    );

    return this.withholdingCertificatesService.generate(dto);
  }

  /**
   * Generates withholding certificates for ALL suppliers that had RECEIVED
   * purchase orders in the given year. Skips suppliers that fail.
   *
   * @param dto - Year and optional withholding type
   * @returns Summary of generated certificates
   *
   * @example
   * POST /withholding-certificates/generate-all
   * { "year": 2025, "withholdingType": "RENTA" }
   */
  @Post('generate-all')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generar certificados de retencion para todos los proveedores',
    description:
      'Genera certificados de retencion para todos los proveedores que tuvieron ordenes de compra recibidas en el ano indicado. Si un proveedor falla, se continua con los demas.',
  })
  @ApiResponse({
    status: 201,
    description: 'Certificados generados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Se requiere rol ADMIN',
  })
  async generateAll(
    @Body() dto: GenerateAllCertificatesDto,
  ) {
    this.logger.log(
      `Generando certificados masivos: ano ${dto.year}, tipo ${dto.withholdingType ?? 'RENTA'}`,
    );

    return this.withholdingCertificatesService.generateAll(dto);
  }

  /**
   * Deletes a withholding certificate.
   *
   * @param id - Certificate ID to delete
   *
   * @example
   * DELETE /withholding-certificates/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar certificado de retencion',
    description: 'Elimina un certificado de retencion del tenant actual.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del certificado de retencion a eliminar',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 204,
    description: 'Certificado de retencion eliminado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT invalido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Se requiere rol ADMIN',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificado de retencion no encontrado',
  })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Eliminando certificado de retencion: ${id}`);

    return this.withholdingCertificatesService.remove(id);
  }
}
