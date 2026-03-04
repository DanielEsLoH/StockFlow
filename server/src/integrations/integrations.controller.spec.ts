import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationsSyncService } from './sync.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';
import {
  IntegrationPlatform,
  IntegrationStatus,
  SyncDirection,
  SyncStatus,
} from '@prisma/client';

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let integrationsService: jest.Mocked<IntegrationsService>;
  let syncService: jest.Mocked<IntegrationsSyncService>;

  const mockIntegration = {
    id: 'integration-1',
    tenantId: 'tenant-123',
    platform: IntegrationPlatform.SHOPIFY,
    name: 'Mi Tienda Shopify',
    shopUrl: 'https://mitienda.myshopify.com',
    accessToken: 'shpat_test_token',
    refreshToken: null,
    syncDirection: SyncDirection.BOTH,
    syncProducts: true,
    syncOrders: true,
    syncInventory: true,
    status: IntegrationStatus.CONNECTED,
    lastSyncAt: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  };

  const mockMapping = {
    id: 'mapping-1',
    tenantId: 'tenant-123',
    integrationId: 'integration-1',
    productId: 'cmkcykam80004reya0hsdx337',
    externalId: 'ext-prod-1',
    externalSku: 'EXT-SKU-001',
    externalUrl: 'https://shop.example.com/product/1',
    syncDirection: SyncDirection.BOTH,
    lastSyncAt: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  };

  const mockSyncLog = {
    id: 'sync-log-1',
    tenantId: 'tenant-123',
    integrationId: 'integration-1',
    direction: SyncDirection.INBOUND,
    entityType: 'product',
    status: SyncStatus.COMPLETED,
    totalItems: 10,
    processedItems: 10,
    failedItems: 0,
    errors: null,
    completedAt: new Date('2024-06-01T12:00:00Z'),
    createdAt: new Date('2024-06-01T11:59:00Z'),
    updatedAt: new Date('2024-06-01T12:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockIntegrationsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      verifyConnection: jest.fn(),
      findMappings: jest.fn(),
      createMapping: jest.fn(),
      removeMapping: jest.fn(),
      findSyncLogs: jest.fn(),
    };

    const mockSyncService = {
      syncAll: jest.fn(),
      syncProducts: jest.fn(),
      syncOrders: jest.fn(),
      syncInventory: jest.fn(),
      getUnmappedProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        { provide: IntegrationsService, useValue: mockIntegrationsService },
        { provide: IntegrationsSyncService, useValue: mockSyncService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
    integrationsService = module.get(IntegrationsService);
    syncService = module.get(IntegrationsSyncService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ────────────────────── Integration CRUD ──────────────────────

  describe('findAll', () => {
    it('should return all integrations', async () => {
      const integrations = [mockIntegration];
      integrationsService.findAll.mockResolvedValue(integrations as any);

      const result = await controller.findAll();

      expect(result).toEqual(integrations);
      expect(integrationsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no integrations exist', async () => {
      integrationsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });

    it('should return multiple integrations', async () => {
      const integrations = [
        mockIntegration,
        {
          ...mockIntegration,
          id: 'integration-2',
          platform: IntegrationPlatform.WOOCOMMERCE,
          name: 'Mi WooCommerce',
        },
      ];
      integrationsService.findAll.mockResolvedValue(integrations as any);

      const result = await controller.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a single integration by id', async () => {
      integrationsService.findOne.mockResolvedValue(mockIntegration as any);

      const result = await controller.findOne('integration-1');

      expect(result).toEqual(mockIntegration);
      expect(integrationsService.findOne).toHaveBeenCalledWith('integration-1');
    });

    it('should propagate NotFoundException when integration does not exist', async () => {
      integrationsService.findOne.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      platform: IntegrationPlatform.SHOPIFY,
      name: 'Nueva Tienda',
      shopUrl: 'https://nueva.myshopify.com',
      accessToken: 'shpat_new_token',
    };

    it('should create a new integration', async () => {
      const created = {
        ...mockIntegration,
        id: 'integration-new',
        name: 'Nueva Tienda',
        shopUrl: 'https://nueva.myshopify.com',
      };
      integrationsService.create.mockResolvedValue(created as any);

      const result = await controller.create(createDto as any);

      expect(result).toEqual(created);
      expect(integrationsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate ConflictException for duplicate integration', async () => {
      integrationsService.create.mockRejectedValue(
        new ConflictException(
          'Ya existe una integracion para SHOPIFY con esta URL',
        ),
      );

      await expect(controller.create(createDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate BadRequestException for unsupported platform', async () => {
      integrationsService.create.mockRejectedValue(
        new BadRequestException('Plataforma no soportada'),
      );

      await expect(controller.create(createDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create integration without optional fields', async () => {
      const minimalDto = {
        platform: IntegrationPlatform.MERCADOLIBRE,
        name: 'MercadoLibre',
      };
      const created = {
        ...mockIntegration,
        id: 'integration-ml',
        platform: IntegrationPlatform.MERCADOLIBRE,
        name: 'MercadoLibre',
        shopUrl: null,
        accessToken: null,
        status: IntegrationStatus.PENDING,
      };
      integrationsService.create.mockResolvedValue(created as any);

      const result = await controller.create(minimalDto as any);

      expect(result).toEqual(created);
      expect(integrationsService.create).toHaveBeenCalledWith(minimalDto);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Tienda Actualizada',
      accessToken: 'shpat_updated_token',
    };

    it('should update an integration', async () => {
      const updated = {
        ...mockIntegration,
        name: 'Tienda Actualizada',
        accessToken: 'shpat_updated_token',
      };
      integrationsService.update.mockResolvedValue(updated as any);

      const result = await controller.update('integration-1', updateDto as any);

      expect(result).toEqual(updated);
      expect(integrationsService.update).toHaveBeenCalledWith(
        'integration-1',
        updateDto,
      );
    });

    it('should propagate NotFoundException when updating nonexistent integration', async () => {
      integrationsService.update.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(
        controller.update('nonexistent', updateDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields (partial update)', async () => {
      const partialDto = { name: 'Solo Nombre' };
      const updated = { ...mockIntegration, name: 'Solo Nombre' };
      integrationsService.update.mockResolvedValue(updated as any);

      const result = await controller.update(
        'integration-1',
        partialDto as any,
      );

      expect(result.name).toBe('Solo Nombre');
      expect(integrationsService.update).toHaveBeenCalledWith(
        'integration-1',
        partialDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete an integration', async () => {
      integrationsService.remove.mockResolvedValue(mockIntegration as any);

      const result = await controller.remove('integration-1');

      expect(result).toEqual(mockIntegration);
      expect(integrationsService.remove).toHaveBeenCalledWith('integration-1');
    });

    it('should propagate NotFoundException when deleting nonexistent integration', async () => {
      integrationsService.remove.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(controller.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verifyConnection', () => {
    it('should verify a connected integration', async () => {
      integrationsService.verifyConnection.mockResolvedValue({
        connected: true,
      });

      const result = await controller.verifyConnection('integration-1');

      expect(result).toEqual({ connected: true });
      expect(integrationsService.verifyConnection).toHaveBeenCalledWith(
        'integration-1',
      );
    });

    it('should return connected false for disconnected integration', async () => {
      integrationsService.verifyConnection.mockResolvedValue({
        connected: false,
      });

      const result = await controller.verifyConnection('integration-1');

      expect(result).toEqual({ connected: false });
    });

    it('should propagate NotFoundException', async () => {
      integrationsService.verifyConnection.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(
        controller.verifyConnection('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────── Product Mappings ──────────────────────

  describe('findMappings', () => {
    it('should return product mappings for an integration', async () => {
      const mappings = [mockMapping];
      integrationsService.findMappings.mockResolvedValue(mappings as any);

      const result = await controller.findMappings('integration-1');

      expect(result).toEqual(mappings);
      expect(integrationsService.findMappings).toHaveBeenCalledWith(
        'integration-1',
      );
    });

    it('should return empty array when no mappings exist', async () => {
      integrationsService.findMappings.mockResolvedValue([]);

      const result = await controller.findMappings('integration-1');

      expect(result).toEqual([]);
    });

    it('should propagate NotFoundException for nonexistent integration', async () => {
      integrationsService.findMappings.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(controller.findMappings('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createMapping', () => {
    const createMappingDto = {
      productId: 'cmkcykam80004reya0hsdx337',
      externalId: 'ext-prod-2',
      externalSku: 'EXT-SKU-002',
      externalUrl: 'https://shop.example.com/product/2',
    };

    it('should create a product mapping', async () => {
      const created = {
        ...mockMapping,
        id: 'mapping-new',
        externalId: 'ext-prod-2',
      };
      integrationsService.createMapping.mockResolvedValue(created as any);

      const result = await controller.createMapping(
        'integration-1',
        createMappingDto as any,
      );

      expect(result).toEqual(created);
      expect(integrationsService.createMapping).toHaveBeenCalledWith(
        'integration-1',
        createMappingDto,
      );
    });

    it('should propagate NotFoundException when integration does not exist', async () => {
      integrationsService.createMapping.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(
        controller.createMapping('nonexistent', createMappingDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate NotFoundException when product does not exist', async () => {
      integrationsService.createMapping.mockRejectedValue(
        new NotFoundException('Producto no encontrado'),
      );

      await expect(
        controller.createMapping('integration-1', createMappingDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException for duplicate mapping', async () => {
      integrationsService.createMapping.mockRejectedValue(
        new ConflictException(
          'Ya existe un mapeo para este producto o ID externo',
        ),
      );

      await expect(
        controller.createMapping('integration-1', createMappingDto as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create mapping with minimal fields', async () => {
      const minimalDto = {
        productId: 'cmkcykam80004reya0hsdx337',
        externalId: 'ext-prod-3',
      };
      const created = {
        ...mockMapping,
        id: 'mapping-minimal',
        externalId: 'ext-prod-3',
        externalSku: null,
        externalUrl: null,
      };
      integrationsService.createMapping.mockResolvedValue(created as any);

      const result = await controller.createMapping(
        'integration-1',
        minimalDto as any,
      );

      expect(result).toEqual(created);
      expect(integrationsService.createMapping).toHaveBeenCalledWith(
        'integration-1',
        minimalDto,
      );
    });
  });

  describe('removeMapping', () => {
    it('should delete a product mapping', async () => {
      integrationsService.removeMapping.mockResolvedValue(mockMapping as any);

      const result = await controller.removeMapping(
        'integration-1',
        'mapping-1',
      );

      expect(result).toEqual(mockMapping);
      expect(integrationsService.removeMapping).toHaveBeenCalledWith(
        'integration-1',
        'mapping-1',
      );
    });

    it('should propagate NotFoundException for nonexistent integration', async () => {
      integrationsService.removeMapping.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(
        controller.removeMapping('nonexistent', 'mapping-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate NotFoundException for nonexistent mapping', async () => {
      integrationsService.removeMapping.mockRejectedValue(
        new NotFoundException('Mapeo de producto no encontrado'),
      );

      await expect(
        controller.removeMapping('integration-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────── Sync Operations ──────────────────────

  describe('syncAll', () => {
    it('should run all syncs and return sync logs', async () => {
      const syncLogs = [
        { ...mockSyncLog, id: 'sync-1', entityType: 'product' },
        { ...mockSyncLog, id: 'sync-2', entityType: 'order' },
        { ...mockSyncLog, id: 'sync-3', entityType: 'inventory' },
      ];
      syncService.syncAll.mockResolvedValue(syncLogs as any);

      const result = await controller.syncAll('integration-1');

      expect(result).toEqual(syncLogs);
      expect(result).toHaveLength(3);
      expect(syncService.syncAll).toHaveBeenCalledWith('integration-1');
    });

    it('should return empty array when no syncs are enabled', async () => {
      syncService.syncAll.mockResolvedValue([]);

      const result = await controller.syncAll('integration-1');

      expect(result).toEqual([]);
    });

    it('should propagate NotFoundException for nonexistent integration', async () => {
      syncService.syncAll.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(controller.syncAll('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncProducts', () => {
    it('should sync products and return sync log', async () => {
      syncService.syncProducts.mockResolvedValue(mockSyncLog as any);

      const result = await controller.syncProducts('integration-1');

      expect(result).toEqual(mockSyncLog);
      expect(syncService.syncProducts).toHaveBeenCalledWith('integration-1');
    });

    it('should propagate NotFoundException for nonexistent integration', async () => {
      syncService.syncProducts.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(controller.syncProducts('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle partial sync result', async () => {
      const partialSyncLog = {
        ...mockSyncLog,
        status: SyncStatus.PARTIAL,
        totalItems: 10,
        processedItems: 7,
        failedItems: 3,
      };
      syncService.syncProducts.mockResolvedValue(partialSyncLog as any);

      const result = await controller.syncProducts('integration-1');

      expect(result.status).toBe(SyncStatus.PARTIAL);
      expect(result.failedItems).toBe(3);
    });

    it('should handle failed sync result', async () => {
      const failedSyncLog = {
        ...mockSyncLog,
        status: SyncStatus.FAILED,
        processedItems: 0,
        failedItems: 10,
      };
      syncService.syncProducts.mockResolvedValue(failedSyncLog as any);

      const result = await controller.syncProducts('integration-1');

      expect(result.status).toBe(SyncStatus.FAILED);
    });
  });

  describe('syncOrders', () => {
    it('should sync orders and return sync log', async () => {
      const orderSyncLog = {
        ...mockSyncLog,
        entityType: 'order',
      };
      syncService.syncOrders.mockResolvedValue(orderSyncLog as any);

      const result = await controller.syncOrders('integration-1');

      expect(result).toEqual(orderSyncLog);
      expect(syncService.syncOrders).toHaveBeenCalledWith('integration-1');
    });

    it('should propagate NotFoundException for nonexistent integration', async () => {
      syncService.syncOrders.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(controller.syncOrders('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncInventory', () => {
    it('should sync inventory and return sync log', async () => {
      const inventorySyncLog = {
        ...mockSyncLog,
        entityType: 'inventory',
        direction: SyncDirection.OUTBOUND,
      };
      syncService.syncInventory.mockResolvedValue(inventorySyncLog as any);

      const result = await controller.syncInventory('integration-1');

      expect(result).toEqual(inventorySyncLog);
      expect(syncService.syncInventory).toHaveBeenCalledWith('integration-1');
    });

    it('should propagate NotFoundException for nonexistent integration', async () => {
      syncService.syncInventory.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(controller.syncInventory('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUnmappedProducts', () => {
    it('should return unmapped external products', async () => {
      const unmapped = [
        {
          externalId: 'ext-3',
          name: 'Product 3',
          sku: 'SKU-3',
          price: 29.99,
          imageUrl: null,
          description: null,
        },
        {
          externalId: 'ext-4',
          name: 'Product 4',
          sku: 'SKU-4',
          price: 39.99,
          imageUrl: null,
          description: null,
        },
      ];
      syncService.getUnmappedProducts.mockResolvedValue(unmapped);

      const result = await controller.getUnmappedProducts('integration-1');

      expect(result).toEqual(unmapped);
      expect(result).toHaveLength(2);
      expect(syncService.getUnmappedProducts).toHaveBeenCalledWith(
        'integration-1',
      );
    });

    it('should return empty array when all products are mapped', async () => {
      syncService.getUnmappedProducts.mockResolvedValue([]);

      const result = await controller.getUnmappedProducts('integration-1');

      expect(result).toEqual([]);
    });

    it('should propagate NotFoundException for nonexistent integration', async () => {
      syncService.getUnmappedProducts.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(
        controller.getUnmappedProducts('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────── Sync Logs ──────────────────────

  describe('findSyncLogs', () => {
    it('should return sync logs with default limit', async () => {
      const logs = [mockSyncLog];
      integrationsService.findSyncLogs.mockResolvedValue(logs as any);

      const result = await controller.findSyncLogs('integration-1');

      expect(result).toEqual(logs);
      expect(integrationsService.findSyncLogs).toHaveBeenCalledWith(
        'integration-1',
        20,
      );
    });

    it('should pass custom limit when provided', async () => {
      const logs = [mockSyncLog];
      integrationsService.findSyncLogs.mockResolvedValue(logs as any);

      const result = await controller.findSyncLogs('integration-1', '50');

      expect(result).toEqual(logs);
      expect(integrationsService.findSyncLogs).toHaveBeenCalledWith(
        'integration-1',
        50,
      );
    });

    it('should handle limit of 1', async () => {
      integrationsService.findSyncLogs.mockResolvedValue([
        mockSyncLog,
      ] as any);

      await controller.findSyncLogs('integration-1', '1');

      expect(integrationsService.findSyncLogs).toHaveBeenCalledWith(
        'integration-1',
        1,
      );
    });

    it('should return empty array when no logs exist', async () => {
      integrationsService.findSyncLogs.mockResolvedValue([]);

      const result = await controller.findSyncLogs('integration-1');

      expect(result).toEqual([]);
    });

    it('should propagate NotFoundException for nonexistent integration', async () => {
      integrationsService.findSyncLogs.mockRejectedValue(
        new NotFoundException('Integracion no encontrada'),
      );

      await expect(
        controller.findSyncLogs('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use default limit when limit string is undefined', async () => {
      integrationsService.findSyncLogs.mockResolvedValue([]);

      await controller.findSyncLogs('integration-1', undefined);

      expect(integrationsService.findSyncLogs).toHaveBeenCalledWith(
        'integration-1',
        20,
      );
    });
  });
});
