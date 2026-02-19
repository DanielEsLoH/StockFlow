import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { BankStatementStatus, ReconciliationStatus } from '@prisma/client';

export interface BankStatementLineResponse {
  id: string;
  lineDate: Date;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  status: ReconciliationStatus;
  matchedJournalEntryId: string | null;
  matchedPaymentId: string | null;
  matchedAt: Date | null;
}

export interface BankStatementResponse {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  fileName: string;
  periodStart: Date;
  periodEnd: Date;
  status: BankStatementStatus;
  totalLines: number;
  matchedLines: number;
  matchPercentage: number;
  importedAt: Date;
  importedById: string | null;
  reconciledAt: Date | null;
  lines?: BankStatementLineResponse[];
  tenantId: string;
  createdAt: Date;
}

@Injectable()
export class BankStatementsService {
  private readonly logger = new Logger(BankStatementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findByBankAccount(bankAccountId: string): Promise<BankStatementResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    const statements = await this.prisma.bankStatement.findMany({
      where: { tenantId, bankAccountId },
      include: {
        bankAccount: { select: { name: true } },
      },
      orderBy: { periodStart: 'desc' },
    });

    return statements.map((s) => this.mapToResponse(s));
  }

  async findOne(id: string): Promise<BankStatementResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const statement = await this.prisma.bankStatement.findFirst({
      where: { id, tenantId },
      include: {
        bankAccount: { select: { name: true } },
        lines: {
          orderBy: { lineDate: 'asc' },
        },
      },
    });

    if (!statement) {
      throw new NotFoundException(`Extracto bancario con ID ${id} no encontrado`);
    }

    return this.mapToResponse(statement);
  }

  /**
   * Import statement lines from parsed .xlsx data.
   * The actual .xlsx parsing will be done in the controller using SheetJS.
   */
  async importLines(
    bankAccountId: string,
    fileName: string,
    periodStart: Date,
    periodEnd: Date,
    lines: { lineDate: Date; description: string; reference?: string; debit: number; credit: number; balance?: number }[],
    userId?: string,
  ): Promise<BankStatementResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify bank account exists
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId },
    });

    if (!bankAccount) {
      throw new NotFoundException(`Cuenta bancaria con ID ${bankAccountId} no encontrada`);
    }

    if (lines.length === 0) {
      throw new BadRequestException('El archivo no contiene lineas para importar');
    }

    const statement = await this.prisma.bankStatement.create({
      data: {
        tenantId,
        bankAccountId,
        fileName,
        periodStart,
        periodEnd,
        totalLines: lines.length,
        matchedLines: 0,
        importedById: userId,
        lines: {
          create: lines.map((l) => ({
            lineDate: l.lineDate,
            description: l.description,
            reference: l.reference,
            debit: l.debit,
            credit: l.credit,
            balance: l.balance,
            status: ReconciliationStatus.UNMATCHED,
          })),
        },
      },
      include: {
        bankAccount: { select: { name: true } },
        lines: { orderBy: { lineDate: 'asc' } },
      },
    });

    this.logger.log(`Bank statement imported: ${fileName} (${lines.length} lines)`);
    return this.mapToResponse(statement);
  }

  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    const statement = await this.prisma.bankStatement.findFirst({
      where: { id, tenantId },
    });

    if (!statement) {
      throw new NotFoundException(`Extracto bancario con ID ${id} no encontrado`);
    }

    if (statement.status === BankStatementStatus.RECONCILED) {
      throw new BadRequestException('No se puede eliminar un extracto ya conciliado');
    }

    await this.prisma.bankStatement.delete({ where: { id } });
    this.logger.log(`Bank statement deleted: ${statement.fileName}`);
  }

  private mapToResponse(statement: any): BankStatementResponse {
    return {
      id: statement.id,
      bankAccountId: statement.bankAccountId,
      bankAccountName: statement.bankAccount?.name ?? '',
      fileName: statement.fileName,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      status: statement.status,
      totalLines: statement.totalLines,
      matchedLines: statement.matchedLines,
      matchPercentage:
        statement.totalLines > 0
          ? Math.round((statement.matchedLines / statement.totalLines) * 100)
          : 0,
      importedAt: statement.importedAt,
      importedById: statement.importedById,
      reconciledAt: statement.reconciledAt,
      lines: statement.lines?.map((l: any) => ({
        id: l.id,
        lineDate: l.lineDate,
        description: l.description,
        reference: l.reference,
        debit: Number(l.debit),
        credit: Number(l.credit),
        balance: l.balance ? Number(l.balance) : null,
        status: l.status,
        matchedJournalEntryId: l.matchedJournalEntryId,
        matchedPaymentId: l.matchedPaymentId,
        matchedAt: l.matchedAt,
      })),
      tenantId: statement.tenantId,
      createdAt: statement.createdAt,
    };
  }
}
