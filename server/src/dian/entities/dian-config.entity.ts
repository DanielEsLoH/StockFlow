import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxResponsibility } from '@prisma/client';

export class DianConfigEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  nit: string;

  @ApiProperty()
  dv: string;

  @ApiProperty()
  businessName: string;

  @ApiPropertyOptional()
  tradeName?: string;

  @ApiProperty({ enum: TaxResponsibility, isArray: true })
  taxResponsibilities: TaxResponsibility[];

  @ApiProperty()
  economicActivity: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  cityCode: string;

  @ApiProperty()
  department: string;

  @ApiProperty()
  departmentCode: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  countryCode: string;

  @ApiPropertyOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  testMode: boolean;

  @ApiPropertyOptional({ description: 'Si tiene software configurado' })
  hasSoftwareConfig: boolean;

  @ApiPropertyOptional({ description: 'Si tiene resolucion configurada' })
  hasResolution: boolean;

  @ApiPropertyOptional({ description: 'Si tiene certificado configurado' })
  hasCertificate: boolean;

  @ApiPropertyOptional()
  resolutionNumber?: string;

  @ApiPropertyOptional()
  resolutionPrefix?: string;

  @ApiPropertyOptional()
  resolutionRangeFrom?: number;

  @ApiPropertyOptional()
  resolutionRangeTo?: number;

  @ApiProperty()
  currentNumber: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
