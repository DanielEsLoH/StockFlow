import { Module } from '@nestjs/common';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersService } from './cost-centers.service';

/**
 * CostCentersModule provee funcionalidad de gestión de centros de costos incluyendo:
 * - Operaciones CRUD de centros de costos
 * - Soporte para clasificación de asientos contables por área/departamento
 *
 * Este módulo depende de:
 * - PrismaModule (global) - para acceso a la base de datos
 * - CommonModule (global) - para TenantContextService
 * - AuthModule - para guards y decoradores (importado a nivel de app)
 *
 * Todos los endpoints están protegidos por JwtAuthGuard y RolesGuard.
 * El aislamiento multi-tenant se aplica a través de TenantContextService.
 */
@Module({
  controllers: [CostCentersController],
  providers: [CostCentersService],
  exports: [CostCentersService],
})
export class CostCentersModule {}
