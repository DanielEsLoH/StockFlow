import { Module } from '@nestjs/common';
import { RecurringInvoicesController } from './recurring-invoices.controller';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { InvoicesModule } from '../invoices';

@Module({
  imports: [InvoicesModule],
  controllers: [RecurringInvoicesController],
  providers: [RecurringInvoicesService],
  exports: [RecurringInvoicesService],
})
export class RecurringInvoicesModule {}
