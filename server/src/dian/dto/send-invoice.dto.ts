import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class SendInvoiceDto {
  @ApiProperty({ description: 'ID de la factura a enviar' })
  @IsString()
  invoiceId: string;

  @ApiPropertyOptional({
    description: 'Forzar reenvio aunque ya este enviada',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class CheckDocumentStatusDto {
  @ApiProperty({ description: 'ID del documento DIAN' })
  @IsString()
  documentId: string;
}

export class GenerateCreditNoteDto {
  @ApiProperty({ description: 'ID de la factura original a anular/corregir' })
  @IsString()
  invoiceId: string;

  @ApiProperty({ description: 'Motivo de la nota credito' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Descripcion adicional' })
  @IsOptional()
  @IsString()
  description?: string;
}
