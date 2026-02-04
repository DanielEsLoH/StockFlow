import { Module } from '@nestjs/common';
import { DianController } from './dian.controller';
import { DianService } from './dian.service';
import {
  XmlGeneratorService,
  CufeGeneratorService,
  DianClientService,
} from './services';

@Module({
  controllers: [DianController],
  providers: [
    DianService,
    XmlGeneratorService,
    CufeGeneratorService,
    DianClientService,
  ],
  exports: [DianService],
})
export class DianModule {}
