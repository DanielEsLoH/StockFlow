import { Injectable, Logger } from '@nestjs/common';
import { IntegrationPlatform } from '@prisma/client';
import * as crypto from 'crypto';
import type {
  PlatformConnector,
  ExternalProduct,
  ExternalOrder,
} from '../interfaces/connector.interface';

/**
 * WooCommerceConnector — handles WooCommerce REST API interactions.
 * Uses consumer key/secret authentication.
 *
 * nestjs-best-practices applied:
 * - arch-single-responsibility: only handles WooCommerce platform
 */
@Injectable()
export class WooCommerceConnector implements PlatformConnector {
  private readonly logger = new Logger(WooCommerceConnector.name);
  readonly platform = IntegrationPlatform.WOOCOMMERCE;

  /**
   * Build auth URL for WooCommerce (consumer key/secret as query params).
   * accessToken format: "consumer_key:consumer_secret"
   */
  private getAuthParams(accessToken: string): string {
    const [key, secret] = accessToken.split(':');
    return `consumer_key=${key}&consumer_secret=${secret}`;
  }

  async verifyConnection(
    accessToken: string,
    shopUrl?: string,
  ): Promise<boolean> {
    if (!shopUrl) return false;

    try {
      const auth = this.getAuthParams(accessToken);
      const response = await fetch(
        `${shopUrl}/wp-json/wc/v3/system_status?${auth}`,
      );
      return response.ok;
    } catch (error) {
      this.logger.warn(`WooCommerce connection check failed: ${error}`);
      return false;
    }
  }

  async fetchProducts(
    accessToken: string,
    shopUrl?: string,
  ): Promise<ExternalProduct[]> {
    if (!shopUrl) return [];

    try {
      const auth = this.getAuthParams(accessToken);
      const response = await fetch(
        `${shopUrl}/wp-json/wc/v3/products?per_page=100&${auth}`,
      );

      if (!response.ok) return [];

      const data = (await response.json()) as Array<{
        id: number;
        name: string;
        sku: string;
        description: string;
        price: string;
        stock_quantity: number | null;
        images: Array<{ src: string }>;
        permalink: string;
      }>;

      return data.map((p) => ({
        externalId: String(p.id),
        sku: p.sku || null,
        name: p.name,
        description: p.description,
        price: parseFloat(p.price || '0'),
        stock: p.stock_quantity ?? 0,
        imageUrl: p.images?.[0]?.src ?? null,
        url: p.permalink,
      }));
    } catch (error) {
      this.logger.error(`WooCommerce fetchProducts error: ${error}`);
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
      const auth = this.getAuthParams(accessToken);
      let url = `${shopUrl}/wp-json/wc/v3/orders?per_page=100&${auth}`;
      if (since) {
        url += `&after=${since.toISOString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) return [];

      const data = (await response.json()) as Array<{
        id: number;
        number: string;
        billing: { first_name: string; last_name: string; email: string };
        line_items: Array<{
          product_id: number;
          sku: string;
          name: string;
          quantity: number;
          price: string;
        }>;
        total: string;
        currency: string;
        date_created: string;
      }>;

      return data.map((o) => ({
        externalId: String(o.id),
        orderNumber: `WC-${o.number}`,
        customerName: `${o.billing.first_name} ${o.billing.last_name}`,
        customerEmail: o.billing.email,
        items: o.line_items.map((li) => ({
          externalProductId: String(li.product_id),
          sku: li.sku || null,
          name: li.name,
          quantity: li.quantity,
          unitPrice: parseFloat(li.price),
        })),
        total: parseFloat(o.total),
        currency: o.currency,
        createdAt: new Date(o.date_created),
      }));
    } catch (error) {
      this.logger.error(`WooCommerce fetchOrders error: ${error}`);
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
      const auth = this.getAuthParams(accessToken);
      await fetch(
        `${shopUrl}/wp-json/wc/v3/products/${externalProductId}?${auth}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock_quantity: quantity }),
        },
      );
    } catch (error) {
      this.logger.error(`WooCommerce pushInventory error: ${error}`);
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

    try {
      return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
