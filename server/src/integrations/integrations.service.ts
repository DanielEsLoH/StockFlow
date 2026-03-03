import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import type { Integration, ProductMapping, Prisma } from '@prisma/client';
import {
  IntegrationPlatform,
  IntegrationStatus,
  SyncDirection,
} from '@prisma/client';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  CreateProductMappingDto,
} from './dto';
import type { PlatformConnector } from './interfaces/connector.interface';
import { ShopifyConnector } from './connectors/shopify.connector';
import { MercadoLibreConnector } from './connectors/mercadolibre.connector';
import { WooCommerceConnector } from './connectors/woocommerce.connector';

/**
 * IntegrationsService — CRUD for e-commerce integrations and product mappings.
 *
 * nestjs-best-practices applied:
 * - arch-single-responsibility: CRUD and connector resolution only
 * - di-prefer-constructor-injection: all deps via constructor
 * - error-throw-http-exceptions: proper NestJS exceptions
 */
@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly connectors: Map<IntegrationPlatform, PlatformConnector>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly shopifyConnector: ShopifyConnector,
    private readonly mercadoLibreConnector: MercadoLibreConnector,
    private readonly wooCommerceConnector: WooCommerceConnector,
  ) {
    this.connectors = new Map<IntegrationPlatform, PlatformConnector>([
      [IntegrationPlatform.SHOPIFY, this.shopifyConnector],
      [IntegrationPlatform.MERCADOLIBRE, this.mercadoLibreConnector],
      [IntegrationPlatform.WOOCOMMERCE, this.wooCommerceConnector],
    ]);
  }

  /** Resolve the correct connector for a platform. */
  getConnector(platform: IntegrationPlatform): PlatformConnector {
    const connector = this.connectors.get(platform);
    if (!connector) {
      throw new BadRequestException(
        `Plataforma no soportada: ${platform}`,
      );
    }
    return connector;
  }

  /** List all integrations for the current tenant. */
  async findAll(): Promise<Integration[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.integration.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { productMappings: true, syncLogs: true },
        },
      },
    });
  }

  /** Get a single integration by ID (tenant-scoped). */
  async findOne(id: string): Promise<Integration> {
    const tenantId = this.tenantContext.requireTenantId();
    const integration = await this.prisma.integration.findFirst({
      where: { id, tenantId },
      include: {
        productMappings: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        _count: { select: { syncLogs: true } },
      },
    });

    if (!integration) {
      throw new NotFoundException('Integración no encontrada');
    }
    return integration;
  }

  /** Create a new integration. */
  async create(dto: CreateIntegrationDto): Promise<Integration> {
    const tenantId = this.tenantContext.requireTenantId();

    // Check for duplicate (same platform + shopUrl)
    const existing = await this.prisma.integration.findFirst({
      where: {
        tenantId,
        platform: dto.platform,
        shopUrl: dto.shopUrl ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una integración para ${dto.platform} con esta URL`,
      );
    }

    // If accessToken provided, verify connection
    let status: IntegrationStatus = IntegrationStatus.PENDING;
    if (dto.accessToken) {
      const connector = this.getConnector(dto.platform);
      try {
        const isValid = await connector.verifyConnection(
          dto.accessToken,
          dto.shopUrl,
        );
        status = isValid
          ? IntegrationStatus.CONNECTED
          : IntegrationStatus.ERROR;
      } catch {
        status = IntegrationStatus.ERROR;
        this.logger.warn(
          `Connection verification failed for ${dto.platform}`,
        );
      }
    }

    return this.prisma.integration.create({
      data: {
        tenantId,
        platform: dto.platform,
        name: dto.name,
        shopUrl: dto.shopUrl,
        accessToken: dto.accessToken,
        refreshToken: dto.refreshToken,
        syncDirection: dto.syncDirection ?? SyncDirection.BOTH,
        syncProducts: dto.syncProducts ?? true,
        syncOrders: dto.syncOrders ?? true,
        syncInventory: dto.syncInventory ?? true,
        status,
      },
    });
  }

  /** Update an existing integration. */
  async update(
    id: string,
    dto: UpdateIntegrationDto,
  ): Promise<Integration> {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.integration.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Integración no encontrada');
    }

    // If accessToken is being updated, re-verify
    let statusUpdate: Partial<{ status: IntegrationStatus }> = {};
    if (dto.accessToken && dto.accessToken !== existing.accessToken) {
      const connector = this.getConnector(existing.platform);
      try {
        const isValid = await connector.verifyConnection(
          dto.accessToken,
          dto.shopUrl ?? existing.shopUrl ?? undefined,
        );
        statusUpdate = {
          status: isValid
            ? IntegrationStatus.CONNECTED
            : IntegrationStatus.ERROR,
        };
      } catch {
        statusUpdate = { status: IntegrationStatus.ERROR };
      }
    }

    return this.prisma.integration.update({
      where: { id },
      data: {
        ...dto,
        ...statusUpdate,
      },
    });
  }

  /** Delete an integration and all its mappings/logs. */
  async remove(id: string): Promise<Integration> {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.integration.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Integración no encontrada');
    }

    return this.prisma.integration.delete({ where: { id } });
  }

  /** Verify an integration's connection status. */
  async verifyConnection(id: string): Promise<{ connected: boolean }> {
    const integration = await this.findOne(id);
    if (!integration.accessToken) {
      return { connected: false };
    }

    const connector = this.getConnector(integration.platform);
    try {
      const connected = await connector.verifyConnection(
        integration.accessToken,
        integration.shopUrl ?? undefined,
      );

      await this.prisma.integration.update({
        where: { id },
        data: {
          status: connected
            ? IntegrationStatus.CONNECTED
            : IntegrationStatus.DISCONNECTED,
        },
      });

      return { connected };
    } catch {
      await this.prisma.integration.update({
        where: { id },
        data: { status: IntegrationStatus.ERROR },
      });
      return { connected: false };
    }
  }

  // ────────────────────── Product Mappings ──────────────────────

  /** List product mappings for an integration. */
  async findMappings(integrationId: string): Promise<ProductMapping[]> {
    const tenantId = this.tenantContext.requireTenantId();
    // Ensure integration belongs to tenant
    await this.findOne(integrationId);

    return this.prisma.productMapping.findMany({
      where: { tenantId, integrationId },
      include: {
        product: { select: { id: true, name: true, sku: true, salePrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Create a product mapping. */
  async createMapping(
    integrationId: string,
    dto: CreateProductMappingDto,
  ): Promise<ProductMapping> {
    const tenantId = this.tenantContext.requireTenantId();
    // Ensure integration belongs to tenant
    await this.findOne(integrationId);

    // Verify product belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Check for duplicate mapping
    const existingMapping = await this.prisma.productMapping.findFirst({
      where: {
        integrationId,
        OR: [
          { externalId: dto.externalId },
          { productId: dto.productId },
        ],
      },
    });

    if (existingMapping) {
      throw new ConflictException(
        'Ya existe un mapeo para este producto o ID externo',
      );
    }

    return this.prisma.productMapping.create({
      data: {
        tenantId,
        integrationId,
        productId: dto.productId,
        externalId: dto.externalId,
        externalSku: dto.externalSku,
        externalUrl: dto.externalUrl,
        syncDirection: dto.syncDirection ?? SyncDirection.BOTH,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    });
  }

  /** Delete a product mapping. */
  async removeMapping(
    integrationId: string,
    mappingId: string,
  ): Promise<ProductMapping> {
    const tenantId = this.tenantContext.requireTenantId();
    await this.findOne(integrationId);

    const mapping = await this.prisma.productMapping.findFirst({
      where: { id: mappingId, integrationId, tenantId },
    });

    if (!mapping) {
      throw new NotFoundException('Mapeo de producto no encontrado');
    }

    return this.prisma.productMapping.delete({
      where: { id: mappingId },
    });
  }

  // ────────────────────── Sync Logs ──────────────────────

  /** Get sync logs for an integration. */
  async findSyncLogs(
    integrationId: string,
    limit = 20,
  ): Promise<any[]> {
    const tenantId = this.tenantContext.requireTenantId();
    await this.findOne(integrationId);

    return this.prisma.syncLog.findMany({
      where: { tenantId, integrationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
