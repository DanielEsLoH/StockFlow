import { Module } from '@nestjs/common';
import { WithholdingCertificatesController } from './withholding-certificates.controller';
import { WithholdingCertificatesService } from './withholding-certificates.service';

@Module({
  controllers: [WithholdingCertificatesController],
  providers: [WithholdingCertificatesService],
  exports: [WithholdingCertificatesService],
})
export class WithholdingCertificatesModule {}
