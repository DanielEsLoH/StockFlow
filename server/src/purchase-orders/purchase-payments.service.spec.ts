import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchasePaymentsService } from './purchase-payments.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingBridgeService } from '../accounting';
import { PaymentMethod, PaymentStatus, PurchaseOrderStatus } from '@prisma/client';

const TENANT_ID = 'tenant-1';

const mockPrismaService = {
  purchaseOrder: {
    findFirst: jest.fn(),
  },
  purchasePayment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrismaService)),
};

const mockTenantContext = {
  requireTenantId: jest.fn().mockReturnValue(TENANT_ID),
};

const mockAccountingBridge = {
  onPurchasePaymentCreated: jest.fn().mockResolvedValue(undefined),
};

describe('PurchasePaymentsService', () => {
  let service: PurchasePaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasePaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: AccountingBridgeService, useValue: mockAccountingBridge },
      ],
    }).compile();

    service = module.get<PurchasePaymentsService>(PurchasePaymentsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByPurchaseOrder', () => {
    it('should throw NotFoundException when PO not found', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(null);

      await expect(service.findByPurchaseOrder('po-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return payments ordered by date desc', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue({ id: 'po-1' });
      mockPrismaService.purchasePayment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          tenantId: TENANT_ID,
          purchaseOrderId: 'po-1',
          amount: 500,
          method: PaymentMethod.CASH,
          reference: null,
          notes: null,
          paymentDate: new Date('2026-02-15'),
          createdAt: new Date(),
          purchaseOrder: {
            id: 'po-1',
            purchaseOrderNumber: 'OC-00001',
            total: 1000,
            paymentStatus: PaymentStatus.PARTIALLY_PAID,
            supplier: { id: 'sup-1', name: 'Proveedor A' },
          },
        },
      ]);

      const result = await service.findByPurchaseOrder('po-1');

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(500);
      expect(result[0].purchaseOrder?.purchaseOrderNumber).toBe('OC-00001');
    });
  });

  describe('create', () => {
    const basePO = {
      id: 'po-1',
      tenantId: TENANT_ID,
      purchaseOrderNumber: 'OC-00001',
      status: PurchaseOrderStatus.RECEIVED,
      paymentStatus: PaymentStatus.UNPAID,
      total: 1000,
      purchasePayments: [],
      supplier: { id: 'sup-1', name: 'Proveedor A' },
    };

    const baseDto = {
      amount: 500,
      method: PaymentMethod.BANK_TRANSFER,
    };

    it('should throw NotFoundException when PO not found', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(null);

      await expect(service.create('po-999', baseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when PO is not RECEIVED', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue({
        ...basePO,
        status: PurchaseOrderStatus.DRAFT,
      });

      await expect(service.create('po-1', baseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when amount exceeds remaining balance', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue({
        ...basePO,
        purchasePayments: [{ amount: 800 }],
      });

      await expect(
        service.create('po-1', { ...baseDto, amount: 300 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create partial payment and set status to PARTIALLY_PAID', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(basePO);

      const createdPayment = {
        id: 'pay-1',
        tenantId: TENANT_ID,
        purchaseOrderId: 'po-1',
        amount: 500,
        method: PaymentMethod.BANK_TRANSFER,
        reference: null,
        notes: null,
        paymentDate: new Date(),
        createdAt: new Date(),
        purchaseOrder: {
          ...basePO,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
        },
      };

      mockPrismaService.purchasePayment.create.mockResolvedValue(createdPayment);
      mockPrismaService.purchaseOrder.update = jest.fn();

      const result = await service.create('po-1', baseDto);

      expect(result.amount).toBe(500);
      expect(mockPrismaService.purchasePayment.create).toHaveBeenCalled();
    });

    it('should create full payment and set status to PAID', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(basePO);

      const createdPayment = {
        id: 'pay-1',
        tenantId: TENANT_ID,
        purchaseOrderId: 'po-1',
        amount: 1000,
        method: PaymentMethod.CASH,
        reference: null,
        notes: null,
        paymentDate: new Date(),
        createdAt: new Date(),
        purchaseOrder: {
          ...basePO,
          paymentStatus: PaymentStatus.PAID,
        },
      };

      mockPrismaService.purchasePayment.create.mockResolvedValue(createdPayment);
      mockPrismaService.purchaseOrder.update = jest.fn();

      const result = await service.create('po-1', {
        amount: 1000,
        method: PaymentMethod.CASH,
      });

      expect(result.amount).toBe(1000);
    });

    it('should call accounting bridge after creation', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(basePO);

      const createdPayment = {
        id: 'pay-1',
        tenantId: TENANT_ID,
        purchaseOrderId: 'po-1',
        amount: 500,
        method: PaymentMethod.BANK_TRANSFER,
        reference: null,
        notes: null,
        paymentDate: new Date(),
        createdAt: new Date(),
        purchaseOrder: {
          ...basePO,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
        },
      };

      mockPrismaService.purchasePayment.create.mockResolvedValue(createdPayment);
      mockPrismaService.purchaseOrder.update = jest.fn();

      await service.create('po-1', baseDto);

      expect(mockAccountingBridge.onPurchasePaymentCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          purchasePaymentId: 'pay-1',
          purchaseOrderId: 'po-1',
          purchaseOrderNumber: 'OC-00001',
          amount: 500,
          method: PaymentMethod.BANK_TRANSFER,
        }),
      );
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when payment not found', async () => {
      mockPrismaService.purchasePayment.findFirst.mockResolvedValue(null);

      await expect(service.delete('pay-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete payment and recalculate status to UNPAID', async () => {
      mockPrismaService.purchasePayment.findFirst.mockResolvedValue({
        id: 'pay-1',
        tenantId: TENANT_ID,
        amount: 500,
        purchaseOrder: {
          id: 'po-1',
          purchaseOrderNumber: 'OC-00001',
          total: 1000,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
          purchasePayments: [{ amount: 500 }],
        },
      });
      mockPrismaService.purchasePayment.delete.mockResolvedValue(undefined);
      mockPrismaService.purchaseOrder.update = jest.fn();

      await service.delete('pay-1');

      expect(mockPrismaService.purchasePayment.delete).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
      });
    });

    it('should recalculate status to PARTIALLY_PAID when other payments remain', async () => {
      mockPrismaService.purchasePayment.findFirst.mockResolvedValue({
        id: 'pay-2',
        tenantId: TENANT_ID,
        amount: 300,
        purchaseOrder: {
          id: 'po-1',
          purchaseOrderNumber: 'OC-00001',
          total: 1000,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
          purchasePayments: [{ amount: 500 }, { amount: 300 }],
        },
      });
      mockPrismaService.purchasePayment.delete.mockResolvedValue(undefined);
      mockPrismaService.purchaseOrder.update = jest.fn();

      await service.delete('pay-2');

      expect(mockPrismaService.purchasePayment.delete).toHaveBeenCalled();
    });
  });
});
