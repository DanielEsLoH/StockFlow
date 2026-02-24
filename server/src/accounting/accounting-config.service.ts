import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { UpdateAccountingConfigDto } from './dto/update-accounting-config.dto';

export interface AccountingConfigResponse {
  id: string;
  tenantId: string;
  cashAccountId: string | null;
  bankAccountId: string | null;
  accountsReceivableId: string | null;
  inventoryAccountId: string | null;
  accountsPayableId: string | null;
  ivaPorPagarId: string | null;
  ivaDescontableId: string | null;
  revenueAccountId: string | null;
  cogsAccountId: string | null;
  inventoryAdjustmentId: string | null;
  reteFuenteReceivedId: string | null;
  reteFuentePayableId: string | null;
  payrollExpenseId: string | null;
  payrollPayableId: string | null;
  payrollRetentionsId: string | null;
  payrollContributionsId: string | null;
  payrollProvisionsId: string | null;
  autoGenerateEntries: boolean;
  isConfigured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AccountingConfigService {
  private readonly logger = new Logger(AccountingConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getConfig(): Promise<AccountingConfigResponse | null> {
    const tenantId = this.tenantContext.requireTenantId();

    const config = await this.prisma.accountingConfig.findUnique({
      where: { tenantId },
    });

    return config ? this.mapToResponse(config) : null;
  }

  async updateConfig(dto: UpdateAccountingConfigDto): Promise<AccountingConfigResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const config = await this.prisma.accountingConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...dto,
      },
      update: dto,
    });

    this.logger.log(`Accounting config updated for tenant ${tenantId}`);
    return this.mapToResponse(config);
  }

  /**
   * Get the config for a specific tenant (used by AccountingBridgeService
   * which operates outside the normal tenant context).
   */
  async getConfigForTenant(tenantId: string): Promise<AccountingConfigResponse | null> {
    const config = await this.prisma.accountingConfig.findUnique({
      where: { tenantId },
    });

    return config ? this.mapToResponse(config) : null;
  }

  private mapToResponse(config: any): AccountingConfigResponse {
    const isConfigured = !!(
      config.cashAccountId &&
      config.accountsReceivableId &&
      config.inventoryAccountId &&
      config.accountsPayableId &&
      config.revenueAccountId &&
      config.cogsAccountId
    );

    return {
      id: config.id,
      tenantId: config.tenantId,
      cashAccountId: config.cashAccountId,
      bankAccountId: config.bankAccountId,
      accountsReceivableId: config.accountsReceivableId,
      inventoryAccountId: config.inventoryAccountId,
      accountsPayableId: config.accountsPayableId,
      ivaPorPagarId: config.ivaPorPagarId,
      ivaDescontableId: config.ivaDescontableId,
      revenueAccountId: config.revenueAccountId,
      cogsAccountId: config.cogsAccountId,
      inventoryAdjustmentId: config.inventoryAdjustmentId,
      reteFuenteReceivedId: config.reteFuenteReceivedId,
      reteFuentePayableId: config.reteFuentePayableId,
      payrollExpenseId: config.payrollExpenseId,
      payrollPayableId: config.payrollPayableId,
      payrollRetentionsId: config.payrollRetentionsId,
      payrollContributionsId: config.payrollContributionsId,
      payrollProvisionsId: config.payrollProvisionsId,
      autoGenerateEntries: config.autoGenerateEntries,
      isConfigured,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
