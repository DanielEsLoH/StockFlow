import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  PurchaseOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingBridgeService } from '../accounting';
import { CreatePurchasePaymentDto } from './dto/create-purchase-payment.dto';

export interface PurchasePaymentResponse {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paymentDate: Date;
  createdAt: Date;
  purchaseOrder?: {
    id: string;
    purchaseOrderNumber: string;
    total: number;
    paymentStatus: PaymentStatus;
    supplier?: { id: string; name: string } | null;
  };
}

@Injectable()
export class PurchasePaymentsService {
  private readonly logger = new Logger(PurchasePaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly accountingBridge: AccountingBridgeService,
  ) {}

  async findByPurchaseOrder(
    purchaseOrderId: string,
  ): Promise<PurchasePaymentResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      select: { id: true },
    });

    if (!po) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    const payments = await this.prisma.purchasePayment.findMany({
      where: { purchaseOrderId, tenantId },
      include: {
        purchaseOrder: {
          include: {
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return payments.map((p) => this.mapToResponse(p));
  }

  async create(
    purchaseOrderId: string,
    dto: CreatePurchasePaymentDto,
  ): Promise<PurchasePaymentResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      include: {
        purchasePayments: true,
        supplier: { select: { id: true, name: true } },
      },
    });

    if (!po) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (po.status !== PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException(
        'Solo se pueden registrar pagos en ordenes recibidas',
      );
    }

    const totalPaid = po.purchasePayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const poTotal = Number(po.total);
    const remainingBalance = poTotal - totalPaid;

    if (dto.amount > remainingBalance + 0.01) {
      throw new BadRequestException(
        `El monto del pago (${dto.amount}) excede el saldo pendiente (${remainingBalance.toFixed(2)})`,
      );
    }

    const newTotalPaid = totalPaid + dto.amount;
    const newPaymentStatus = this.calculatePaymentStatus(
      newTotalPaid,
      poTotal,
    );

    const payment = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.purchasePayment.create({
        data: {
          tenantId,
          purchaseOrderId,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference ?? null,
          notes: dto.notes ?? null,
          paymentDate: dto.paymentDate ?? new Date(),
        },
        include: {
          purchaseOrder: {
            include: {
              supplier: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (po.paymentStatus !== newPaymentStatus) {
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { paymentStatus: newPaymentStatus },
        });
        newPayment.purchaseOrder.paymentStatus = newPaymentStatus;
      }

      return newPayment;
    });

    // Fire-and-forget: accounting bridge
    this.accountingBridge
      .onPurchasePaymentCreated({
        tenantId,
        purchasePaymentId: payment.id,
        purchaseOrderId: po.id,
        purchaseOrderNumber: po.purchaseOrderNumber,
        amount: Number(dto.amount),
        method: dto.method,
      })
      .catch(() => {});

    this.logger.log(
      `Purchase payment created: ${payment.id} for PO ${po.purchaseOrderNumber}`,
    );

    return this.mapToResponse(payment);
  }

  async delete(paymentId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    const payment = await this.prisma.purchasePayment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        purchaseOrder: {
          include: { purchasePayments: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const po = payment.purchaseOrder;
    const currentTotalPaid = po.purchasePayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const newTotalPaid = currentTotalPaid - Number(payment.amount);
    const newPaymentStatus = this.calculatePaymentStatus(
      newTotalPaid,
      Number(po.total),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.purchasePayment.delete({ where: { id: paymentId } });

      if (po.paymentStatus !== newPaymentStatus) {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { paymentStatus: newPaymentStatus },
        });
      }
    });

    this.logger.log(
      `Purchase payment deleted: ${paymentId} from PO ${po.purchaseOrderNumber}`,
    );
  }

  private calculatePaymentStatus(
    totalPaid: number,
    poTotal: number,
  ): PaymentStatus {
    const epsilon = 0.01;
    if (totalPaid < epsilon) return PaymentStatus.UNPAID;
    if (totalPaid >= poTotal - epsilon) return PaymentStatus.PAID;
    return PaymentStatus.PARTIALLY_PAID;
  }

  private mapToResponse(payment: any): PurchasePaymentResponse {
    const response: PurchasePaymentResponse = {
      id: payment.id,
      tenantId: payment.tenantId,
      purchaseOrderId: payment.purchaseOrderId,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      paymentDate: payment.paymentDate,
      createdAt: payment.createdAt,
    };

    if (payment.purchaseOrder) {
      response.purchaseOrder = {
        id: payment.purchaseOrder.id,
        purchaseOrderNumber: payment.purchaseOrder.purchaseOrderNumber,
        total: Number(payment.purchaseOrder.total),
        paymentStatus: payment.purchaseOrder.paymentStatus,
        supplier: payment.purchaseOrder.supplier ?? null,
      };
    }

    return response;
  }
}
