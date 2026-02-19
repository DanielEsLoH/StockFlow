import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  ReconciliationStatus,
  BankStatementStatus,
  JournalEntryStatus,
} from '@prisma/client';

export interface ReconciliationResult {
  statementId: string;
  totalLines: number;
  matchedLines: number;
  matchPercentage: number;
  newMatches: number;
}

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Auto-match statement lines with journal entries.
   * Matches by: amount, date ±3 days, similar reference.
   */
  async autoMatch(statementId: string): Promise<ReconciliationResult> {
    const tenantId = this.tenantContext.requireTenantId();

    const statement = await this.prisma.bankStatement.findFirst({
      where: { id: statementId, tenantId },
      include: {
        bankAccount: { select: { accountId: true } },
        lines: {
          where: { status: ReconciliationStatus.UNMATCHED },
        },
      },
    });

    if (!statement) {
      throw new NotFoundException(`Extracto con ID ${statementId} no encontrado`);
    }

    if (statement.status === BankStatementStatus.RECONCILED) {
      throw new BadRequestException('Este extracto ya esta conciliado');
    }

    const bankPucAccountId = statement.bankAccount.accountId;
    let newMatches = 0;

    for (const line of statement.lines) {
      const amount = Number(line.debit) > 0 ? Number(line.debit) : Number(line.credit);
      const isDebit = Number(line.debit) > 0;

      // Search for matching journal entry lines
      const dateMin = new Date(line.lineDate);
      dateMin.setDate(dateMin.getDate() - 3);
      const dateMax = new Date(line.lineDate);
      dateMax.setDate(dateMax.getDate() + 3);

      const matchingEntry = await this.prisma.journalEntry.findFirst({
        where: {
          tenantId,
          status: JournalEntryStatus.POSTED,
          date: { gte: dateMin, lte: dateMax },
          lines: {
            some: {
              accountId: bankPucAccountId,
              ...(isDebit ? { credit: amount } : { debit: amount }),
            },
          },
          // Not already matched to another statement line
          matchedBankStatementLines: { none: {} },
        },
      });

      if (matchingEntry) {
        await this.prisma.bankStatementLine.update({
          where: { id: line.id },
          data: {
            status: ReconciliationStatus.MATCHED,
            matchedJournalEntryId: matchingEntry.id,
            matchedAt: new Date(),
          },
        });
        newMatches++;
      }
    }

    // Update statement counters
    const matchedTotal = await this.prisma.bankStatementLine.count({
      where: {
        statementId,
        status: { in: [ReconciliationStatus.MATCHED, ReconciliationStatus.MANUALLY_MATCHED] },
      },
    });

    const updatedStatement = await this.prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        matchedLines: matchedTotal,
        status:
          matchedTotal === statement.totalLines
            ? BankStatementStatus.RECONCILED
            : matchedTotal > 0
              ? BankStatementStatus.PARTIALLY_RECONCILED
              : BankStatementStatus.IMPORTED,
      },
    });

    this.logger.log(
      `Auto-match: ${newMatches} new matches for statement ${statement.fileName}`,
    );

    return {
      statementId,
      totalLines: statement.totalLines,
      matchedLines: matchedTotal,
      matchPercentage:
        statement.totalLines > 0
          ? Math.round((matchedTotal / statement.totalLines) * 100)
          : 0,
      newMatches,
    };
  }

  /**
   * Manually match a statement line to a journal entry.
   */
  async manualMatch(
    lineId: string,
    journalEntryId: string,
    userId: string,
  ): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    const line = await this.prisma.bankStatementLine.findFirst({
      where: { id: lineId },
      include: {
        statement: { select: { tenantId: true, id: true, totalLines: true } },
      },
    });

    if (!line || line.statement.tenantId !== tenantId) {
      throw new NotFoundException('Linea de extracto no encontrada');
    }

    if (line.status !== ReconciliationStatus.UNMATCHED) {
      throw new BadRequestException('Esta linea ya esta conciliada');
    }

    // Verify journal entry exists
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: journalEntryId, tenantId, status: JournalEntryStatus.POSTED },
    });

    if (!entry) {
      throw new NotFoundException('Asiento contable no encontrado o no esta publicado');
    }

    await this.prisma.bankStatementLine.update({
      where: { id: lineId },
      data: {
        status: ReconciliationStatus.MANUALLY_MATCHED,
        matchedJournalEntryId: journalEntryId,
        matchedAt: new Date(),
        matchedById: userId,
      },
    });

    // Update statement counters
    await this.updateStatementCounters(line.statement.id);

    this.logger.log(`Manual match: line ${lineId} -> entry ${journalEntryId}`);
  }

  /**
   * Unmatch a previously matched line.
   */
  async unmatch(lineId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    const line = await this.prisma.bankStatementLine.findFirst({
      where: { id: lineId },
      include: {
        statement: { select: { tenantId: true, id: true } },
      },
    });

    if (!line || line.statement.tenantId !== tenantId) {
      throw new NotFoundException('Linea de extracto no encontrada');
    }

    if (line.status === ReconciliationStatus.UNMATCHED) {
      throw new BadRequestException('Esta linea no esta conciliada');
    }

    await this.prisma.bankStatementLine.update({
      where: { id: lineId },
      data: {
        status: ReconciliationStatus.UNMATCHED,
        matchedJournalEntryId: null,
        matchedPaymentId: null,
        matchedAt: null,
        matchedById: null,
      },
    });

    await this.updateStatementCounters(line.statement.id);
    this.logger.log(`Unmatched line ${lineId}`);
  }

  /**
   * Finalize a reconciliation — marks the statement as RECONCILED.
   */
  async finalize(statementId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    const statement = await this.prisma.bankStatement.findFirst({
      where: { id: statementId, tenantId },
    });

    if (!statement) {
      throw new NotFoundException(`Extracto con ID ${statementId} no encontrado`);
    }

    if (statement.status === BankStatementStatus.RECONCILED) {
      throw new BadRequestException('Este extracto ya esta conciliado');
    }

    await this.prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        status: BankStatementStatus.RECONCILED,
        reconciledAt: new Date(),
      },
    });

    this.logger.log(`Reconciliation finalized for statement ${statement.fileName}`);
  }

  private async updateStatementCounters(statementId: string): Promise<void> {
    const matchedTotal = await this.prisma.bankStatementLine.count({
      where: {
        statementId,
        status: { in: [ReconciliationStatus.MATCHED, ReconciliationStatus.MANUALLY_MATCHED] },
      },
    });

    const statement = await this.prisma.bankStatement.findUnique({
      where: { id: statementId },
    });

    await this.prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        matchedLines: matchedTotal,
        status:
          matchedTotal === statement!.totalLines
            ? BankStatementStatus.RECONCILED
            : matchedTotal > 0
              ? BankStatementStatus.PARTIALLY_RECONCILED
              : BankStatementStatus.IMPORTED,
      },
    });
  }
}
