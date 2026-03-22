import { Injectable, Logger } from '@nestjs/common';
import { IntegrationPlatform } from '@prisma/client';
import * as crypto from 'crypto';
import type {
  PlatformConnector,
  ExternalProduct,
  ExternalOrder,
} from '../interfaces/connector.interface';

/**
 * ShopifyConnector — handles Shopify REST/GraphQL API interactions.
 *
 * nestjs-best-practices applied:
 * - arch-single-responsibility: only handles Shopify platform
 * - di-prefer-constructor-injection: injectable service
 * - error-handle-async-errors: all async ops have error handling
 */
@Injectable()
export class ShopifyConnector implements PlatformConnector {
  private readonly logger = new Logger(ShopifyConnector.name);
  readonly platform = IntegrationPlatform.SHOPIFY;

  async verifyConnection(
    accessToken: string,
    shopUrl?: string,
  ): Promise<boolean> {
    if (!shopUrl) return false;

    try {
      const response = await fetch(
        `https://${shopUrl}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.ok;
    } catch (error) {
      this.logger.warn(`Shopify connection check failed: ${error}`);
      return false;
    }
  }

  async fetchProducts(
    accessToken: string,
    shopUrl?: string,
  ): Promise<ExternalProduct[]> {
    if (!shopUrl) return [];

    try {
      const response = await fetch(
        `https://${shopUrl}/admin/api/2024-01/products.json?limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        this.logger.warn(`Shopify fetchProducts failed: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as {
        products: Array<{
          id: number;
          title: string;
          body_html: string | null;
          variants: Array<{
            sku: string | null;
            price: string;
            inventory_quantity: number;
          }>;
          images: Array<{ src: string }>;
          handle: string;
        }>;
      };

      return data.products.map((p) => ({
        externalId: String(p.id),
        sku: p.variants?.[0]?.sku ?? null,
        name: p.title,
        description: p.body_html,
        price: parseFloat(p.variants?.[0]?.price ?? '0'),
        stock: p.variants?.[0]?.inventory_quantity ?? 0,
        imageUrl: p.images?.[0]?.src ?? null,
        url: `https://${shopUrl}/products/${p.handle}`,
      }));
    } catch (error) {
      this.logger.error(`Shopify fetchProducts error: ${error}`);
      return [];
    }
  }

  async fetchOrders(
    accessToken: string,
    shopUrl?: string,
    since?: Date,
  ): Promise<ExternalOrder[]> {
    if (!shopUrl) return [];

    try {
      let url = `https://${shopUrl}/admin/api/2024-01/orders.json?status=any&limit=250`;
      if (since) {
        url += `&created_at_min=${since.toISOString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return [];

      const data = (await response.json()) as {
        orders: Array<{
          id: number;
          name: string;
          customer: {
            first_name: string;
            last_name: string;
            email: string | null;
          };
          line_items: Array<{
            product_id: number;
            sku: string | null;
            title: string;
            quantity: number;
            price: string;
          }>;
          total_price: string;
          currency: string;
          created_at: string;
        }>;
      };

      return data.orders.map((o) => ({
        externalId: String(o.id),
        orderNumber: o.name,
        customerName:
          `${o.customer?.first_name ?? ''} ${o.customer?.last_name ?? ''}`.trim(),
        customerEmail: o.customer?.email ?? null,
        items: o.line_items.map((li) => ({
          externalProductId: String(li.product_id),
          sku: li.sku,
          name: li.title,
          quantity: li.quantity,
          unitPrice: parseFloat(li.price),
        })),
        total: parseFloat(o.total_price),
        currency: o.currency,
        createdAt: new Date(o.created_at),
      }));
    } catch (error) {
      this.logger.error(`Shopify fetchOrders error: ${error}`);
      return [];
    }
  }

  async pushInventory(
    accessToken: string,
    externalProductId: string,
    quantity: number,
    shopUrl?: string,
  ): Promise<void> {
    if (!shopUrl) return;

    try {
      // First get inventory item ID from variant
      const variantRes = await fetch(
        `https://${shopUrl}/admin/api/2024-01/products/${externalProductId}/variants.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!variantRes.ok) {
        this.logger.warn(
          `Shopify pushInventory: failed to get variants for product ${externalProductId}`,
        );
        return;
      }

      const variantData = (await variantRes.json()) as {
        variants: Array<{ inventory_item_id: number }>;
      };
      const inventoryItemId = variantData.variants?.[0]?.inventory_item_id;

      if (!inventoryItemId) {
        this.logger.warn(
          `Shopify pushInventory: no inventory_item_id for product ${externalProductId}`,
        );
        return;
      }

      // Set inventory level
      await fetch(
        `https://${shopUrl}/admin/api/2024-01/inventory_levels/set.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inventory_item_id: inventoryItemId,
            available: quantity,
          }),
        },
      );
    } catch (error) {
      this.logger.error(`Shopify pushInventory error: ${error}`);
    }
  }

  verifyWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  }
}
