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
import { AccountingPeriodStatus } from '@prisma/client';

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
      throw new NotFoundException(`Periodo contable con ID ${id} no encontrado`);
    }

    return this.mapToResponse(period);
  }

  async create(dto: CreateAccountingPeriodDto): Promise<AccountingPeriodResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // Check for overlapping periods
    const overlapping = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
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

  async closePeriod(id: string, userId: string): Promise<AccountingPeriodResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.accountingPeriod.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { journalEntries: true } },
      },
    });

    if (!period) {
      throw new NotFoundException(`Periodo contable con ID ${id} no encontrado`);
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
}
