import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WithholdingCertificateEntity {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() supplierId: string;
  @ApiProperty() year: number;
  @ApiProperty() certificateNumber: string;
  @ApiProperty() totalBase: number;
  @ApiProperty() totalWithheld: number;
  @ApiProperty() withholdingType: string;
  @ApiProperty() generatedAt: Date;
  @ApiPropertyOptional() pdfUrl: string | null;
  @ApiProperty() createdAt: Date;
}

export class PaginatedWithholdingCertificatesEntity {
  @ApiProperty({ type: [WithholdingCertificateEntity] })
  data: WithholdingCertificateEntity[];
  @ApiProperty() meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class WithholdingCertificateStatsEntity {
  @ApiProperty() year: number;
  @ApiProperty() totalCertificates: number;
  @ApiProperty() totalBase: number;
  @ApiProperty() totalWithheld: number;
  @ApiProperty() byType: Record<string, { count: number; base: number; withheld: number }>;
}
