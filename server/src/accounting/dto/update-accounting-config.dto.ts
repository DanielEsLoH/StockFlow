import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAccountingConfigDto {
  @ApiPropertyOptional({ description: 'Cash account ID (PUC 1105)' })
  @IsString()
  @IsOptional()
  cashAccountId?: string;

  @ApiPropertyOptional({ description: 'Bank account ID (PUC 1110)' })
  @IsString()
  @IsOptional()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: 'Accounts receivable ID (PUC 1305)' })
  @IsString()
  @IsOptional()
  accountsReceivableId?: string;

  @ApiPropertyOptional({ description: 'Inventory account ID (PUC 1435)' })
  @IsString()
  @IsOptional()
  inventoryAccountId?: string;

  @ApiPropertyOptional({ description: 'Accounts payable ID (PUC 2205)' })
  @IsString()
  @IsOptional()
  accountsPayableId?: string;

  @ApiPropertyOptional({ description: 'IVA por pagar account ID (PUC 2408)' })
  @IsString()
  @IsOptional()
  ivaPorPagarId?: string;

  @ApiPropertyOptional({ description: 'IVA descontable account ID (PUC 2412)' })
  @IsString()
  @IsOptional()
  ivaDescontableId?: string;

  @ApiPropertyOptional({ description: 'Revenue account ID (PUC 4135)' })
  @IsString()
  @IsOptional()
  revenueAccountId?: string;

  @ApiPropertyOptional({ description: 'COGS account ID (PUC 6135)' })
  @IsString()
  @IsOptional()
  cogsAccountId?: string;

  @ApiPropertyOptional({
    description: 'Inventory adjustment account ID (PUC 5195)',
  })
  @IsString()
  @IsOptional()
  inventoryAdjustmentId?: string;

  @ApiPropertyOptional({
    description: 'ReteFuente received account ID (PUC 1355)',
  })
  @IsString()
  @IsOptional()
  reteFuenteReceivedId?: string;

  @ApiPropertyOptional({
    description: 'ReteFuente payable account ID (PUC 2365)',
  })
  @IsString()
  @IsOptional()
  reteFuentePayableId?: string;

  @ApiPropertyOptional({ description: 'Payroll expense account ID (PUC 5105)' })
  @IsString()
  @IsOptional()
  payrollExpenseId?: string;

  @ApiPropertyOptional({ description: 'Payroll payable account ID (PUC 2505)' })
  @IsString()
  @IsOptional()
  payrollPayableId?: string;

  @ApiPropertyOptional({
    description: 'Payroll retentions account ID (PUC 2380)',
  })
  @IsString()
  @IsOptional()
  payrollRetentionsId?: string;

  @ApiPropertyOptional({
    description: 'Payroll contributions account ID (PUC 2380)',
  })
  @IsString()
  @IsOptional()
  payrollContributionsId?: string;

  @ApiPropertyOptional({
    description: 'Payroll provisions account ID (PUC 2610)',
  })
  @IsString()
  @IsOptional()
  payrollProvisionsId?: string;

  @ApiPropertyOptional({
    description: 'Enable automatic journal entry generation',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoGenerateEntries?: boolean;

  @ApiPropertyOptional({
    description: 'ReteFuente purchase withholding rate (e.g. 0.025 for 2.5%)',
    default: 0.025,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  reteFuentePurchaseRate?: number;

  @ApiPropertyOptional({
    description: 'Minimum purchase base (COP) above which ReteFuente applies',
    default: 523740,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reteFuenteMinBase?: number;

  @ApiPropertyOptional({ description: 'ReteICA account ID (PUC 2368)' })
  @IsString()
  @IsOptional()
  reteIcaAccountId?: string;

  @ApiPropertyOptional({
    description: 'ReteICA withholding rate (e.g. 0.0069 for 6.9‰)',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  reteIcaRate?: number;

  @ApiPropertyOptional({
    description: 'Minimum base (COP) above which ReteICA applies',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reteIcaMinBase?: number;

  @ApiPropertyOptional({
    description: 'Enable ReteICA withholding on purchases/expenses',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  reteIcaEnabled?: boolean;

  @ApiPropertyOptional({ description: 'ReteIVA account ID (PUC 2367)' })
  @IsString()
  @IsOptional()
  reteIvaAccountId?: string;

  @ApiPropertyOptional({
    description: 'ReteIVA withholding rate (e.g. 0.15 for 15%)',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  reteIvaRate?: number;

  @ApiPropertyOptional({
    description: 'Minimum IVA base (COP) above which ReteIVA applies',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reteIvaMinBase?: number;

  @ApiPropertyOptional({
    description: 'Enable ReteIVA withholding on purchases/expenses',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  reteIvaEnabled?: boolean;
}
