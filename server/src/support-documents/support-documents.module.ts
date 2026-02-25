import { Module } from '@nestjs/common';
import { SupportDocumentsController } from './support-documents.controller';
import { SupportDocumentsService } from './support-documents.service';

/**
 * SupportDocumentsModule provides Documento Soporte Electronico management:
 * - Support document CRUD operations
 * - Document status transitions (DRAFT -> GENERATED -> SENT -> ACCEPTED/REJECTED)
 * - Auto-generated document numbers (DS-00001, DS-00002...)
 * - Item-level and aggregate total calculations
 *
 * This module depends on:
 * - PrismaModule (global) - for database access
 * - CommonModule (global) - for TenantContextService
 * - AuthModule - for guards and decorators (imported at app level)
 *
 * All endpoints are protected by JwtAuthGuard and RolesGuard.
 * Multi-tenant isolation is enforced through TenantContextService.
 *
 * Business Rules:
 * - Document numbers are unique per tenant and auto-generated (DS-XXXXX)
 * - Only DRAFT documents can be updated or deleted
 * - DIAN XML generation will be added in a future iteration
 * - Support documents are for purchases from non-invoicers (no obligados a facturar)
 */
@Module({
  controllers: [SupportDocumentsController],
  providers: [SupportDocumentsService],
  exports: [SupportDocumentsService],
})
export class SupportDocumentsModule {}
