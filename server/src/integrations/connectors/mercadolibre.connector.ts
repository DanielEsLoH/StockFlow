import { Injectable, Logger } from '@nestjs/common';
import { IntegrationPlatform } from '@prisma/client';
import * as crypto from 'crypto';
import type {
  PlatformConnector,
  ExternalProduct,
  ExternalOrder,
} from '../interfaces/connector.interface';

/**
 * MercadoLibreConnector — handles MercadoLibre API interactions.
 * Priority for Colombian market.
 *
 * nestjs-best-practices applied:
 * - arch-single-responsibility: only handles MercadoLibre platform
 */
@Injectable()
export class MercadoLibreConnector implements PlatformConnector {
  private readonly logger = new Logger(MercadoLibreConnector.name);
  private readonly baseUrl = 'https://api.mercadolibre.com';
  readonly platform = IntegrationPlatform.MERCADOLIBRE;

  async verifyConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok;
    } catch (error) {
      this.logger.warn(`MeLi connection check failed: ${error}`);
      return false;
    }
  }

  async fetchProducts(accessToken: string): Promise<ExternalProduct[]> {
    try {
      // Get seller ID first
      const meRes = await fetch(`${this.baseUrl}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!meRes.ok) return [];
      const me = (await meRes.json()) as { id: number };

      // Get items listing
      const itemsRes = await fetch(
        `${this.baseUrl}/users/${me.id}/items/search?limit=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!itemsRes.ok) return [];
      const itemsData = (await itemsRes.json()) as { results: string[] };

      if (!itemsData.results?.length) return [];

      // Fetch item details in batch (max 20 at a time per ML API)
      const products: ExternalProduct[] = [];
      const batchSize = 20;

      for (let i = 0; i < itemsData.results.length; i += batchSize) {
        const batch = itemsData.results.slice(i, i + batchSize);
        const ids = batch.join(',');
        const batchRes = await fetch(
          `${this.baseUrl}/items?ids=${ids}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!batchRes.ok) continue;

        const batchData = (await batchRes.json()) as Array<{
          code: number;
          body: {
            id: string;
            title: string;
            price: number;
            available_quantity: number;
            thumbnail: string | null;
            permalink: string;
            seller_custom_field: string | null;
          };
        }>;

        for (const item of batchData) {
          if (item.code !== 200) continue;
          products.push({
            externalId: item.body.id,
            sku: item.body.seller_custom_field,
            name: item.body.title,
            description: null,
            price: item.body.price,
            stock: item.body.available_quantity,
            imageUrl: item.body.thumbnail,
            url: item.body.permalink,
          });
        }
      }

      return products;
    } catch (error) {
      this.logger.error(`MeLi fetchProducts error: ${error}`);
      return [];
    }
  }

  async fetchOrders(
    accessToken: string,
    _shopUrl?: string,
    since?: Date,
  ): Promise<ExternalOrder[]> {
    try {
      const meRes = await fetch(`${this.baseUrl}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!meRes.ok) return [];
      const me = (await meRes.json()) as { id: number };

      let url = `${this.baseUrl}/orders/search?seller=${me.id}&sort=date_desc&limit=50`;
      if (since) {
        url += `&order.date_created.from=${since.toISOString()}`;
      }

      const ordersRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!ordersRes.ok) return [];

      const ordersData = (await ordersRes.json()) as {
        results: Array<{
          id: number;
          buyer: { first_name: string; last_name: string; email: string | null };
          order_items: Array<{
            item: { id: string; title: string; seller_sku: string | null };
            quantity: number;
            unit_price: number;
          }>;
          total_amount: number;
          currency_id: string;
          date_created: string;
        }>;
      };

      return ordersData.results.map((o) => ({
        externalId: String(o.id),
        orderNumber: `ML-${o.id}`,
        customerName: `${o.buyer.first_name} ${o.buyer.last_name}`,
        customerEmail: o.buyer.email,
        items: o.order_items.map((oi) => ({
          externalProductId: oi.item.id,
          sku: oi.item.seller_sku,
          name: oi.item.title,
          quantity: oi.quantity,
          unitPrice: oi.unit_price,
        })),
        total: o.total_amount,
        currency: o.currency_id,
        createdAt: new Date(o.date_created),
      }));
    } catch (error) {
      this.logger.error(`MeLi fetchOrders error: ${error}`);
      return [];
    }
  }

  async pushInventory(
    accessToken: string,
    externalProductId: string,
    quantity: number,
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/items/${externalProductId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ available_quantity: quantity }),
      });
    } catch (error) {
      this.logger.error(`MeLi pushInventory error: ${error}`);
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
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(signature),
    );
  }
}
