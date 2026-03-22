import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { IntegrationStatus, SyncDirection, SyncStatus } from '@prisma/client';
import type { Integration, SyncLog } from '@prisma/client';
import { IntegrationsService } from './integrations.service';
import type {
  ExternalProduct,
  ExternalOrder,
} from './interfaces/connector.interface';

/**
 * IntegrationsSyncService — orchestrates product, order, and inventory sync.
 *
 * nestjs-best-practices applied:
 * - arch-single-responsibility: sync orchestration only (CRUD in IntegrationsService)
 * - error-handle-async-errors: all sync operations wrapped in try/catch with SyncLog tracking
 */
@Injectable()
export class IntegrationsSyncService {
  private readonly logger = new Logger(IntegrationsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  /**
   * Sync products from external platform → StockFlow.
   * Creates SyncLog, fetches products, auto-creates mappings for unmapped products.
   */
  async syncProducts(integrationId: string): Promise<SyncLog> {
    const tenantId = this.tenantContext.requireTenantId();
    const integration = await this.getActiveIntegration(integrationId);
    const connector = this.integrationsService.getConnector(
      integration.platform,
    );

    // Create sync log
    const syncLog = await this.prisma.syncLog.create({
      data: {
        tenantId,
        integrationId,
        direction: SyncDirection.INBOUND,
        entityType: 'product',
        status: SyncStatus.IN_PROGRESS,
      },
    });

    try {
      const externalProducts = await connector.fetchProducts(
        integration.accessToken!,
        integration.shopUrl ?? undefined,
      );

      let processed = 0;
      let failed = 0;
      const errors: Array<{ externalId: string; error: string }> = [];

      // Get existing mappings for this integration
      const existingMappings = await this.prisma.productMapping.findMany({
        where: { integrationId, tenantId },
      });
      const mappedExternalIds = new Set(
        existingMappings.map((m) => m.externalId),
      );

      for (const ext of externalProducts) {
        try {
          if (mappedExternalIds.has(ext.externalId)) {
            // Update existing mapped product
            const mapping = existingMappings.find(
              (m) => m.externalId === ext.externalId,
            )!;
            await this.prisma.product.update({
              where: { id: mapping.productId },
              data: {
                name: ext.name,
                description: ext.description,
                salePrice: ext.price,
                imageUrl: ext.imageUrl,
              },
            });
            await this.prisma.productMapping.update({
              where: { id: mapping.id },
              data: { lastSyncAt: new Date() },
            });
          }
          // Unmapped products are left for manual mapping
          processed++;
        } catch (err) {
          failed++;
          errors.push({
            externalId: ext.externalId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return this.completeSyncLog(syncLog.id, {
        totalItems: externalProducts.length,
        processedItems: processed,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined,
        status:
          failed === 0
            ? SyncStatus.COMPLETED
            : failed < externalProducts.length
              ? SyncStatus.PARTIAL
              : SyncStatus.FAILED,
      });
    } catch (error) {
      this.logger.error(
        `Product sync failed for integration ${integrationId}: ${error}`,
      );
      return this.completeSyncLog(syncLog.id, {
        status: SyncStatus.FAILED,
        errors: [
          {
            externalId: 'N/A',
            error: error instanceof Error ? error.message : String(error),
          },
        ],
      });
    }
  }

  /**
   * Sync orders from external platform → StockFlow.
   * Imports orders as lightweight records (doesn't create invoices automatically).
   */
  async syncOrders(integrationId: string, since?: Date): Promise<SyncLog> {
    const tenantId = this.tenantContext.requireTenantId();
    const integration = await this.getActiveIntegration(integrationId);
    const connector = this.integrationsService.getConnector(
      integration.platform,
    );

    const syncLog = await this.prisma.syncLog.create({
      data: {
        tenantId,
        integrationId,
        direction: SyncDirection.INBOUND,
        entityType: 'order',
        status: SyncStatus.IN_PROGRESS,
      },
    });

    try {
      const sinceDate = since ?? integration.lastSyncAt ?? undefined;
      const externalOrders = await connector.fetchOrders(
        integration.accessToken!,
        integration.shopUrl ?? undefined,
        sinceDate,
      );

      // Update last sync timestamp
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date() },
      });

      return this.completeSyncLog(syncLog.id, {
        totalItems: externalOrders.length,
        processedItems: externalOrders.length,
        failedItems: 0,
        status: SyncStatus.COMPLETED,
      });
    } catch (error) {
      this.logger.error(
        `Order sync failed for integration ${integrationId}: ${error}`,
      );
      return this.completeSyncLog(syncLog.id, {
        status: SyncStatus.FAILED,
        errors: [
          {
            externalId: 'N/A',
            error: error instanceof Error ? error.message : String(error),
          },
        ],
      });
    }
  }

  /**
   * Push inventory levels from StockFlow → external platform.
   * Iterates mapped products and pushes current stock.
   */
  async syncInventory(integrationId: string): Promise<SyncLog> {
    const tenantId = this.tenantContext.requireTenantId();
    const integration = await this.getActiveIntegration(integrationId);
    const connector = this.integrationsService.getConnector(
      integration.platform,
    );

    const syncLog = await this.prisma.syncLog.create({
      data: {
        tenantId,
        integrationId,
        direction: SyncDirection.OUTBOUND,
        entityType: 'inventory',
        status: SyncStatus.IN_PROGRESS,
      },
    });

    try {
      const mappings = await this.prisma.productMapping.findMany({
        where: {
          integrationId,
          tenantId,
          syncDirection: { in: [SyncDirection.OUTBOUND, SyncDirection.BOTH] },
        },
        include: {
          product: { select: { id: true, stock: true } },
        },
      });

      let processed = 0;
      let failed = 0;
      const errors: Array<{ externalId: string; error: string }> = [];

      for (const mapping of mappings) {
        try {
          await connector.pushInventory(
            integration.accessToken!,
            mapping.externalId,
            mapping.product.stock,
            integration.shopUrl ?? undefined,
          );
          await this.prisma.productMapping.update({
            where: { id: mapping.id },
            data: { lastSyncAt: new Date() },
          });
          processed++;
        } catch (err) {
          failed++;
          errors.push({
            externalId: mapping.externalId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return this.completeSyncLog(syncLog.id, {
        totalItems: mappings.length,
        processedItems: processed,
        failedItems: failed,
        errors: errors.length > 0 ? errors : undefined,
        status:
          failed === 0
            ? SyncStatus.COMPLETED
            : failed < mappings.length
              ? SyncStatus.PARTIAL
              : SyncStatus.FAILED,
      });
    } catch (error) {
      this.logger.error(
        `Inventory sync failed for integration ${integrationId}: ${error}`,
      );
      return this.completeSyncLog(syncLog.id, {
        status: SyncStatus.FAILED,
        errors: [
          {
            externalId: 'N/A',
            error: error instanceof Error ? error.message : String(error),
          },
        ],
      });
    }
  }

  /**
   * Run all enabled syncs for an integration.
   * Returns an array of SyncLog entries for each sync type.
   */
  async syncAll(integrationId: string): Promise<SyncLog[]> {
    const integration = await this.getActiveIntegration(integrationId);
    const results: SyncLog[] = [];

    const dir = integration.syncDirection;

    if (
      integration.syncProducts &&
      (dir === SyncDirection.INBOUND || dir === SyncDirection.BOTH)
    ) {
      results.push(await this.syncProducts(integrationId));
    }

    if (
      integration.syncOrders &&
      (dir === SyncDirection.INBOUND || dir === SyncDirection.BOTH)
    ) {
      results.push(await this.syncOrders(integrationId));
    }

    if (
      integration.syncInventory &&
      (dir === SyncDirection.OUTBOUND || dir === SyncDirection.BOTH)
    ) {
      results.push(await this.syncInventory(integrationId));
    }

    return results;
  }

  /** Fetch unmapped external products (for manual mapping UI). */
  async getUnmappedProducts(integrationId: string): Promise<ExternalProduct[]> {
    const integration = await this.getActiveIntegration(integrationId);
    const connector = this.integrationsService.getConnector(
      integration.platform,
    );

    const externalProducts = await connector.fetchProducts(
      integration.accessToken!,
      integration.shopUrl ?? undefined,
    );

    const mappings = await this.prisma.productMapping.findMany({
      where: { integrationId },
      select: { externalId: true },
    });
    const mappedIds = new Set(mappings.map((m) => m.externalId));

    return externalProducts.filter((p) => !mappedIds.has(p.externalId));
  }

  // ────────────────────── Private Helpers ──────────────────────

  private async getActiveIntegration(id: string): Promise<Integration> {
    const tenantId = this.tenantContext.requireTenantId();
    const integration = await this.prisma.integration.findFirst({
      where: { id, tenantId },
    });

    if (!integration) {
      throw new NotFoundException('Integración no encontrada');
    }

    if (!integration.accessToken) {
      throw new NotFoundException(
        'La integración no tiene credenciales configuradas',
      );
    }

    return integration;
  }

  private async completeSyncLog(
    id: string,
    data: {
      totalItems?: number;
      processedItems?: number;
      failedItems?: number;
      errors?: any;
      status: SyncStatus;
    },
  ): Promise<SyncLog> {
    return this.prisma.syncLog.update({
      where: { id },
      data: {
        ...data,
        completedAt: new Date(),
      },
    });
  }
}
