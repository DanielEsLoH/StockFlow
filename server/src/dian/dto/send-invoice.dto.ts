import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreditNoteReason, DebitNoteReason } from '@prisma/client';

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

// ─── Credit Notes ──────────────────────────────────────────────────────────

export class CreditNoteItemDto {
  @ApiProperty({ description: 'ID del item de factura original' })
  @IsString()
  invoiceItemId: string;

  @ApiProperty({ description: 'Cantidad a acreditar' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class GenerateCreditNoteDto {
  @ApiProperty({ description: 'ID de la factura original a anular/corregir' })
  @IsString()
  invoiceId: string;

  @ApiProperty({
    description: 'Codigo de razon DIAN',
    enum: CreditNoteReason,
  })
  @IsEnum(CreditNoteReason)
  reasonCode: CreditNoteReason;

  @ApiProperty({ description: 'Motivo de la nota credito' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Descripcion adicional' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Items a acreditar. Si no se especifica, se acredita toda la factura.',
    type: [CreditNoteItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditNoteItemDto)
  items?: CreditNoteItemDto[];
}

// ─── Debit Notes ───────────────────────────────────────────────────────────

export class DebitNoteItemDto {
  @ApiProperty({ description: 'Descripcion del cargo adicional' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cantidad' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Porcentaje de IVA (ej: 19)' })
  @IsNumber()
  @Min(0)
  taxRate: number;
}

export class GenerateDebitNoteDto {
  @ApiProperty({ description: 'ID de la factura original' })
  @IsString()
  invoiceId: string;

  @ApiProperty({
    description: 'Codigo de razon DIAN',
    enum: DebitNoteReason,
  })
  @IsEnum(DebitNoteReason)
  reasonCode: DebitNoteReason;

  @ApiProperty({ description: 'Motivo de la nota debito' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Descripcion adicional' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Items de cargo adicional',
    type: [DebitNoteItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebitNoteItemDto)
  items: DebitNoteItemDto[];
}

// ─── Note Configuration ────────────────────────────────────────────────────

export class SetNoteConfigDto {
  @ApiPropertyOptional({ description: 'Prefijo para notas credito (ej: NC)' })
  @IsOptional()
  @IsString()
  creditNotePrefix?: string;

  @ApiPropertyOptional({ description: 'Numero inicial para notas credito' })
  @IsOptional()
  @IsInt()
  @Min(1)
  creditNoteStartNumber?: number;

  @ApiPropertyOptional({ description: 'Prefijo para notas debito (ej: ND)' })
  @IsOptional()
  @IsString()
  debitNotePrefix?: string;

  @ApiPropertyOptional({ description: 'Numero inicial para notas debito' })
  @IsOptional()
  @IsInt()
  @Min(1)
  debitNoteStartNumber?: number;
}
