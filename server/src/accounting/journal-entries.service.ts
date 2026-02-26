import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import {
  Prisma,
  JournalEntryStatus,
  JournalEntrySource,
  AccountingPeriodStatus,
} from '@prisma/client';

export interface JournalEntryLineResponse {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  costCenterId: string | null;
  costCenterCode: string | null;
  costCenterName: string | null;
  description: string | null;
  debit: number;
  credit: number;
}

export interface JournalEntryResponse {
  id: string;
  entryNumber: string;
  date: Date;
  description: string;
  source: JournalEntrySource;
  status: JournalEntryStatus;
  periodId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  purchaseOrderId: string | null;
  stockMovementId: string | null;
  totalDebit: number;
  totalCredit: number;
  createdById: string | null;
  postedAt: Date | null;
  voidedAt: Date | null;
  voidReason: string | null;
  lines: JournalEntryLineResponse[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedJournalEntriesResponse {
  data: JournalEntryResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class JournalEntriesService {
  private readonly logger = new Logger(JournalEntriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    source?: JournalEntrySource,
    status?: JournalEntryStatus,
    fromDate?: string,
    toDate?: string,
  ): Promise<PaginatedJournalEntriesResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    const where: Prisma.JournalEntryWhereInput = { tenantId };

    if (source) where.source = source;
    if (status) where.status = status;

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true } },
            costCenter: { select: { code: true, name: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data: entries.map((e) => this.mapToResponse(e)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  async findOne(id: string): Promise<JournalEntryResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true } },
            costCenter: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Asiento contable con ID ${id} no encontrado`);
    }

    return this.mapToResponse(entry);
  }

  async create(dto: CreateJournalEntryDto, userId?: string): Promise<JournalEntryResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    // Validate debit/credit balance
    const totalDebit = dto.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = dto.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Los debitos ($${totalDebit.toFixed(2)}) y creditos ($${totalCredit.toFixed(2)}) no estan balanceados`,
      );
    }

