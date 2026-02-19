import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountsService } from '../accounting/accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountType, AccountType, AccountNature } from '@prisma/client';

export interface BankAccountResponse {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: BankAccountType;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  accountId: string;
  accountCode: string;
  accountName: string;
  statementCount: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BankAccountsService {
  private readonly logger = new Logger(BankAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly accountsService: AccountsService,
  ) {}

  async findAll(activeOnly = true): Promise<BankAccountResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    const where: any = { tenantId };
    if (activeOnly) where.isActive = true;

    const accounts = await this.prisma.bankAccount.findMany({
      where,
      include: {
        account: { select: { code: true, name: true } },
        _count: { select: { statements: true } },
      },
      orderBy: { name: 'asc' },
    });

    return accounts.map((a) => this.mapToResponse(a));
  }

  async findOne(id: string): Promise<BankAccountResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const account = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId },
      include: {
        account: { select: { code: true, name: true } },
        _count: { select: { statements: true } },
      },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta bancaria con ID ${id} no encontrada`);
    }

    return this.mapToResponse(account);
  }

  async create(dto: CreateBankAccountDto): Promise<BankAccountResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    // Check account number uniqueness
    const existing = await this.prisma.bankAccount.findUnique({
      where: { tenantId_accountNumber: { tenantId, accountNumber: dto.accountNumber } },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una cuenta con el numero ${dto.accountNumber}`);
    }

    // Create a PUC sub-account under 1110 (Bancos)
    const bankParent = await this.prisma.account.findUnique({
      where: { tenantId_code: { tenantId, code: '1110' } },
    });

    if (!bankParent) {
      throw new BadRequestException(
        'No se encontro la cuenta PUC 1110 (Bancos). Debe configurar la contabilidad primero.',
      );
    }

    // Generate sub-account code
    const existingSubAccounts = await this.prisma.account.count({
      where: { tenantId, parentId: bankParent.id },
    });
    const subCode = `1110${String(existingSubAccounts + 1).padStart(2, '0')}`;

    // Create PUC account
    const pucAccount = await this.prisma.account.create({
      data: {
        tenantId,
        code: subCode,
        name: `${dto.bankName} ${dto.accountType === BankAccountType.CHECKING ? 'Corriente' : 'Ahorros'}`,
        type: AccountType.ASSET,
        nature: AccountNature.DEBIT,
        parentId: bankParent.id,
        level: 4,
        isBankAccount: true,
        isSystemAccount: false,
      },
    });

    // Create bank account
    const bankAccount = await this.prisma.bankAccount.create({
      data: {
        tenantId,
        accountId: pucAccount.id,
        name: dto.name,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountType: dto.accountType,
        currency: dto.currency ?? 'COP',
        initialBalance: dto.initialBalance ?? 0,
        currentBalance: dto.initialBalance ?? 0,
      },
      include: {
        account: { select: { code: true, name: true } },
        _count: { select: { statements: true } },
      },
    });

    this.logger.log(`Bank account created: ${dto.name} (${dto.accountNumber})`);
    return this.mapToResponse(bankAccount);
  }

  async update(id: string, dto: UpdateBankAccountDto): Promise<BankAccountResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const account = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta bancaria con ID ${id} no encontrada`);
    }

    const updated = await this.prisma.bankAccount.update({
      where: { id },
      data: {
        name: dto.name,
        bankName: dto.bankName,
        currency: dto.currency,
      },
      include: {
        account: { select: { code: true, name: true } },
        _count: { select: { statements: true } },
      },
    });

    this.logger.log(`Bank account updated: ${updated.name}`);
    return this.mapToResponse(updated);
  }

  private mapToResponse(account: any): BankAccountResponse {
    return {
      id: account.id,
      name: account.name,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      currency: account.currency,
      initialBalance: Number(account.initialBalance),
      currentBalance: Number(account.currentBalance),
      isActive: account.isActive,
      accountId: account.accountId,
      accountCode: account.account?.code ?? '',
      accountName: account.account?.name ?? '',
      statementCount: account._count?.statements ?? 0,
      tenantId: account.tenantId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
