import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  IntegrationPlatform,
  IntegrationStatus,
  SyncDirection,
} from '@prisma/client';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { ShopifyConnector } from './connectors/shopify.connector';
import { MercadoLibreConnector } from './connectors/mercadolibre.connector';
import { WooCommerceConnector } from './connectors/woocommerce.connector';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let shopifyConnector: jest.Mocked<ShopifyConnector>;
  let mercadoLibreConnector: jest.Mocked<MercadoLibreConnector>;
  let wooCommerceConnector: jest.Mocked<WooCommerceConnector>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockIntegration = {
    id: 'integration-1',
    tenantId: mockTenantId,
    platform: IntegrationPlatform.SHOPIFY,
    name: 'Mi Tienda Shopify',
    shopUrl: 'https://mitienda.myshopify.com',
    accessToken: 'shpat_abc123',
    refreshToken: null,
    syncDirection: SyncDirection.BOTH,
    syncProducts: true,
    syncOrders: true,
    syncInventory: true,
    status: IntegrationStatus.CONNECTED,
    lastSyncAt: null,
    tokenExpiry: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockIntegration2 = {
    ...mockIntegration,
    id: 'integration-2',
    platform: IntegrationPlatform.MERCADOLIBRE,
    name: 'MercadoLibre Seller',
    shopUrl: null,
    accessToken: 'ml-token-xyz',
  };

  const mockMapping = {
    id: 'mapping-1',
    tenantId: mockTenantId,
    integrationId: 'integration-1',
    productId: 'product-1',
    externalId: 'ext-prod-001',
    externalSku: 'EXT-SKU-001',
    externalUrl: 'https://mitienda.myshopify.com/products/test',
    syncDirection: SyncDirection.BOTH,
    lastSyncAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProduct = {
    id: 'product-1',
    tenantId: mockTenantId,
    name: 'Test Product',
    sku: 'SKU-001',
  };

  const mockSyncLog = {
    id: 'sync-log-1',
    tenantId: mockTenantId,
    integrationId: 'integration-1',
    direction: SyncDirection.INBOUND,
    status: 'SUCCESS',
    recordsProcessed: 10,
    errors: null,
    createdAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      integration: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      productMapping: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
      syncLog: {
        findMany: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockShopifyConnector = {
      platform: IntegrationPlatform.SHOPIFY,
      verifyConnection: jest.fn(),
      fetchProducts: jest.fn(),
      fetchOrders: jest.fn(),
      pushInventory: jest.fn(),
      verifyWebhook: jest.fn(),
    };

    const mockMercadoLibreConnector = {
      platform: IntegrationPlatform.MERCADOLIBRE,
      verifyConnection: jest.fn(),
      fetchProducts: jest.fn(),
      fetchOrders: jest.fn(),
      pushInventory: jest.fn(),
      verifyWebhook: jest.fn(),
    };

    const mockWooCommerceConnector = {
      platform: IntegrationPlatform.WOOCOMMERCE,
      verifyConnection: jest.fn(),
      fetchProducts: jest.fn(),
      fetchOrders: jest.fn(),
      pushInventory: jest.fn(),
      verifyWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: ShopifyConnector, useValue: mockShopifyConnector },
        { provide: MercadoLibreConnector, useValue: mockMercadoLibreConnector },
        { provide: WooCommerceConnector, useValue: mockWooCommerceConnector },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);
    shopifyConnector = module.get(ShopifyConnector);
    mercadoLibreConnector = module.get(MercadoLibreConnector);
    wooCommerceConnector = module.get(WooCommerceConnector);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ────────────────────── getConnector ──────────────────────

  describe('getConnector', () => {
    it('should return the Shopify connector', () => {
      const connector = service.getConnector(IntegrationPlatform.SHOPIFY);
      expect(connector).toBe(shopifyConnector);
    });

    it('should return the MercadoLibre connector', () => {
      const connector = service.getConnector(IntegrationPlatform.MERCADOLIBRE);
      expect(connector).toBe(mercadoLibreConnector);
    });

    it('should return the WooCommerce connector', () => {
      const connector = service.getConnector(IntegrationPlatform.WOOCOMMERCE);
      expect(connector).toBe(wooCommerceConnector);
    });

    it('should throw BadRequestException for unsupported platform', () => {
      expect(() =>
        service.getConnector('AMAZON' as IntegrationPlatform),
      ).toThrow(BadRequestException);
    });
  });

  // ────────────────────── findAll ──────────────────────

  describe('findAll', () => {
    it('should return all integrations for the current tenant', async () => {
      const integrations = [
        { ...mockIntegration, _count: { productMappings: 3, syncLogs: 5 } },
        { ...mockIntegration2, _count: { productMappings: 1, syncLogs: 2 } },
      ];
      (prismaService.integration.findMany as jest.Mock).mockResolvedValue(
        integrations,
      );

      const result = await service.findAll();

      expect(result).toEqual(integrations);
      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
      expect(prismaService.integration.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { productMappings: true, syncLogs: true },
          },
        },
      });
    });

    it('should return an empty array when no integrations exist', async () => {
      (prismaService.integration.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should scope the query to the current tenant', async () => {
      (prismaService.integration.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll();

      expect(prismaService.integration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        }),
      );
    });
  });

  // ────────────────────── findOne ──────────────────────

  describe('findOne', () => {
    it('should return a single integration with product mappings', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [{ ...mockMapping, product: mockProduct }],
        _count: { syncLogs: 5 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );

      const result = await service.findOne('integration-1');

      expect(result).toEqual(integrationWithMappings);
      expect(prismaService.integration.findFirst).toHaveBeenCalledWith({
        where: { id: 'integration-1', tenantId: mockTenantId },
        include: {
          productMappings: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          _count: { select: { syncLogs: true } },
        },
      });
    });

    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not return integrations from other tenants', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('integration-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaService.integration.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'integration-1', tenantId: mockTenantId },
        }),
      );
    });
  });

  // ────────────────────── create ──────────────────────

  describe('create', () => {
    const createDto = {
      platform: IntegrationPlatform.SHOPIFY,
      name: 'Mi Tienda Shopify',
      shopUrl: 'https://mitienda.myshopify.com',
      accessToken: 'shpat_abc123',
    };

    it('should create an integration with CONNECTED status when token is valid', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(true);
      (prismaService.integration.create as jest.Mock).mockResolvedValue(
        mockIntegration,
      );

      const result = await service.create(createDto);

      expect(result).toEqual(mockIntegration);
      expect(shopifyConnector.verifyConnection).toHaveBeenCalledWith(
        'shpat_abc123',
        'https://mitienda.myshopify.com',
      );
      expect(prismaService.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          platform: IntegrationPlatform.SHOPIFY,
          name: 'Mi Tienda Shopify',
          status: IntegrationStatus.CONNECTED,
        }),
      });
    });

    it('should create with ERROR status when token verification fails', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(false);
      (prismaService.integration.create as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        status: IntegrationStatus.ERROR,
      });

      await service.create(createDto);

      expect(prismaService.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: IntegrationStatus.ERROR,
        }),
      });
    });

    it('should create with ERROR status when connector throws', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );
      (prismaService.integration.create as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        status: IntegrationStatus.ERROR,
      });

      await service.create(createDto);

      expect(prismaService.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: IntegrationStatus.ERROR,
        }),
      });
    });

    it('should create with PENDING status when no access token is provided', async () => {
      const dtoWithoutToken = {
        platform: IntegrationPlatform.SHOPIFY,
        name: 'Mi Tienda Shopify',
        shopUrl: 'https://mitienda.myshopify.com',
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.integration.create as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        accessToken: null,
        status: IntegrationStatus.PENDING,
      });

      await service.create(dtoWithoutToken);

      expect(shopifyConnector.verifyConnection).not.toHaveBeenCalled();
      expect(prismaService.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: IntegrationStatus.PENDING,
        }),
      });
    });

    it('should throw ConflictException when duplicate integration exists', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.integration.create).not.toHaveBeenCalled();
    });

    it('should apply default sync settings', async () => {
      const minimalDto = {
        platform: IntegrationPlatform.MERCADOLIBRE,
        name: 'ML Integration',
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.integration.create as jest.Mock).mockResolvedValue(
        mockIntegration2,
      );

      await service.create(minimalDto);

      expect(prismaService.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          syncDirection: SyncDirection.BOTH,
          syncProducts: true,
          syncOrders: true,
          syncInventory: true,
        }),
      });
    });

    it('should use provided sync settings when specified', async () => {
      const customDto = {
        platform: IntegrationPlatform.SHOPIFY,
        name: 'Read-only Shopify',
        syncDirection: SyncDirection.INBOUND,
        syncProducts: true,
        syncOrders: false,
        syncInventory: false,
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.integration.create as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        syncDirection: SyncDirection.INBOUND,
        syncOrders: false,
        syncInventory: false,
      });

      await service.create(customDto);

      expect(prismaService.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          syncDirection: SyncDirection.INBOUND,
          syncProducts: true,
          syncOrders: false,
          syncInventory: false,
        }),
      });
    });

    it('should scope the duplicate check to the current tenant', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.integration.create as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(true);

      await service.create(createDto);

      expect(prismaService.integration.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          platform: IntegrationPlatform.SHOPIFY,
          shopUrl: 'https://mitienda.myshopify.com',
        },
      });
    });

    it('should pass null for shopUrl when not provided', async () => {
      const dtoNoUrl = {
        platform: IntegrationPlatform.MERCADOLIBRE,
        name: 'ML Integration',
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.integration.create as jest.Mock).mockResolvedValue(
        mockIntegration2,
      );

      await service.create(dtoNoUrl);

      expect(prismaService.integration.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          platform: IntegrationPlatform.MERCADOLIBRE,
          shopUrl: null,
        },
      });
    });
  });

  // ────────────────────── update ──────────────────────

  describe('update', () => {
    it('should update an integration without re-verifying when token is unchanged', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (prismaService.integration.update as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        name: 'Updated Name',
      });

      const result = await service.update('integration-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(shopifyConnector.verifyConnection).not.toHaveBeenCalled();
      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should re-verify connection when access token changes', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(true);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        accessToken: 'new-token',
        status: IntegrationStatus.CONNECTED,
      });

      await service.update('integration-1', { accessToken: 'new-token' });

      expect(shopifyConnector.verifyConnection).toHaveBeenCalledWith(
        'new-token',
        'https://mitienda.myshopify.com',
      );
      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
        data: {
          accessToken: 'new-token',
          status: IntegrationStatus.CONNECTED,
        },
      });
    });

    it('should set ERROR status when new token verification fails', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(false);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        accessToken: 'bad-token',
        status: IntegrationStatus.ERROR,
      });

      await service.update('integration-1', { accessToken: 'bad-token' });

      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
        data: {
          accessToken: 'bad-token',
          status: IntegrationStatus.ERROR,
        },
      });
    });

    it('should set ERROR status when connector throws during re-verification', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockRejectedValue(
        new Error('Connection refused'),
      );
      (prismaService.integration.update as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        status: IntegrationStatus.ERROR,
      });

      await service.update('integration-1', { accessToken: 'new-token' });

      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
        data: {
          accessToken: 'new-token',
          status: IntegrationStatus.ERROR,
        },
      });
    });

    it('should not re-verify when the same token is submitted', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (prismaService.integration.update as jest.Mock).mockResolvedValue(
        mockIntegration,
      );

      await service.update('integration-1', {
        accessToken: mockIntegration.accessToken,
      });

      expect(shopifyConnector.verifyConnection).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.update('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.integration.update).not.toHaveBeenCalled();
    });

    it('should use the updated shopUrl for verification when both change', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(true);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        shopUrl: 'https://new-shop.myshopify.com',
        accessToken: 'new-token',
      });

      await service.update('integration-1', {
        accessToken: 'new-token',
        shopUrl: 'https://new-shop.myshopify.com',
      });

      expect(shopifyConnector.verifyConnection).toHaveBeenCalledWith(
        'new-token',
        'https://new-shop.myshopify.com',
      );
    });

    it('should fall back to existing shopUrl for verification when only token changes', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(true);
      (prismaService.integration.update as jest.Mock).mockResolvedValue(
        mockIntegration,
      );

      await service.update('integration-1', { accessToken: 'new-token' });

      expect(shopifyConnector.verifyConnection).toHaveBeenCalledWith(
        'new-token',
        mockIntegration.shopUrl,
      );
    });
  });

  // ────────────────────── remove ──────────────────────

  describe('remove', () => {
    it('should delete an integration', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (prismaService.integration.delete as jest.Mock).mockResolvedValue(
        mockIntegration,
      );

      const result = await service.remove('integration-1');

      expect(result).toEqual(mockIntegration);
      expect(prismaService.integration.delete).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
      });
    });

    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.integration.delete).not.toHaveBeenCalled();
    });

    it('should scope the lookup to the current tenant', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        mockIntegration,
      );
      (prismaService.integration.delete as jest.Mock).mockResolvedValue(
        mockIntegration,
      );

      await service.remove('integration-1');

      expect(prismaService.integration.findFirst).toHaveBeenCalledWith({
        where: { id: 'integration-1', tenantId: mockTenantId },
      });
    });
  });

  // ────────────────────── verifyConnection ──────────────────────

  describe('verifyConnection', () => {
    it('should return connected true and update status to CONNECTED', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(true);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        status: IntegrationStatus.CONNECTED,
      });

      const result = await service.verifyConnection('integration-1');

      expect(result).toEqual({ connected: true });
      expect(shopifyConnector.verifyConnection).toHaveBeenCalledWith(
        mockIntegration.accessToken,
        mockIntegration.shopUrl,
      );
      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
        data: { status: IntegrationStatus.CONNECTED },
      });
    });

    it('should return connected false and update status to DISCONNECTED', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockResolvedValue(false);
      (prismaService.integration.update as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        status: IntegrationStatus.DISCONNECTED,
      });

      const result = await service.verifyConnection('integration-1');

      expect(result).toEqual({ connected: false });
      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
        data: { status: IntegrationStatus.DISCONNECTED },
      });
    });

    it('should return connected false when no access token exists', async () => {
      const integrationNoToken = {
        ...mockIntegration,
        accessToken: null,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationNoToken,
      );

      const result = await service.verifyConnection('integration-1');

      expect(result).toEqual({ connected: false });
      expect(shopifyConnector.verifyConnection).not.toHaveBeenCalled();
      expect(prismaService.integration.update).not.toHaveBeenCalled();
    });

    it('should return connected false and set ERROR status when connector throws', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (shopifyConnector.verifyConnection as jest.Mock).mockRejectedValue(
        new Error('API error'),
      );
      (prismaService.integration.update as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        status: IntegrationStatus.ERROR,
      });

      const result = await service.verifyConnection('integration-1');

      expect(result).toEqual({ connected: false });
      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
        data: { status: IntegrationStatus.ERROR },
      });
    });

    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.verifyConnection('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ────────────────────── findMappings ──────────────────────

  describe('findMappings', () => {
    it('should return product mappings for an integration', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      const mappingsWithProduct = [
        {
          ...mockMapping,
          product: {
            id: 'product-1',
            name: 'Test Product',
            sku: 'SKU-001',
            salePrice: 79.99,
          },
        },
      ];
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        mappingsWithProduct,
      );

      const result = await service.findMappings('integration-1');

      expect(result).toEqual(mappingsWithProduct);
      expect(prismaService.productMapping.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, integrationId: 'integration-1' },
        include: {
          product: {
            select: { id: true, name: true, sku: true, salePrice: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findMappings('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.productMapping.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when no mappings exist', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (prismaService.productMapping.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.findMappings('integration-1');

      expect(result).toEqual([]);
    });
  });

  // ────────────────────── createMapping ──────────────────────

  describe('createMapping', () => {
    const mappingDto = {
      productId: 'product-1',
      externalId: 'ext-prod-001',
      externalSku: 'EXT-SKU-001',
      externalUrl: 'https://mitienda.myshopify.com/products/test',
    };

    beforeEach(() => {
      // Default: integration exists, product exists, no duplicate
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (prismaService.productMapping.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
    });

    it('should create a product mapping', async () => {
      const createdMapping = {
        ...mockMapping,
        product: { id: 'product-1', name: 'Test Product', sku: 'SKU-001' },
      };
      (prismaService.productMapping.create as jest.Mock).mockResolvedValue(
        createdMapping,
      );

      const result = await service.createMapping('integration-1', mappingDto);

      expect(result).toEqual(createdMapping);
      expect(prismaService.productMapping.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          integrationId: 'integration-1',
          productId: 'product-1',
          externalId: 'ext-prod-001',
          externalSku: 'EXT-SKU-001',
          externalUrl: 'https://mitienda.myshopify.com/products/test',
          syncDirection: SyncDirection.BOTH,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      });
    });

    it('should use custom sync direction when provided', async () => {
      const dtoWithDirection = {
        ...mappingDto,
        syncDirection: SyncDirection.INBOUND,
      };
      (prismaService.productMapping.create as jest.Mock).mockResolvedValue(
        mockMapping,
      );

      await service.createMapping('integration-1', dtoWithDirection);

      expect(prismaService.productMapping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          syncDirection: SyncDirection.INBOUND,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.createMapping('nonexistent', mappingDto),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.productMapping.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not belong to tenant', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createMapping('integration-1', mappingDto),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.productMapping.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when duplicate mapping exists by externalId', async () => {
      (prismaService.productMapping.findFirst as jest.Mock).mockResolvedValue(
        mockMapping,
      );

      await expect(
        service.createMapping('integration-1', mappingDto),
      ).rejects.toThrow(ConflictException);
      expect(prismaService.productMapping.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when duplicate mapping exists by productId', async () => {
      (prismaService.productMapping.findFirst as jest.Mock).mockResolvedValue({
        ...mockMapping,
        externalId: 'different-ext-id',
      });

      await expect(
        service.createMapping('integration-1', {
          ...mappingDto,
          externalId: 'different-ext-id',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should check for duplicate mappings with OR condition', async () => {
      (prismaService.productMapping.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.productMapping.create as jest.Mock).mockResolvedValue(
        mockMapping,
      );

      await service.createMapping('integration-1', mappingDto);

      expect(prismaService.productMapping.findFirst).toHaveBeenCalledWith({
        where: {
          integrationId: 'integration-1',
          OR: [
            { externalId: 'ext-prod-001' },
            { productId: 'product-1' },
          ],
        },
      });
    });

    it('should verify product belongs to tenant', async () => {
      (prismaService.productMapping.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.productMapping.create as jest.Mock).mockResolvedValue(
        mockMapping,
      );

      await service.createMapping('integration-1', mappingDto);

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-1', tenantId: mockTenantId },
      });
    });
  });

  // ────────────────────── removeMapping ──────────────────────

  describe('removeMapping', () => {
    it('should delete a product mapping', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (prismaService.productMapping.findFirst as jest.Mock).mockResolvedValue(
        mockMapping,
      );
      (prismaService.productMapping.delete as jest.Mock).mockResolvedValue(
        mockMapping,
      );

      const result = await service.removeMapping('integration-1', 'mapping-1');

      expect(result).toEqual(mockMapping);
      expect(prismaService.productMapping.delete).toHaveBeenCalledWith({
        where: { id: 'mapping-1' },
      });
    });

    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.removeMapping('nonexistent', 'mapping-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.productMapping.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when mapping does not exist', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (prismaService.productMapping.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.removeMapping('integration-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.productMapping.delete).not.toHaveBeenCalled();
    });

    it('should scope the mapping lookup to tenant and integration', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (prismaService.productMapping.findFirst as jest.Mock).mockResolvedValue(
        mockMapping,
      );
      (prismaService.productMapping.delete as jest.Mock).mockResolvedValue(
        mockMapping,
      );

      await service.removeMapping('integration-1', 'mapping-1');

      expect(prismaService.productMapping.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'mapping-1',
          integrationId: 'integration-1',
          tenantId: mockTenantId,
        },
      });
    });
  });

  // ────────────────────── findSyncLogs ──────────────────────

  describe('findSyncLogs', () => {
    it('should return sync logs for an integration', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 1 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (prismaService.syncLog.findMany as jest.Mock).mockResolvedValue([
        mockSyncLog,
      ]);

      const result = await service.findSyncLogs('integration-1');

      expect(result).toEqual([mockSyncLog]);
      expect(prismaService.syncLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, integrationId: 'integration-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should respect the limit parameter', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (prismaService.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.findSyncLogs('integration-1', 50);

      expect(prismaService.syncLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should use default limit of 20', async () => {
      const integrationWithMappings = {
        ...mockIntegration,
        productMappings: [],
        _count: { syncLogs: 0 },
      };
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        integrationWithMappings,
      );
      (prismaService.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.findSyncLogs('integration-1');

      expect(prismaService.syncLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it('should throw NotFoundException when integration does not exist', async () => {
      (prismaService.integration.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findSyncLogs('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.syncLog.findMany).not.toHaveBeenCalled();
    });
  });
});
