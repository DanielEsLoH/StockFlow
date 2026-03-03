import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchasePaymentsService } from './purchase-payments.service';
import { AccountingModule } from '../accounting';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [AccountingModule, ExchangeRatesModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PurchasePaymentsService],
  exports: [PurchaseOrdersService, PurchasePaymentsService],
})
export class PurchaseOrdersModule {}
