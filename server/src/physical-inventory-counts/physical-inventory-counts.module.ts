import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { PhysicalInventoryCountsController } from './physical-inventory-counts.controller';
import { PhysicalInventoryCountsService } from './physical-inventory-counts.service';

@Module({
  imports: [AccountingModule],
  controllers: [PhysicalInventoryCountsController],
  providers: [PhysicalInventoryCountsService],
  exports: [PhysicalInventoryCountsService],
})
export class PhysicalInventoryCountsModule {}
