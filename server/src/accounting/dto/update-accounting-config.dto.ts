import { IsString, IsOptional, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Inventory adjustment account ID (PUC 5195)' })
  @IsString()
  @IsOptional()
  inventoryAdjustmentId?: string;

  @ApiPropertyOptional({ description: 'ReteFuente received account ID (PUC 1355)' })
  @IsString()
  @IsOptional()
  reteFuenteReceivedId?: string;

  @ApiPropertyOptional({ description: 'ReteFuente payable account ID (PUC 2365)' })
  @IsString()
  @IsOptional()
  reteFuentePayableId?: string;

  @ApiPropertyOptional({
    description: 'Enable automatic journal entry generation',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoGenerateEntries?: boolean;
}