    // Each line must have either debit or credit, not both
    for (const line of dto.lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException(
          'Cada linea debe tener debito o credito, no ambos',
        );
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException(
          'Cada linea debe tener un valor de debito o credito mayor a 0',
        );
      }
    }

    // Validate period if provided
    if (dto.periodId) {
      const period = await this.prisma.accountingPeriod.findFirst({
        where: { id: dto.periodId, tenantId },
      });
      if (!period) {
        throw new NotFoundException('Periodo contable no encontrado');
      }
      if (period.status === AccountingPeriodStatus.CLOSED) {
        throw new BadRequestException('No se pueden crear asientos en un periodo cerrado');
      }
    }

    // Validate all accounts exist and belong to tenant
    const accountIds = [...new Set(dto.lines.map((l) => l.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, tenantId, isActive: true },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('Una o mas cuentas no existen o estan inactivas');
    }

    // Generate entry number
    const entryNumber = await this.generateEntryNumber(tenantId);

    const entry = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        entryNumber,
        date: new Date(dto.date),
        description: dto.description,
        source: JournalEntrySource.MANUAL,
        status: JournalEntryStatus.DRAFT,
        periodId: dto.periodId,
        totalDebit,
        totalCredit,
        createdById: userId,
        lines: {
          create: dto.lines.map((l) => ({
            accountId: l.accountId,
            costCenterId: l.costCenterId,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true } },
            costCenter: { select: { code: true, name: true } },
          },
        },
      },
    });

    this.logger.log(`Manual journal entry created: ${entryNumber}`);
    return this.mapToResponse(entry);
  }

  /**
   * Create an automatic journal entry from a business event.
   * Auto entries are created as POSTED immediately.
   */
  async createAutoEntry(params: {
    tenantId: string;
    date: Date;
    description: string;
    source: JournalEntrySource;
    invoiceId?: string;
    paymentId?: string;
    purchaseOrderId?: string;
    stockMovementId?: string;
    dianDocumentId?: string;
    expenseId?: string;
    lines: { accountId: string; costCenterId?: string; description?: string; debit: number; credit: number }[];
  }): Promise<JournalEntryResponse> {
    const totalDebit = params.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Asiento automatico desbalanceado');
    }

    // Find open period for the date
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId: params.tenantId,
        status: AccountingPeriodStatus.OPEN,
        startDate: { lte: params.date },
        endDate: { gte: params.date },
      },
    });

    const entryNumber = await this.generateEntryNumber(params.tenantId);

    const entry = await this.prisma.journalEntry.create({
      data: {
        tenantId: params.tenantId,
        entryNumber,
        date: params.date,
        description: params.description,
        source: params.source,
        status: JournalEntryStatus.POSTED,
        periodId: period?.id,
        invoiceId: params.invoiceId,
        paymentId: params.paymentId,
        purchaseOrderId: params.purchaseOrderId,
        stockMovementId: params.stockMovementId,
        dianDocumentId: params.dianDocumentId,
        expenseId: params.expenseId,
        totalDebit,
        totalCredit,
        postedAt: new Date(),
        lines: {
          create: params.lines.map((l) => ({
            accountId: l.accountId,
            costCenterId: l.costCenterId,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true } },
            costCenter: { select: { code: true, name: true } },
          },
        },
      },
    });

    this.logger.log(`Auto journal entry created: ${entryNumber} (${params.source})`);
    return this.mapToResponse(entry);
  }

  async postEntry(id: string): Promise<JournalEntryResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new NotFoundException(`Asiento contable con ID ${id} no encontrado`);
    }

    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden publicar asientos en estado borrador');
    }

    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.POSTED,
        postedAt: new Date(),
      },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true } },
            costCenter: { select: { code: true, name: true } },
          },
        },
      },
    });

    this.logger.log(`Journal entry posted: ${updated.entryNumber}`);
    return this.mapToResponse(updated);
  }

  async voidEntry(id: string, reason: string): Promise<JournalEntryResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new NotFoundException(`Asiento contable con ID ${id} no encontrado`);
    }

    if (entry.status === JournalEntryStatus.VOIDED) {
      throw new BadRequestException('Este asiento ya esta anulado');
    }

    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.VOIDED,
        voidedAt: new Date(),
        voidReason: reason,
      },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true } },
            costCenter: { select: { code: true, name: true } },
          },
        },
      },
    });

    this.logger.log(`Journal entry voided: ${updated.entryNumber}`);
    return this.mapToResponse(updated);
  }

  private async generateEntryNumber(tenantId: string): Promise<string> {
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { entryNumber: true },
    });

    if (!lastEntry) return 'CE-00001';

    const lastNumber = parseInt(lastEntry.entryNumber.replace('CE-', ''), 10);
    return `CE-${String(lastNumber + 1).padStart(5, '0')}`;
  }

  private mapToResponse(entry: any): JournalEntryResponse {
    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      date: entry.date,
      description: entry.description,
      source: entry.source,
      status: entry.status,
      periodId: entry.periodId,
      invoiceId: entry.invoiceId,
      paymentId: entry.paymentId,
      purchaseOrderId: entry.purchaseOrderId,
      stockMovementId: entry.stockMovementId,
      totalDebit: Number(entry.totalDebit),
      totalCredit: Number(entry.totalCredit),
      createdById: entry.createdById,
      postedAt: entry.postedAt,
      voidedAt: entry.voidedAt,
      voidReason: entry.voidReason,
      lines: (entry.lines ?? []).map((l: any) => ({
        id: l.id,
        accountId: l.accountId,
        accountCode: l.account?.code ?? '',
        accountName: l.account?.name ?? '',
        costCenterId: l.costCenterId ?? null,
        costCenterCode: l.costCenter?.code ?? null,
        costCenterName: l.costCenter?.name ?? null,
        description: l.description,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })),
      tenantId: entry.tenantId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
