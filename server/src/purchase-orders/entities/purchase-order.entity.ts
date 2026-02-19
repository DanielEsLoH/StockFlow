import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';

export class PurchaseOrderItemEntity {
  @ApiProperty() id: string;
  @ApiProperty() purchaseOrderId: string;
  @ApiProperty() productId: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() taxRate: number;
  @ApiProperty() taxCategory: string;
  @ApiProperty() discount: number;
  @ApiProperty() subtotal: number;
  @ApiProperty() tax: number;
  @ApiProperty() total: number;
  @ApiProperty() createdAt: Date;
}

export class PurchaseOrderEntity {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() supplierId: string;
  @ApiPropertyOptional() userId: string | null;
  @ApiProperty() warehouseId: string;
  @ApiProperty() purchaseOrderNumber: string;
  @ApiProperty({ enum: PurchaseOrderStatus }) status: PurchaseOrderStatus;
  @ApiProperty() paymentStatus: string;
  @ApiProperty() subtotal: number;
  @ApiProperty() tax: number;
  @ApiProperty() discount: number;
  @ApiProperty() total: number;
  @ApiProperty() issueDate: Date;
  @ApiPropertyOptional() expectedDeliveryDate: Date | null;
  @ApiPropertyOptional() receivedDate: Date | null;
  @ApiPropertyOptional() notes: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedPurchaseOrdersEntity {
  @ApiProperty({ type: [PurchaseOrderEntity] })
  data: PurchaseOrderEntity[];
  @ApiProperty() meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
