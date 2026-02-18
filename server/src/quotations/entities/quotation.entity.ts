import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';

export class QuotationItemEntity {
  @ApiProperty() id: string;
  @ApiProperty() quotationId: string;
  @ApiPropertyOptional() productId: string | null;
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

export class QuotationEntity {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiPropertyOptional() customerId: string | null;
  @ApiPropertyOptional() userId: string | null;
  @ApiProperty() quotationNumber: string;
  @ApiProperty() subtotal: number;
  @ApiProperty() tax: number;
  @ApiProperty() discount: number;
  @ApiProperty() total: number;
  @ApiProperty() issueDate: Date;
  @ApiPropertyOptional() validUntil: Date | null;
  @ApiProperty({ enum: QuotationStatus }) status: QuotationStatus;
  @ApiPropertyOptional() notes: string | null;
  @ApiPropertyOptional() convertedToInvoiceId: string | null;
  @ApiPropertyOptional() convertedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedQuotationsEntity {
  @ApiProperty({ type: [QuotationEntity] }) data: QuotationEntity[];
  @ApiProperty() meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
