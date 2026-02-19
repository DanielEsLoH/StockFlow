import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Prisma, Account, AccountType, AccountNature } from '@prisma/client';

export interface AccountResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: AccountType;
  nature: AccountNature;
  parentId: string | null;
  level: number;
  isActive: boolean;
  isSystemAccount: boolean;
  isBankAccount: boolean;
  children?: AccountResponse[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountTreeResponse {
  data: AccountResponse[];
  total: number;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(
    search?: string,
    type?: AccountType,
    activeOnly = true,
  ): Promise<AccountResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    const where: Prisma.AccountWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const accounts = await this.prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    return accounts.map((a) => this.mapToResponse(a));
  }

  async findTree(): Promise<AccountTreeResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });

    // Build tree structure
    const accountMap = new Map<string, AccountResponse>();
    const roots: AccountResponse[] = [];

    for (const account of accounts) {
      accountMap.set(account.id, { ...this.mapToResponse(account), children: [] });
    }

    for (const account of accounts) {
      const node = accountMap.get(account.id)!;
      if (account.parentId && accountMap.has(account.parentId)) {
        accountMap.get(account.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    return { data: roots, total: accounts.length };
  }

  async findOne(id: string): Promise<AccountResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const account = await this.prisma.account.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta contable con ID ${id} no encontrada`);
    }

    return this.mapToResponse(account);
  }

  async findByCode(code: string): Promise<AccountResponse | null> {
    const tenantId = this.tenantContext.requireTenantId();

    const account = await this.prisma.account.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    return account ? this.mapToResponse(account) : null;
  }

  async create(dto: CreateAccountDto): Promise<AccountResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    // Check code uniqueness
    const existing = await this.prisma.account.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una cuenta con el codigo ${dto.code}`);
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.account.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) {
        throw new BadRequestException('La cuenta padre no existe');
      }
    }

    // Determine level from code length
    const level = this.getAccountLevel(dto.code);

    const account = await this.prisma.account.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        nature: dto.nature,
        parentId: dto.parentId,
        level,
        isBankAccount: dto.isBankAccount ?? false,
        isSystemAccount: false,
      },
    });

    this.logger.log(`Account created: ${account.code} - ${account.name}`);
    return this.mapToResponse(account);
  }

  async update(id: string, dto: UpdateAccountDto): Promise<AccountResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const account = await this.prisma.account.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta contable con ID ${id} no encontrada`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.account.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) {
        throw new BadRequestException('La cuenta padre no existe');
      }
      // Prevent circular reference
      if (dto.parentId === id) {
        throw new BadRequestException('Una cuenta no puede ser su propia cuenta padre');
      }
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        isBankAccount: dto.isBankAccount,
      },
    });

    this.logger.log(`Account updated: ${updated.code} - ${updated.name}`);
    return this.mapToResponse(updated);
  }

  private getAccountLevel(code: string): number {
    if (code.length <= 1) return 1; // Clase
    if (code.length <= 2) return 2; // Grupo
    if (code.length <= 4) return 3; // Cuenta
    return 4; // Subcuenta
  }

  private mapToResponse(account: Account): AccountResponse {
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      description: account.description,
      type: account.type,
      nature: account.nature,
      parentId: account.parentId,
      level: account.level,
      isActive: account.isActive,
      isSystemAccount: account.isSystemAccount,
      isBankAccount: account.isBankAccount,
      tenantId: account.tenantId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
