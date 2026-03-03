import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationsSyncService } from './sync.service';
import { ShopifyConnector } from './connectors/shopify.connector';
import { MercadoLibreConnector } from './connectors/mercadolibre.connector';
import { WooCommerceConnector } from './connectors/woocommerce.connector';

/**
 * IntegrationsModule — e-commerce platform integrations.
 *
 * nestjs-best-practices applied:
 * - arch-feature-modules: self-contained module with all integration logic
 * - arch-single-responsibility: connectors, service, sync separated
 */
@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationsSyncService,
    ShopifyConnector,
    MercadoLibreConnector,
    WooCommerceConnector,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
