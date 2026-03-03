/**
 * Integration types — mirrors backend Prisma models for e-commerce integrations.
 *
 * vercel-react-best-practices applied:
 * - bundle-barrel-imports: types-only file, no runtime imports
 */

export type IntegrationPlatform = 'SHOPIFY' | 'MERCADOLIBRE' | 'WOOCOMMERCE';
export type IntegrationStatus = 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type SyncDirection = 'INBOUND' | 'OUTBOUND' | 'BOTH';
export type SyncStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface Integration {
  id: string;
  tenantId: string;
  platform: IntegrationPlatform;
  status: IntegrationStatus;
  name: string;
  shopUrl: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: string | null;
  webhookSecret: string | null;
  syncDirection: SyncDirection;
  syncProducts: boolean;
  syncOrders: boolean;
  syncInventory: boolean;
  lastSyncAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  productMappings?: ProductMapping[];
  _count?: {
    productMappings: number;
    syncLogs: number;
  };
}

export interface ProductMapping {
  id: string;
  tenantId: string;
  integrationId: string;
  productId: string;
  externalId: string;
  externalSku: string | null;
  externalUrl: string | null;
  syncDirection: SyncDirection;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    salePrice?: number;
  };
}

export interface SyncLog {
  id: string;
  tenantId: string;
  integrationId: string;
  direction: SyncDirection;
  status: SyncStatus;
  entityType: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: Array<{ externalId: string; error: string }> | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

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

// ────────────────────── DTOs ──────────────────────

export interface CreateIntegrationDto {
  platform: IntegrationPlatform;
  name: string;
  shopUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  syncDirection?: SyncDirection;
  syncProducts?: boolean;
  syncOrders?: boolean;
  syncInventory?: boolean;
}

export interface UpdateIntegrationDto extends Partial<CreateIntegrationDto> {}

export interface CreateProductMappingDto {
  productId: string;
  externalId: string;
  externalSku?: string;
  externalUrl?: string;
  syncDirection?: SyncDirection;
}

// ────────────────────── Platform Info ──────────────────────

export interface PlatformInfo {
  platform: IntegrationPlatform;
  name: string;
  description: string;
  icon: string;
  color: string;
  requiresShopUrl: boolean;
}

export const PLATFORM_INFO: Record<IntegrationPlatform, PlatformInfo> = {
  SHOPIFY: {
    platform: 'SHOPIFY',
    name: 'Shopify',
    description: 'Conecta tu tienda Shopify para sincronizar productos, pedidos e inventario',
    icon: '🛍️',
    color: 'bg-green-500',
    requiresShopUrl: true,
  },
  MERCADOLIBRE: {
    platform: 'MERCADOLIBRE',
    name: 'MercadoLibre',
    description: 'Integra con MercadoLibre para gestionar publicaciones y ventas',
    icon: '🤝',
    color: 'bg-yellow-500',
    requiresShopUrl: false,
  },
  WOOCOMMERCE: {
    platform: 'WOOCOMMERCE',
    name: 'WooCommerce',
    description: 'Conecta tu tienda WordPress/WooCommerce para sincronizar todo',
    icon: '🛒',
    color: 'bg-purple-500',
    requiresShopUrl: true,
  },
};
