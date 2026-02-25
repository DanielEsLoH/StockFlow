import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchasePaymentsService } from './purchase-payments.service';
import { AccountingModule } from '../accounting';

@Module({
  imports: [AccountingModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PurchasePaymentsService],
  exports: [PurchaseOrdersService, PurchasePaymentsService],
})
export class PurchaseOrdersModule {}
