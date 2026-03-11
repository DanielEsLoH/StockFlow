import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo } from './helpers';

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export async function seedIntegrations(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  const demoProducts = ctx.products.demo;
  const distProducts = ctx.products.distribuidora;
  const papProducts = ctx.products.papeleria;

  // =============================================
  // DEMO — 2 integrations
  // =============================================

  // 1. Shopify — CONNECTED
  const demoShopify = await prisma.integration.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      platform: 'SHOPIFY',
      status: 'CONNECTED',
      name: 'Tienda Shopify Demo',
      shopUrl: 'tienda-demo.myshopify.com',
      accessToken: 'shpat_demo_xxxx',
      refreshToken: 'shprt_demo_xxxx',
      tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      webhookSecret: 'whsec_demo_shopify_xxxx',
      syncDirection: 'BOTH',
      syncProducts: true,
      syncOrders: true,
      syncInventory: true,
      lastSyncAt: hoursAgo(2),
      metadata: {
        shopId: 'shop_demo_12345',
        apiVersion: '2025-01',
        planName: 'Basic Shopify',
      },
    },
  });

  // 2. MercadoLibre — PENDING
  const demoMeli = await prisma.integration.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      platform: 'MERCADOLIBRE',
      status: 'PENDING',
      name: 'MercadoLibre Demo',
      syncDirection: 'BOTH',
      syncProducts: true,
      syncOrders: true,
      syncInventory: false,
      metadata: {
        note: 'Pendiente de autorización OAuth',
      },
    },
  });

  // Demo Shopify — 5 ProductMappings
  const demoMappings = demoProducts.slice(0, 5).map((product, index) => ({
    tenantId: ctx.tenants.demo.id,
    integrationId: demoShopify.id,
    productId: product.id,
    externalId: `shopify-prod-${index + 1}`,
    externalSku: product.sku,
    externalUrl: `https://tienda-demo.myshopify.com/admin/products/${1000 + index}`,
    syncDirection: 'BOTH' as const,
    lastSyncAt: hoursAgo(2),
  }));

  await prisma.productMapping.createMany({ data: demoMappings });

  // Demo Shopify — 3 SyncLogs
  const demoShopifySyncLogs = [
    {
      tenantId: ctx.tenants.demo.id,
      integrationId: demoShopify.id,
      direction: 'INBOUND' as const,
      status: 'COMPLETED' as const,
      entityType: 'PRODUCT',
      totalItems: 30,
      processedItems: 30,
      failedItems: 0,
      errors: [],
      startedAt: hoursAgo(3),
      completedAt: hoursAgo(2),
    },
    {
      tenantId: ctx.tenants.demo.id,
      integrationId: demoShopify.id,
      direction: 'INBOUND' as const,
      status: 'COMPLETED' as const,
      entityType: 'ORDER',
      totalItems: 12,
      processedItems: 12,
      failedItems: 0,
      errors: [],
      startedAt: hoursAgo(2),
      completedAt: hoursAgo(2),
    },
    {
      tenantId: ctx.tenants.demo.id,
      integrationId: demoShopify.id,
      direction: 'OUTBOUND' as const,
      status: 'PARTIAL' as const,
      entityType: 'INVENTORY',
      totalItems: 25,
      processedItems: 20,
      failedItems: 5,
      errors: [
        {
          productId: demoProducts[0].id,
          error: 'Variant not found in Shopify',
        },
        {
          productId: demoProducts[1].id,
          error: 'Rate limit exceeded, retry later',
        },
        {
          productId: demoProducts[2].id,
          error: 'Inventory location mismatch',
        },
        {
          productId: demoProducts[3 % demoProducts.length].id,
          error: 'SKU not mapped',
        },
        {
          productId: demoProducts[4 % demoProducts.length].id,
          error: 'API timeout',
        },
      ],
      startedAt: hoursAgo(1),
      completedAt: new Date(),
    },
  ];

  await prisma.syncLog.createMany({ data: demoShopifySyncLogs });

  // Demo MercadoLibre — 1 SyncLog PENDING
  await prisma.syncLog.createMany({
    data: [
      {
        tenantId: ctx.tenants.demo.id,
        integrationId: demoMeli.id,
        direction: 'BOTH',
        status: 'PENDING',
        entityType: 'PRODUCT',
        totalItems: 0,
        processedItems: 0,
        failedItems: 0,
        errors: [],
        startedAt: new Date(),
      },
    ],
  });

  // =============================================
  // DISTRIBUIDORA — 1 integration (WooCommerce)
  // =============================================

  const distWoo = await prisma.integration.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      platform: 'WOOCOMMERCE',
      status: 'CONNECTED',
      name: 'WooCommerce Distribuidora',
      shopUrl: 'www.distribuidoranacional.com',
      accessToken: 'ck_dist_xxxx',
      refreshToken: 'cs_dist_xxxx',
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      syncDirection: 'BOTH',
      syncProducts: true,
      syncOrders: true,
      syncInventory: true,
      lastSyncAt: daysAgo(1),
      metadata: {
        wooVersion: '8.5',
        phpVersion: '8.2',
        siteUrl: 'https://www.distribuidoranacional.com',
      },
    },
  });

  // Distribuidora WooCommerce — 3 ProductMappings
  const distMappings = distProducts.slice(0, 3).map((product, index) => ({
    tenantId: ctx.tenants.distribuidora.id,
    integrationId: distWoo.id,
    productId: product.id,
    externalId: `woo-prod-${index + 1}`,
    externalSku: product.sku,
    externalUrl: `https://www.distribuidoranacional.com/wp-admin/post.php?post=${2000 + index}&action=edit`,
    syncDirection: 'BOTH' as const,
    lastSyncAt: daysAgo(1),
  }));

  await prisma.productMapping.createMany({ data: distMappings });

  // Distribuidora WooCommerce — 2 SyncLogs
  await prisma.syncLog.createMany({
    data: [
      {
        tenantId: ctx.tenants.distribuidora.id,
        integrationId: distWoo.id,
        direction: 'INBOUND',
        status: 'COMPLETED',
        entityType: 'ORDER',
        totalItems: 18,
        processedItems: 18,
        failedItems: 0,
        errors: [],
        startedAt: daysAgo(1),
        completedAt: daysAgo(1),
      },
      {
        tenantId: ctx.tenants.distribuidora.id,
        integrationId: distWoo.id,
        direction: 'OUTBOUND',
        status: 'FAILED',
        entityType: 'INVENTORY',
        totalItems: 45,
        processedItems: 0,
        failedItems: 45,
        errors: [
          {
            error: 'WooCommerce REST API returned 503 Service Unavailable',
            timestamp: daysAgo(1).toISOString(),
          },
          {
            error: 'Connection timeout after 30s — server not responding',
            timestamp: daysAgo(1).toISOString(),
          },
        ],
        startedAt: daysAgo(1),
        completedAt: daysAgo(1),
      },
    ],
  });

  // =============================================
  // PAPELERÍA — 1 integration (Shopify, DISCONNECTED)
  // =============================================

  const papShopify = await prisma.integration.create({
    data: {
      tenantId: ctx.tenants.papeleria.id,
      platform: 'SHOPIFY',
      status: 'DISCONNECTED',
      name: 'Shopify Papelería',
      shopUrl: 'papeleria-central.myshopify.com',
      syncDirection: 'BOTH',
      syncProducts: true,
      syncOrders: false,
      syncInventory: false,
      lastSyncAt: daysAgo(30),
      metadata: {
        disconnectedAt: daysAgo(7).toISOString(),
        reason: 'Token expirado, requiere reconexión',
      },
    },
  });

  // Papelería Shopify — 2 ProductMappings
  const papMappings = papProducts.slice(0, 2).map((product, index) => ({
    tenantId: ctx.tenants.papeleria.id,
    integrationId: papShopify.id,
    productId: product.id,
    externalId: `shopify-pap-${index + 1}`,
    externalSku: product.sku,
    externalUrl: `https://papeleria-central.myshopify.com/admin/products/${3000 + index}`,
    syncDirection: 'BOTH' as const,
    lastSyncAt: daysAgo(30),
  }));

  await prisma.productMapping.createMany({ data: papMappings });

  // Papelería Shopify — 2 SyncLogs
  await prisma.syncLog.createMany({
    data: [
      {
        tenantId: ctx.tenants.papeleria.id,
        integrationId: papShopify.id,
        direction: 'INBOUND',
        status: 'COMPLETED',
        entityType: 'PRODUCT',
        totalItems: 8,
        processedItems: 8,
        failedItems: 0,
        errors: [],
        startedAt: daysAgo(30),
        completedAt: daysAgo(30),
      },
      {
        tenantId: ctx.tenants.papeleria.id,
        integrationId: papShopify.id,
        direction: 'BOTH',
        status: 'FAILED',
        entityType: 'PRODUCT',
        totalItems: 10,
        processedItems: 0,
        failedItems: 10,
        errors: [
          {
            error:
              'Access token is invalid or has expired. Please reconnect.',
            code: 'UNAUTHORIZED',
          },
        ],
        startedAt: daysAgo(7),
        completedAt: daysAgo(7),
      },
    ],
  });
}
