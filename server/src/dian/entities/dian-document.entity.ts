import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DianDocumentStatus, DianDocumentType } from '@prisma/client';

export class DianDocumentEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiPropertyOptional()
  invoiceId?: string;

  @ApiProperty({ enum: DianDocumentType })
  documentType: DianDocumentType;

  @ApiProperty()
  documentNumber: string;

  @ApiPropertyOptional({ description: 'Codigo Unico de Factura Electronica' })
  cufe?: string;

  @ApiPropertyOptional({
    description: 'Codigo Unico de Documento Electronico (notas)',
  })
  cude?: string;

  @ApiPropertyOptional({ description: 'Codigo QR en base64' })
  qrCode?: string;

  @ApiProperty({ enum: DianDocumentStatus })
  status: DianDocumentStatus;

  @ApiPropertyOptional({ description: 'Respuesta de la DIAN' })
  dianResponse?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Track ID de la DIAN' })
  dianTrackId?: string;

  @ApiPropertyOptional({ description: 'Mensaje de error si aplica' })
  errorMessage?: string;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DianDocumentWithInvoiceEntity extends DianDocumentEntity {
  @ApiPropertyOptional()
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    customer?: {
      id: string;
      name: string;
      documentNumber: string;
    };
  };
}

export class PaginatedDianDocumentsEntity {
  @ApiProperty({ type: [DianDocumentWithInvoiceEntity] })
  data: DianDocumentWithInvoiceEntity[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
