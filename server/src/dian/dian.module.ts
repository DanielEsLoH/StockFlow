import { Module } from '@nestjs/common';
import { DianController } from './dian.controller';
import { DianService } from './dian.service';
import {
  XmlGeneratorService,
  CufeGeneratorService,
  DianClientService,
  XmlSignerService,
} from './services';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [DianController],
  providers: [
    DianService,
    XmlGeneratorService,
    CufeGeneratorService,
    DianClientService,
    XmlSignerService,
  ],
  exports: [DianService],
})
export class DianModule {}
