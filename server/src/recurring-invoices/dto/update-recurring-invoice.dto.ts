import { PartialType } from '@nestjs/swagger';
import { CreateRecurringInvoiceDto } from './create-recurring-invoice.dto';

export class UpdateRecurringInvoiceDto extends PartialType(
  CreateRecurringInvoiceDto,
) {}
