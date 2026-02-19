import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBankAccountDto } from './create-bank-account.dto';

export class UpdateBankAccountDto extends PartialType(
  OmitType(CreateBankAccountDto, ['accountNumber', 'accountType'] as const),
) {}
