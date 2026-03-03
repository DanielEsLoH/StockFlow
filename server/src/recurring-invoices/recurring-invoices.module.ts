import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RecurringInvoicesController } from './recurring-invoices.controller';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { RecurringInvoicesCronService } from './recurring-invoices-cron.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [RecurringInvoicesController],
  providers: [RecurringInvoicesService, RecurringInvoicesCronService],
  exports: [RecurringInvoicesService],
})
export class RecurringInvoicesModule {}
