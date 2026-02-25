import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchasePaymentsService } from './purchase-payments.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

const mockPurchaseOrder = {
  id: 'po-123',
  orderNumber: 'OC-00001',
  status: 'DRAFT',
  supplierId: 'supplier-1',
  warehouseId: 'warehouse-1',
  subtotal: 1000,
  tax: 190,
  discount: 0,
  total: 1190,
  items: [],
};

const mockPaginatedResponse = {
  data: [mockPurchaseOrder],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
};

const mockStatsResponse = {
  totalOrders: 10,
  totalValue: 50000,
  receivedValue: 30000,
  byStatus: { DRAFT: 3, SENT: 2, CONFIRMED: 2, RECEIVED: 3 },
};

const mockUser = { userId: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' };

describe('PurchaseOrdersController', () => {
  let controller: PurchaseOrdersController;
  let service: jest.Mocked<PurchaseOrdersService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
      getStats: jest.fn().mockResolvedValue(mockStatsResponse),
      findOne: jest.fn().mockResolvedValue(mockPurchaseOrder),
      create: jest.fn().mockResolvedValue(mockPurchaseOrder),
      update: jest.fn().mockResolvedValue(mockPurchaseOrder),
      remove: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue({ ...mockPurchaseOrder, status: 'SENT' }),
      confirm: jest.fn().mockResolvedValue({ ...mockPurchaseOrder, status: 'CONFIRMED' }),
      receive: jest.fn().mockResolvedValue({ ...mockPurchaseOrder, status: 'RECEIVED' }),
      cancel: jest.fn().mockResolvedValue({ ...mockPurchaseOrder, status: 'CANCELLED' }),
    };

    const mockPaymentsService = {
      findByPurchaseOrder: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'pay-1', amount: 500 }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrdersController],
      providers: [
        { provide: PurchaseOrdersService, useValue: mockService },
        { provide: PurchasePaymentsService, useValue: mockPaymentsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PurchaseOrdersController>(PurchaseOrdersController);
    service = module.get(PurchaseOrdersService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ─── FINDALL ───────────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to service with query dto', async () => {
      const query = { page: 1, limit: 10 } as any;
      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should pass filters through to service', async () => {
      const query = { page: 2, limit: 20, status: 'DRAFT', supplierId: 'sup-1' } as any;
      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ─── GETSTATS ──────────────────────────────────────────────────
  describe('getStats', () => {
    it('should delegate to service', async () => {
      const result = await controller.getStats();

      expect(result).toEqual(mockStatsResponse);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should delegate to service with id', async () => {
      const result = await controller.findOne('po-123');

      expect(result).toEqual(mockPurchaseOrder);
      expect(service.findOne).toHaveBeenCalledWith('po-123');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      supplierId: 'supplier-1',
      warehouseId: 'warehouse-1',
      items: [{ productId: 'prod-1', quantity: 10, unitPrice: 100, taxRate: 19 }],
    } as any;

    it('should delegate to service with dto and userId', async () => {
      const result = await controller.create(createDto, mockUser as any);

      expect(result).toEqual(mockPurchaseOrder);
      expect(service.create).toHaveBeenCalledWith(createDto, 'user-1');
    });

    it('should propagate NotFoundException for invalid supplier', async () => {
      service.create.mockRejectedValue(new NotFoundException('Supplier not found'));

      await expect(controller.create(createDto, mockUser as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────
  describe('update', () => {
    it('should delegate to service with id and dto', async () => {
      const dto = { notes: 'Updated' } as any;
      const result = await controller.update('po-123', dto);

      expect(result).toEqual(mockPurchaseOrder);
      expect(service.update).toHaveBeenCalledWith('po-123', dto);
    });

    it('should propagate ConflictException for non-DRAFT order', async () => {
      service.update.mockRejectedValue(new ConflictException());

      await expect(controller.update('po-123', {} as any)).rejects.toThrow(ConflictException);
    });
  });

  // ─── REMOVE ────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delegate to service', async () => {
      await controller.remove('po-123');

      expect(service.remove).toHaveBeenCalledWith('po-123');
    });

    it('should propagate NotFoundException', async () => {
      service.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── SEND ──────────────────────────────────────────────────────
  describe('send', () => {
    it('should delegate to service', async () => {
      const result = await controller.send('po-123');

      expect(result).toEqual({ ...mockPurchaseOrder, status: 'SENT' });
      expect(service.send).toHaveBeenCalledWith('po-123');
    });

    it('should propagate ConflictException for invalid status transition', async () => {
      service.send.mockRejectedValue(new ConflictException());

      await expect(controller.send('po-123')).rejects.toThrow(ConflictException);
    });
  });

  // ─── CONFIRM ───────────────────────────────────────────────────
  describe('confirm', () => {
    it('should delegate to service', async () => {
      const result = await controller.confirm('po-123');

      expect(result).toEqual({ ...mockPurchaseOrder, status: 'CONFIRMED' });
      expect(service.confirm).toHaveBeenCalledWith('po-123');
    });

    it('should propagate ConflictException', async () => {
      service.confirm.mockRejectedValue(new ConflictException());

      await expect(controller.confirm('po-123')).rejects.toThrow(ConflictException);
    });
  });

  // ─── RECEIVE ───────────────────────────────────────────────────
  describe('receive', () => {
    it('should delegate to service with id and userId', async () => {
      const result = await controller.receive('po-123', mockUser as any);

      expect(result).toEqual({ ...mockPurchaseOrder, status: 'RECEIVED' });
      expect(service.receive).toHaveBeenCalledWith('po-123', 'user-1');
    });

    it('should propagate ConflictException for non-CONFIRMED order', async () => {
      service.receive.mockRejectedValue(new ConflictException());

      await expect(controller.receive('po-123', mockUser as any)).rejects.toThrow(ConflictException);
    });
  });

  // ─── CANCEL ────────────────────────────────────────────────────
  describe('cancel', () => {
    it('should delegate to service', async () => {
      const result = await controller.cancel('po-123');

      expect(result).toEqual({ ...mockPurchaseOrder, status: 'CANCELLED' });
      expect(service.cancel).toHaveBeenCalledWith('po-123');
    });

    it('should propagate ConflictException for RECEIVED order', async () => {
      service.cancel.mockRejectedValue(new ConflictException());

      await expect(controller.cancel('po-123')).rejects.toThrow(ConflictException);
    });
  });
});
