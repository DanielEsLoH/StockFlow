import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreateAccountingPeriodDto } from './dto/create-accounting-period.dto';
import {
  AccountingPeriodStatus,
  AccountType,
  JournalEntrySource,
} from '@prisma/client';
import { JournalEntriesService } from './journal-entries.service';

export interface AccountingPeriodResponse {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: AccountingPeriodStatus;
  closedAt: Date | null;
  closedById: string | null;
  notes: string | null;
  entryCount: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AccountingPeriodsService {
  private readonly logger = new Logger(AccountingPeriodsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly journalEntries: JournalEntriesService,
  ) {}

  async findAll(): Promise<AccountingPeriodResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    const periods = await this.prisma.accountingPeriod.findMany({
      where: { tenantId },
      include: {
        _count: { select: { journalEntries: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    return periods.map((p) => this.mapToResponse(p));
  }

  async findOne(id: string): Promise<AccountingPeriodResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.accountingPeriod.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { journalEntries: true } },
      },
    });

    if (!period) {
      throw new NotFoundException(
        `Periodo contable con ID ${id} no encontrado`,
      );
    }

    return this.mapToResponse(period);
  }

  async create(
    dto: CreateAccountingPeriodDto,
  ): Promise<AccountingPeriodResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Check for overlapping periods
    const overlapping = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId,
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `El periodo se superpone con "${overlapping.name}" (${overlapping.startDate.toISOString().split('T')[0]} - ${overlapping.endDate.toISOString().split('T')[0]})`,
      );
    }

    const period = await this.prisma.accountingPeriod.create({
      data: {
        tenantId,
        name: dto.name,
        startDate,
        endDate,
        notes: dto.notes,
      },
      include: {
        _count: { select: { journalEntries: true } },
      },
    });

    this.logger.log(`Accounting period created: ${period.name}`);
    return this.mapToResponse(period);
  }

  async closePeriod(
    id: string,
    userId: string,
  ): Promise<AccountingPeriodResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.accountingPeriod.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { journalEntries: true } },
      },
    });

    if (!period) {
      throw new NotFoundException(
        `Periodo contable con ID ${id} no encontrado`,
      );
    }

    if (period.status === AccountingPeriodStatus.CLOSED) {
      throw new BadRequestException('Este periodo ya esta cerrado');
    }

    // Check for draft entries in this period
    const draftEntries = await this.prisma.journalEntry.count({
      where: {
        tenantId,
        periodId: id,
        status: 'DRAFT',
      },
    });

    if (draftEntries > 0) {
      throw new BadRequestException(
        `Hay ${draftEntries} asiento(s) en borrador. Publique o anule todos los borradores antes de cerrar el periodo.`,
      );
    }

    // Generate closing journal entry: transfer P&L balances to Retained Earnings
    await this.generateClosingEntry(tenantId, period);

    const updated = await this.prisma.accountingPeriod.update({
      where: { id },
      data: {
        status: AccountingPeriodStatus.CLOSED,
        closedAt: new Date(),
        closedById: userId,
      },
      include: {
        _count: { select: { journalEntries: true } },
      },
    });

    this.logger.log(`Accounting period closed: ${updated.name}`);
    return this.mapToResponse(updated);
  }

  private mapToResponse(period: any): AccountingPeriodResponse {
    return {
      id: period.id,
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status,
      closedAt: period.closedAt,
      closedById: period.closedById,
      notes: period.notes,
      entryCount: period._count?.journalEntries ?? 0,
      tenantId: period.tenantId,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }

  /**
   * Generate a closing journal entry that zeroes out P&L accounts
   * (REVENUE, EXPENSE, COGS) and transfers the net result to Retained Earnings (EQUITY).
   *
   * Colombian accounting: 4XXX=Ingresos, 5XXX=Gastos, 6XXX=Costos, 36XX=Resultado del ejercicio
   */
  private async generateClosingEntry(
    tenantId: string,
    period: { id: string; name: string; endDate: Date },
  ): Promise<void> {
    // Get all P&L account balances for this period
    const plLines = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          tenantId,
          periodId: period.id,
          status: 'POSTED',
        },
        account: {
          type: {
            in: [AccountType.REVENUE, AccountType.EXPENSE, AccountType.COGS],
          },
        },
      },
      include: {
        account: { select: { id: true, code: true, type: true, nature: true } },
      },
    });

    if (plLines.length === 0) {
      this.logger.debug(
        `No P&L entries in period ${period.name}, skipping closing entry`,
      );
      return;
    }

    // Aggregate balances by account
    const accountBalances = new Map<
      string,
      { accountId: string; type: AccountType; debit: number; credit: number }
    >();
    for (const line of plLines) {
      if (!accountBalances.has(line.accountId)) {
        accountBalances.set(line.accountId, {
          accountId: line.accountId,
          type: line.account.type,
          debit: 0,
          credit: 0,
        });
      }
      const bal = accountBalances.get(line.accountId)!;
      bal.debit += Number(line.debit);
      bal.credit += Number(line.credit);
    }

    // Find or identify Retained Earnings account (Resultado del Ejercicio — typically 3605 or 3705)
    const retainedEarningsAccount = await this.prisma.account.findFirst({
      where: {
        tenantId,
        type: AccountType.EQUITY,
        isActive: true,
        code: { startsWith: '36' },
      },
      select: { id: true },
    });

    if (!retainedEarningsAccount) {
      this.logger.warn(
        `No retained earnings account (36XX) found for tenant ${tenantId}. Closing entry skipped.`,
      );
      return;
    }

    // Build closing entry lines
    const closingLines: {
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }[] = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const [, bal] of accountBalances) {
      const netBalance = bal.credit - bal.debit;

      if (bal.type === AccountType.REVENUE) {
        // Revenue accounts have credit balance — debit to close
        if (netBalance !== 0) {
          totalRevenue += netBalance;
          closingLines.push({
            accountId: bal.accountId,
            debit: Math.max(netBalance, 0),
            credit: Math.max(-netBalance, 0),
            description: 'Cierre de ingresos del periodo',
          });
        }
      } else {
        // Expense/COGS accounts have debit balance — credit to close
        const expenseBalance = bal.debit - bal.credit;
        if (expenseBalance !== 0) {
          totalExpenses += expenseBalance;
          closingLines.push({
            accountId: bal.accountId,
            debit: Math.max(-expenseBalance, 0),
            credit: Math.max(expenseBalance, 0),
            description: 'Cierre de gastos/costos del periodo',
          });
        }
      }
    }

    if (closingLines.length === 0) {
      this.logger.debug(`All P&L balances are zero in period ${period.name}`);
      return;
    }

    // Net income = Revenue - Expenses (positive = profit, negative = loss)
    const netIncome = totalRevenue - totalExpenses;
    const roundedNetIncome = Math.round(netIncome * 100) / 100;

    if (roundedNetIncome !== 0) {
      closingLines.push({
        accountId: retainedEarningsAccount.id,
        debit: roundedNetIncome < 0 ? Math.abs(roundedNetIncome) : 0,
        credit: roundedNetIncome > 0 ? roundedNetIncome : 0,
        description: `Resultado del ejercicio ${period.name}`,
      });
    }

    // Create the closing journal entry
    try {
      await this.journalEntries.createAutoEntry({
        tenantId,
        date: period.endDate,
        description: `Asiento de cierre - ${period.name}`,
        source: JournalEntrySource.PERIOD_CLOSE,
        lines: closingLines,
      });
      this.logger.log(
        `Closing entry created for period ${period.name}: net income = ${roundedNetIncome}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create closing entry for period ${period.name}: ${error}`,
      );
      throw new BadRequestException(
        `Error al generar asiento de cierre: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }
}
