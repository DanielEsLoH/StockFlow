import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, Logger } from '@nestjs/common';
import {
  IntegrationPlatform,
  IntegrationStatus,
  SyncDirection,
  SyncStatus,
} from '@prisma/client';
import type { Integration, SyncLog } from '@prisma/client';
import { IntegrationsSyncService } from './sync.service';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import type {
  PlatformConnector,
  ExternalProduct,
  ExternalOrder,
} from './interfaces/connector.interface';

describe('IntegrationsSyncService', () => {
  let service: IntegrationsSyncService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let integrationsService: jest.Mocked<IntegrationsService>;

  // ── Test data ────────────────────────────────────────────────

  const mockTenantId = 'tenant-123';
  const mockIntegrationId = 'integration-456';

  const mockIntegration: Integration = {
    id: mockIntegrationId,
    tenantId: mockTenantId,
    platform: IntegrationPlatform.SHOPIFY,
    status: IntegrationStatus.CONNECTED,
    name: 'My Shopify Store',
    shopUrl: 'mystore.myshopify.com',
    accessToken: 'shpat_test-token-123',
    refreshToken: null,
    tokenExpiry: null,
    webhookSecret: null,
    syncDirection: SyncDirection.BOTH,
    syncProducts: true,
    syncOrders: true,
    syncInventory: true,
    lastSyncAt: null,
    metadata: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  };

  const mockSyncLog: SyncLog = {
    id: 'synclog-789',
    tenantId: mockTenantId,
    integrationId: mockIntegrationId,
    direction: SyncDirection.INBOUND,
    status: SyncStatus.IN_PROGRESS,
    entityType: 'product',
    totalItems: 0,
    processedItems: 0,
    failedItems: 0,
    errors: null,
    startedAt: new Date('2024-06-01T10:00:00Z'),
    completedAt: null,
    createdAt: new Date('2024-06-01T10:00:00Z'),
  };

  const mockExternalProducts: ExternalProduct[] = [
    {
      externalId: 'ext-prod-1',
      sku: 'EXT-SKU-001',
      name: 'External Product 1',
      description: 'Description 1',
      price: 29.99,
      stock: 50,
      imageUrl: 'https://example.com/img1.jpg',
      url: 'https://example.com/products/1',
    },
    {
      externalId: 'ext-prod-2',
      sku: 'EXT-SKU-002',
      name: 'External Product 2',
      description: null,
      price: 49.99,
      stock: 25,
      imageUrl: null,
      url: null,
    },
  ];

  const mockExternalOrders: ExternalOrder[] = [
    {
      externalId: 'ext-order-1',
      orderNumber: 'ORD-001',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: [
        {
          externalProductId: 'ext-prod-1',
          sku: 'EXT-SKU-001',
          name: 'External Product 1',
          quantity: 2,
          unitPrice: 29.99,
        },
      ],
      total: 59.98,
      currency: 'USD',
      createdAt: new Date('2024-06-01'),
    },
  ];

  const mockProductMapping = {
    id: 'mapping-1',
    tenantId: mockTenantId,
    integrationId: mockIntegrationId,
    productId: 'product-1',
    externalId: 'ext-prod-1',
    externalSku: 'EXT-SKU-001',
    externalUrl: 'https://example.com/products/1',
    syncDirection: SyncDirection.BOTH,
    lastSyncAt: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  };

  // Mock connector
  const mockConnector: jest.Mocked<PlatformConnector> = {
    platform: IntegrationPlatform.SHOPIFY,
    verifyConnection: jest.fn(),
    fetchProducts: jest.fn(),
    fetchOrders: jest.fn(),
    pushInventory: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  // ── Setup ────────────────────────────────────────────────────

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      integration: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      syncLog: {
        create: jest.fn(),
        update: jest.fn(),
      },
      productMapping: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockIntegrationsService = {
      getConnector: jest.fn().mockReturnValue(mockConnector),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsSyncService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: IntegrationsService, useValue: mockIntegrationsService },
      ],
    }).compile();

    service = module.get<IntegrationsSyncService>(IntegrationsSyncService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);
    integrationsService = module.get(IntegrationsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Helpers ──────────────────────────────────────────────────

  /** Set up default mocks for a successful getActiveIntegration call. */
  function setupActiveIntegration(overrides: Partial<Integration> = {}) {
    const integration = { ...mockIntegration, ...overrides };
    (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
      integration,
    );
    return integration;
  }

  /** Set up the syncLog.create mock to return a SyncLog with given overrides. */
  function setupSyncLogCreate(overrides: Partial<SyncLog> = {}) {
    const syncLog = { ...mockSyncLog, ...overrides };
    (prismaService.syncLog.create as jest.Mock).mockResolvedValue(syncLog);
    return syncLog;
  }

  /** Set up the syncLog.update mock to resolve with its data argument merged into base. */
  function setupSyncLogUpdate() {
    (prismaService.syncLog.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ ...mockSyncLog, ...data }),
    );
  }

  // ── Tests ────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════
  // syncProducts
  // ════════════════════════════════════════════════════════════

  describe('syncProducts', () => {
    beforeEach(() => {
      setupActiveIntegration();
      setupSyncLogCreate({
        direction: SyncDirection.INBOUND,
        entityType: 'product',
      });
      setupSyncLogUpdate();
    });

    it('should create a SyncLog with INBOUND direction and product entityType', async () => {
      mockConnector.fetchProducts.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncProducts(mockIntegrationId);

      expect(prismaService.syncLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          integrationId: mockIntegrationId,
          direction: SyncDirection.INBOUND,
          entityType: 'product',
          status: SyncStatus.IN_PROGRESS,
        },
      });
    });

    it('should fetch products using the connector with correct credentials', async () => {
      mockConnector.fetchProducts.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncProducts(mockIntegrationId);

      expect(mockConnector.fetchProducts).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        mockIntegration.shopUrl,
      );
    });

    it('should complete with COMPLETED status when all products sync successfully', async () => {
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.syncProducts(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.totalItems).toBe(2);
      expect(result.processedItems).toBe(2);
      expect(result.failedItems).toBe(0);
    });

    it('should update existing mapped products with external data', async () => {
      const mappings = [
        {
          ...mockProductMapping,
          externalId: 'ext-prod-1',
          productId: 'product-1',
        },
      ];
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappings,
      );

      await service.syncProducts(mockIntegrationId);

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: {
          name: 'External Product 1',
          description: 'Description 1',
          salePrice: 29.99,
          imageUrl: 'https://example.com/img1.jpg',
        },
      });
    });

    it('should update lastSyncAt on mapped product mappings', async () => {
      const mappings = [
        {
          ...mockProductMapping,
          externalId: 'ext-prod-1',
          productId: 'product-1',
        },
      ];
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappings,
      );

      await service.syncProducts(mockIntegrationId);

      expect(prismaService.productMapping.update).toHaveBeenCalledWith({
        where: { id: mappings[0].id },
        data: { lastSyncAt: expect.any(Date) },
      });
    });

    it('should not update unmapped products (left for manual mapping)', async () => {
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      // No existing mappings — all products are unmapped
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncProducts(mockIntegrationId);

      expect(prismaService.product.update).not.toHaveBeenCalled();
      expect(prismaService.productMapping.update).not.toHaveBeenCalled();
    });

    it('should return PARTIAL status when some products fail to sync', async () => {
      const mappings = [
        {
          ...mockProductMapping,
          id: 'mapping-1',
          externalId: 'ext-prod-1',
          productId: 'product-1',
        },
        {
          ...mockProductMapping,
          id: 'mapping-2',
          externalId: 'ext-prod-2',
          productId: 'product-2',
        },
      ];
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappings,
      );

      // First product update succeeds, second fails
      (prismaService.product.update as jest.Mock)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB constraint violation'));

      const result = await service.syncProducts(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.PARTIAL);
      expect(result.processedItems).toBe(1);
      expect(result.failedItems).toBe(1);
      expect(result.errors).toEqual([
        { externalId: 'ext-prod-2', error: 'DB constraint violation' },
      ]);
    });

    it('should return FAILED status when all products fail to sync', async () => {
      const mappings = [
        {
          ...mockProductMapping,
          id: 'mapping-1',
          externalId: 'ext-prod-1',
          productId: 'product-1',
        },
        {
          ...mockProductMapping,
          id: 'mapping-2',
          externalId: 'ext-prod-2',
          productId: 'product-2',
        },
      ];
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappings,
      );

      (prismaService.product.update as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.syncProducts(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.failedItems).toBe(2);
      expect(result.processedItems).toBe(0);
    });

    it('should return COMPLETED with zero items when no external products exist', async () => {
      mockConnector.fetchProducts.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.syncProducts(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.totalItems).toBe(0);
      expect(result.processedItems).toBe(0);
      expect(result.failedItems).toBe(0);
    });

    it('should return FAILED with error details when fetchProducts throws', async () => {
      mockConnector.fetchProducts.mockRejectedValue(
        new Error('API rate limited'),
      );

      const result = await service.syncProducts(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toEqual([
        { externalId: 'N/A', error: 'API rate limited' },
      ]);
    });

    it('should handle non-Error objects thrown by fetchProducts', async () => {
      mockConnector.fetchProducts.mockRejectedValue('string error');

      const result = await service.syncProducts(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toEqual([
        { externalId: 'N/A', error: 'string error' },
      ]);
    });

    it('should handle non-Error objects thrown during individual product sync', async () => {
      const mappings = [
        {
          ...mockProductMapping,
          externalId: 'ext-prod-1',
          productId: 'product-1',
        },
      ];
      mockConnector.fetchProducts.mockResolvedValue([mockExternalProducts[0]]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappings,
      );
      (prismaService.product.update as jest.Mock).mockRejectedValue(42);

      const result = await service.syncProducts(mockIntegrationId);

      expect(result.failedItems).toBe(1);
      expect(result.errors).toEqual([
        { externalId: 'ext-prod-1', error: '42' },
      ]);
    });

    it('should set completedAt on the SyncLog', async () => {
      mockConnector.fetchProducts.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncProducts(mockIntegrationId);

      expect(prismaService.syncLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════
  // syncOrders
  // ════════════════════════════════════════════════════════════

  describe('syncOrders', () => {
    beforeEach(() => {
      setupActiveIntegration();
      setupSyncLogCreate({
        direction: SyncDirection.INBOUND,
        entityType: 'order',
      });
      setupSyncLogUpdate();
    });

    it('should create a SyncLog with INBOUND direction and order entityType', async () => {
      mockConnector.fetchOrders.mockResolvedValue([]);

      await service.syncOrders(mockIntegrationId);

      expect(prismaService.syncLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          integrationId: mockIntegrationId,
          direction: SyncDirection.INBOUND,
          entityType: 'order',
          status: SyncStatus.IN_PROGRESS,
        },
      });
    });

    it('should fetch orders using the connector', async () => {
      mockConnector.fetchOrders.mockResolvedValue(mockExternalOrders);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({});

      await service.syncOrders(mockIntegrationId);

      expect(mockConnector.fetchOrders).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        mockIntegration.shopUrl,
        undefined, // no since date and no lastSyncAt
      );
    });

    it('should pass the since parameter when provided', async () => {
      const sinceDate = new Date('2024-05-01');
      mockConnector.fetchOrders.mockResolvedValue([]);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({});

      await service.syncOrders(mockIntegrationId, sinceDate);

      expect(mockConnector.fetchOrders).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        mockIntegration.shopUrl,
        sinceDate,
      );
    });

    it('should fall back to integration.lastSyncAt when since is not provided', async () => {
      const lastSyncAt = new Date('2024-05-15');
      setupActiveIntegration({ lastSyncAt });
      mockConnector.fetchOrders.mockResolvedValue([]);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({});

      await service.syncOrders(mockIntegrationId);

      expect(mockConnector.fetchOrders).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        mockIntegration.shopUrl,
        lastSyncAt,
      );
    });

    it('should update lastSyncAt on the integration after successful sync', async () => {
      mockConnector.fetchOrders.mockResolvedValue(mockExternalOrders);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({});

      await service.syncOrders(mockIntegrationId);

      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: mockIntegrationId },
        data: { lastSyncAt: expect.any(Date) },
      });
    });

    it('should return COMPLETED status on success', async () => {
      mockConnector.fetchOrders.mockResolvedValue(mockExternalOrders);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({});

      const result = await service.syncOrders(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.totalItems).toBe(1);
      expect(result.processedItems).toBe(1);
      expect(result.failedItems).toBe(0);
    });

    it('should return FAILED status when fetchOrders throws', async () => {
      mockConnector.fetchOrders.mockRejectedValue(
        new Error('Connection timeout'),
      );

      const result = await service.syncOrders(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toEqual([
        { externalId: 'N/A', error: 'Connection timeout' },
      ]);
    });

    it('should handle non-Error objects thrown by fetchOrders', async () => {
      mockConnector.fetchOrders.mockRejectedValue({ code: 'TIMEOUT' });

      const result = await service.syncOrders(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toEqual([
        { externalId: 'N/A', error: '[object Object]' },
      ]);
    });

    it('should set completedAt on the SyncLog', async () => {
      mockConnector.fetchOrders.mockResolvedValue([]);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({});

      await service.syncOrders(mockIntegrationId);

      expect(prismaService.syncLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════
  // syncInventory
  // ════════════════════════════════════════════════════════════

  describe('syncInventory', () => {
    const mappingsWithProducts = [
      {
        ...mockProductMapping,
        id: 'mapping-1',
        externalId: 'ext-prod-1',
        syncDirection: SyncDirection.OUTBOUND,
        product: { id: 'product-1', stock: 100 },
      },
      {
        ...mockProductMapping,
        id: 'mapping-2',
        externalId: 'ext-prod-2',
        syncDirection: SyncDirection.BOTH,
        product: { id: 'product-2', stock: 50 },
      },
    ];

    beforeEach(() => {
      setupActiveIntegration();
      setupSyncLogCreate({
        direction: SyncDirection.OUTBOUND,
        entityType: 'inventory',
      });
      setupSyncLogUpdate();
    });

    it('should create a SyncLog with OUTBOUND direction and inventory entityType', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncInventory(mockIntegrationId);

      expect(prismaService.syncLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          integrationId: mockIntegrationId,
          direction: SyncDirection.OUTBOUND,
          entityType: 'inventory',
          status: SyncStatus.IN_PROGRESS,
        },
      });
    });

    it('should fetch mappings with OUTBOUND or BOTH sync direction', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncInventory(mockIntegrationId);

      expect(prismaService.productMapping.findMany).toHaveBeenCalledWith({
        where: {
          integrationId: mockIntegrationId,
          tenantId: mockTenantId,
          syncDirection: {
            in: [SyncDirection.OUTBOUND, SyncDirection.BOTH],
          },
        },
        include: {
          product: { select: { id: true, stock: true } },
        },
      });
    });

    it('should push inventory for each mapped product', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappingsWithProducts,
      );
      mockConnector.pushInventory.mockResolvedValue(undefined);

      await service.syncInventory(mockIntegrationId);

      expect(mockConnector.pushInventory).toHaveBeenCalledTimes(2);
      expect(mockConnector.pushInventory).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        'ext-prod-1',
        100,
        mockIntegration.shopUrl,
      );
      expect(mockConnector.pushInventory).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        'ext-prod-2',
        50,
        mockIntegration.shopUrl,
      );
    });

    it('should update lastSyncAt on each successfully synced mapping', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappingsWithProducts,
      );
      mockConnector.pushInventory.mockResolvedValue(undefined);

      await service.syncInventory(mockIntegrationId);

      expect(prismaService.productMapping.update).toHaveBeenCalledTimes(2);
      expect(prismaService.productMapping.update).toHaveBeenCalledWith({
        where: { id: 'mapping-1' },
        data: { lastSyncAt: expect.any(Date) },
      });
      expect(prismaService.productMapping.update).toHaveBeenCalledWith({
        where: { id: 'mapping-2' },
        data: { lastSyncAt: expect.any(Date) },
      });
    });

    it('should return COMPLETED status when all inventory pushes succeed', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappingsWithProducts,
      );
      mockConnector.pushInventory.mockResolvedValue(undefined);

      const result = await service.syncInventory(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.totalItems).toBe(2);
      expect(result.processedItems).toBe(2);
      expect(result.failedItems).toBe(0);
    });

    it('should return PARTIAL status when some inventory pushes fail', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappingsWithProducts,
      );
      mockConnector.pushInventory
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const result = await service.syncInventory(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.PARTIAL);
      expect(result.processedItems).toBe(1);
      expect(result.failedItems).toBe(1);
      expect(result.errors).toEqual([
        { externalId: 'ext-prod-2', error: 'Rate limit exceeded' },
      ]);
    });

    it('should return FAILED status when all inventory pushes fail', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappingsWithProducts,
      );
      mockConnector.pushInventory.mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await service.syncInventory(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.failedItems).toBe(2);
      expect(result.processedItems).toBe(0);
    });

    it('should return COMPLETED with zero items when no mappings exist', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.syncInventory(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.totalItems).toBe(0);
    });

    it('should return FAILED with error when productMapping.findMany throws', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockRejectedValue(
        new Error('DB connection lost'),
      );

      const result = await service.syncInventory(mockIntegrationId);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toEqual([
        { externalId: 'N/A', error: 'DB connection lost' },
      ]);
    });

    it('should handle non-Error objects thrown during individual inventory push', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue([
        mappingsWithProducts[0],
      ]);
      mockConnector.pushInventory.mockRejectedValue('unknown failure');

      const result = await service.syncInventory(mockIntegrationId);

      expect(result.failedItems).toBe(1);
      expect(result.errors).toEqual([
        { externalId: 'ext-prod-1', error: 'unknown failure' },
      ]);
    });

    it('should set completedAt on the SyncLog', async () => {
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncInventory(mockIntegrationId);

      expect(prismaService.syncLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════
  // syncAll
  // ════════════════════════════════════════════════════════════

  describe('syncAll', () => {
    beforeEach(() => {
      setupSyncLogCreate();
      setupSyncLogUpdate();
      mockConnector.fetchProducts.mockResolvedValue([]);
      mockConnector.fetchOrders.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (prismaService.integration.update as jest.Mock).mockResolvedValue({});
    });

    it('should run all three syncs when direction is BOTH and all flags are true', async () => {
      setupActiveIntegration({
        syncDirection: SyncDirection.BOTH,
        syncProducts: true,
        syncOrders: true,
        syncInventory: true,
      });

      const results = await service.syncAll(mockIntegrationId);

      expect(results).toHaveLength(3);
      expect(mockConnector.fetchProducts).toHaveBeenCalled();
      expect(mockConnector.fetchOrders).toHaveBeenCalled();
      // syncInventory also runs, verified by productMapping.findMany for inventory
    });

    it('should only run inbound syncs when direction is INBOUND', async () => {
      setupActiveIntegration({
        syncDirection: SyncDirection.INBOUND,
        syncProducts: true,
        syncOrders: true,
        syncInventory: true,
      });

      const results = await service.syncAll(mockIntegrationId);

      expect(results).toHaveLength(2);
      expect(mockConnector.fetchProducts).toHaveBeenCalled();
      expect(mockConnector.fetchOrders).toHaveBeenCalled();
    });

    it('should only run outbound sync when direction is OUTBOUND', async () => {
      setupActiveIntegration({
        syncDirection: SyncDirection.OUTBOUND,
        syncProducts: true,
        syncOrders: true,
        syncInventory: true,
      });

      const results = await service.syncAll(mockIntegrationId);

      expect(results).toHaveLength(1);
      expect(mockConnector.fetchProducts).not.toHaveBeenCalled();
      expect(mockConnector.fetchOrders).not.toHaveBeenCalled();
    });

    it('should skip disabled sync types', async () => {
      setupActiveIntegration({
        syncDirection: SyncDirection.BOTH,
        syncProducts: true,
        syncOrders: false,
        syncInventory: false,
      });

      const results = await service.syncAll(mockIntegrationId);

      expect(results).toHaveLength(1);
      expect(mockConnector.fetchProducts).toHaveBeenCalled();
      expect(mockConnector.fetchOrders).not.toHaveBeenCalled();
    });

    it('should return empty array when no syncs are enabled', async () => {
      setupActiveIntegration({
        syncDirection: SyncDirection.BOTH,
        syncProducts: false,
        syncOrders: false,
        syncInventory: false,
      });

      const results = await service.syncAll(mockIntegrationId);

      expect(results).toHaveLength(0);
    });

    it('should return empty array when direction does not match any sync type', async () => {
      setupActiveIntegration({
        syncDirection: SyncDirection.OUTBOUND,
        syncProducts: true, // products only sync INBOUND, so this won't match
        syncOrders: true, // orders only sync INBOUND, so this won't match
        syncInventory: false,
      });

      const results = await service.syncAll(mockIntegrationId);

      expect(results).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════
  // getUnmappedProducts
  // ════════════════════════════════════════════════════════════

  describe('getUnmappedProducts', () => {
    beforeEach(() => {
      setupActiveIntegration();
    });

    it('should return only unmapped external products', async () => {
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      // ext-prod-1 is already mapped
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue([
        { externalId: 'ext-prod-1' },
      ]);

      const result = await service.getUnmappedProducts(mockIntegrationId);

      expect(result).toHaveLength(1);
      expect(result[0].externalId).toBe('ext-prod-2');
    });

    it('should return all products when none are mapped', async () => {
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.getUnmappedProducts(mockIntegrationId);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when all products are already mapped', async () => {
      mockConnector.fetchProducts.mockResolvedValue(mockExternalProducts);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue([
        { externalId: 'ext-prod-1' },
        { externalId: 'ext-prod-2' },
      ]);

      const result = await service.getUnmappedProducts(mockIntegrationId);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no external products exist', async () => {
      mockConnector.fetchProducts.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.getUnmappedProducts(mockIntegrationId);

      expect(result).toHaveLength(0);
    });

    it('should fetch products using the correct connector credentials', async () => {
      mockConnector.fetchProducts.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.getUnmappedProducts(mockIntegrationId);

      expect(mockConnector.fetchProducts).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        mockIntegration.shopUrl,
      );
    });

    it('should propagate errors from fetchProducts', async () => {
      mockConnector.fetchProducts.mockRejectedValue(
        new Error('API unavailable'),
      );

      await expect(
        service.getUnmappedProducts(mockIntegrationId),
      ).rejects.toThrow('API unavailable');
    });
  });

  // ════════════════════════════════════════════════════════════
  // getActiveIntegration (private, tested via public methods)
  // ════════════════════════════════════════════════════════════

  describe('getActiveIntegration (via public methods)', () => {
    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.syncProducts(mockIntegrationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.syncProducts(mockIntegrationId)).rejects.toThrow(
        'Integración no encontrada',
      );
    });

    it('should throw NotFoundException when integration has no accessToken', async () => {
      setupActiveIntegration({ accessToken: null });

      await expect(service.syncProducts(mockIntegrationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.syncProducts(mockIntegrationId)).rejects.toThrow(
        'La integración no tiene credenciales configuradas',
      );
    });

    it('should scope integration lookup to current tenant', async () => {
      setupActiveIntegration();
      setupSyncLogCreate();
      setupSyncLogUpdate();
      mockConnector.fetchProducts.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncProducts(mockIntegrationId);

      expect(prismaService.integration.findFirst).toHaveBeenCalledWith({
        where: { id: mockIntegrationId, tenantId: mockTenantId },
      });
    });

    it('should pass shopUrl as undefined when integration has null shopUrl', async () => {
      setupActiveIntegration({ shopUrl: null });
      setupSyncLogCreate();
      setupSyncLogUpdate();
      mockConnector.fetchProducts.mockResolvedValue([]);
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      await service.syncProducts(mockIntegrationId);

      expect(mockConnector.fetchProducts).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        undefined,
      );
    });
  });
});
