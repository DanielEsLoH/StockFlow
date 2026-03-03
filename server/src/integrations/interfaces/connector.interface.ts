import { IntegrationPlatform } from '@prisma/client';

/**
 * Connector interface — defines the contract for e-commerce platform connectors.
 *
 * nestjs-best-practices applied:
 * - di-interface-segregation: focused interface per concern
 * - arch-single-responsibility: each connector handles one platform
 */

export interface ExternalProduct {
  externalId: string;
  sku: string | null;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  url: string | null;
}

export interface ExternalOrder {
  externalId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  items: ExternalOrderItem[];
  total: number;
  currency: string;
  createdAt: Date;
}

export interface ExternalOrderItem {
  externalProductId: string;
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ConnectorAuthResult {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  shopUrl?: string;
}

export interface PlatformConnector {
  /** The platform this connector handles. */
  readonly platform: IntegrationPlatform;

  /**
   * Verify that a connection is valid (token check).
   * @returns true if connection is active and tokens are valid
   */
  verifyConnection(accessToken: string, shopUrl?: string): Promise<boolean>;

  /**
   * Fetch products from the external platform.
   */
  fetchProducts(
    accessToken: string,
    shopUrl?: string,
  ): Promise<ExternalProduct[]>;

  /**
   * Fetch recent orders from the external platform.
   */
  fetchOrders(
    accessToken: string,
    shopUrl?: string,
    since?: Date,
  ): Promise<ExternalOrder[]>;

  /**
   * Push inventory/stock update to the external platform.
   */
  pushInventory(
    accessToken: string,
    externalProductId: string,
    quantity: number,
    shopUrl?: string,
  ): Promise<void>;

  /**
   * Verify a webhook signature from the platform.
   * @returns true if the signature is valid
   */
  verifyWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): boolean;
}
