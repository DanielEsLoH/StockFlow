import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountType, AccountNature } from '@prisma/client';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

describe('AccountsService', () => {
  let service: AccountsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';

  const mockAccount = {
    id: 'account-123',
    tenantId: mockTenantId,
    code: '1105',
    name: 'Caja',
    description: null,
    type: AccountType.ASSET,
    nature: AccountNature.DEBIT,
    parentId: null,
    level: 3,
    isActive: true,
    isSystemAccount: true,
    isBankAccount: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAccount2 = {
    ...mockAccount,
    id: 'account-456',
    code: '2105',
    name: 'Obligaciones Financieras',
    type: AccountType.LIABILITY,
    nature: AccountNature.CREDIT,
    isSystemAccount: false,
  };

  const mockParentAccount = {
    ...mockAccount,
    id: 'parent-account-id',
    code: '11',
    name: 'Disponible',
    level: 2,
    parentId: null,
  };

  const mockChildAccount = {
    ...mockAccount,
    id: 'child-account-id',
    code: '110505',
    name: 'Caja General',
    level: 4,
    parentId: 'account-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      account: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
      enforceLimit: jest.fn().mockResolvedValue(undefined),
      checkLimit: jest.fn().mockResolvedValue(true),
      getTenant: jest.fn().mockResolvedValue({
        id: mockTenantId,
        name: 'Test Tenant',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all active accounts for tenant', async () => {
      const accounts = [mockAccount, mockAccount2];
      (prismaService.account.findMany as jest.Mock).mockResolvedValue(accounts);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('1105');
      expect(result[1].code).toBe('2105');
    });

    it('should require tenant context', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should filter by isActive=true by default', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll();

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        orderBy: { code: 'asc' },
      });
    });

    it('should include inactive accounts when activeOnly is false', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll(undefined, undefined, false);

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { code: 'asc' },
      });
    });

    it('should filter by search term on code and name', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([
        mockAccount,
      ]);

      await service.findAll('Caja');

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          isActive: true,
          OR: [
            { code: { contains: 'Caja', mode: 'insensitive' } },
            { name: { contains: 'Caja', mode: 'insensitive' } },
          ],
        },
        orderBy: { code: 'asc' },
      });
    });

    it('should filter by account type', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([
        mockAccount,
      ]);

      await service.findAll(undefined, AccountType.ASSET);

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          isActive: true,
          type: AccountType.ASSET,
        },
        orderBy: { code: 'asc' },
      });
    });

    it('should combine search, type, and activeOnly filters', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll('1105', AccountType.ASSET, false);

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          type: AccountType.ASSET,
          OR: [
            { code: { contains: '1105', mode: 'insensitive' } },
            { name: { contains: '1105', mode: 'insensitive' } },
          ],
        },
        orderBy: { code: 'asc' },
      });
    });

    it('should return empty array when no accounts exist', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should order accounts by code ascending', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll();

      expect(prismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { code: 'asc' } }),
      );
    });
  });

  describe('findTree', () => {
    it('should return a hierarchical tree structure', async () => {
      const accounts = [mockParentAccount, mockAccount, mockChildAccount];
      (prismaService.account.findMany as jest.Mock).mockResolvedValue(accounts);

      const result = await service.findTree();

      expect(result.total).toBe(3);
      // Parent and mockAccount (parentId: null) are roots
      expect(result.data).toHaveLength(2);
    });

    it('should nest children under their parent', async () => {
      const parent = { ...mockAccount, id: 'parent-1', code: '11', parentId: null };
      const child = { ...mockAccount, id: 'child-1', code: '1105', parentId: 'parent-1' };
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([parent, child]);

      const result = await service.findTree();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('parent-1');
      expect(result.data[0].children).toHaveLength(1);
      expect(result.data[0].children![0].id).toBe('child-1');
    });

    it('should place accounts with missing parent into roots', async () => {
      const orphan = { ...mockAccount, id: 'orphan-1', parentId: 'non-existent-parent' };
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([orphan]);

      const result = await service.findTree();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('orphan-1');
    });

    it('should return total count of all accounts', async () => {
      const accounts = [mockAccount, mockAccount2];
      (prismaService.account.findMany as jest.Mock).mockResolvedValue(accounts);

      const result = await service.findTree();

      expect(result.total).toBe(2);
    });

    it('should return empty tree when no accounts exist', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findTree();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should require tenant context', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findTree();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should scope query to tenant', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findTree();

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { code: 'asc' },
      });
    });

    it('should initialize children as empty arrays on all nodes', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([mockAccount]);

      const result = await service.findTree();

      expect(result.data[0].children).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single account by id', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);

      const result = await service.findOne('account-123');

      expect(result.id).toBe('account-123');
      expect(result.code).toBe('1105');
      expect(result.name).toBe('Caja');
    });

    it('should throw NotFoundException when account not found', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Cuenta contable con ID nonexistent no encontrada',
      );
    });

    it('should scope query to tenant', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);

      await service.findOne('account-123');

      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'account-123', tenantId: mockTenantId },
      });
    });

    it('should include all expected fields in response', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);

      const result = await service.findOne('account-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('nature');
      expect(result).toHaveProperty('parentId');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('isSystemAccount');
      expect(result).toHaveProperty('isBankAccount');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('findByCode', () => {
    it('should return an account by code', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await service.findByCode('1105');

      expect(result).not.toBeNull();
      expect(result!.code).toBe('1105');
      expect(result!.name).toBe('Caja');
    });

    it('should return null when code not found', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByCode('9999');

      expect(result).toBeNull();
    });

    it('should use compound unique key for lookup', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);

      await service.findByCode('1105');

      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: { tenantId_code: { tenantId: mockTenantId, code: '1105' } },
      });
    });

    it('should require tenant context', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);

      await service.findByCode('1105');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto: CreateAccountDto = {
      code: '110505',
      name: 'Caja General',
      type: AccountType.ASSET,
      nature: AccountNature.DEBIT,
    };

    const createdAccount = {
      ...mockAccount,
      id: 'new-account-id',
      code: '110505',
      name: 'Caja General',
      level: 4,
      isSystemAccount: false,
      isBankAccount: false,
    };

    beforeEach(() => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.account.create as jest.Mock).mockResolvedValue(createdAccount);
    });

    it('should create a new account', async () => {
      const result = await service.create(createDto);

      expect(result.code).toBe('110505');
      expect(result.name).toBe('Caja General');
      expect(prismaService.account.create).toHaveBeenCalled();
    });

    it('should check code uniqueness with compound key', async () => {
      await service.create(createDto);

      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_code: {
            tenantId: mockTenantId,
            code: '110505',
          },
        },
      });
    });

    it('should throw ConflictException when code already exists', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with correct message', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      await expect(service.create(createDto)).rejects.toThrow(
        'Ya existe una cuenta con el codigo 110505',
      );
    });

    it('should validate parent account when parentId provided', async () => {
      const dtoWithParent: CreateAccountDto = {
        ...createDto,
        parentId: 'parent-account-id',
      };
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockParentAccount);

      await service.create(dtoWithParent);

      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'parent-account-id', tenantId: mockTenantId },
      });
    });

    it('should throw BadRequestException when parent account not found', async () => {
      const dtoWithParent: CreateAccountDto = {
        ...createDto,
        parentId: 'nonexistent-parent',
      };
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(dtoWithParent)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for missing parent', async () => {
      const dtoWithParent: CreateAccountDto = {
        ...createDto,
        parentId: 'nonexistent-parent',
      };
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(dtoWithParent)).rejects.toThrow(
        'La cuenta padre no existe',
      );
    });

    it('should not validate parent when parentId is not provided', async () => {
      await service.create(createDto);

      expect(prismaService.account.findFirst).not.toHaveBeenCalled();
    });

    it('should auto-calculate level 1 for single-digit code', async () => {
      const dto: CreateAccountDto = { ...createDto, code: '1' };
      const account = { ...createdAccount, code: '1', level: 1 };
      (prismaService.account.create as jest.Mock).mockResolvedValue(account);

      await service.create(dto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ level: 1 }),
        }),
      );
    });

    it('should auto-calculate level 2 for two-digit code', async () => {
      const dto: CreateAccountDto = { ...createDto, code: '11' };
      const account = { ...createdAccount, code: '11', level: 2 };
      (prismaService.account.create as jest.Mock).mockResolvedValue(account);

      await service.create(dto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ level: 2 }),
        }),
      );
    });

    it('should auto-calculate level 3 for three-digit code', async () => {
      const dto: CreateAccountDto = { ...createDto, code: '110' };
      const account = { ...createdAccount, code: '110', level: 3 };
      (prismaService.account.create as jest.Mock).mockResolvedValue(account);

      await service.create(dto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ level: 3 }),
        }),
      );
    });

    it('should auto-calculate level 3 for four-digit code', async () => {
      const dto: CreateAccountDto = { ...createDto, code: '1105' };
      const account = { ...createdAccount, code: '1105', level: 3 };
      (prismaService.account.create as jest.Mock).mockResolvedValue(account);

      await service.create(dto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ level: 3 }),
        }),
      );
    });

    it('should auto-calculate level 4 for codes longer than 4 digits', async () => {
      await service.create(createDto); // code: '110505' (6 chars)

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ level: 4 }),
        }),
      );
    });

    it('should set isSystemAccount to false on creation', async () => {
      await service.create(createDto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isSystemAccount: false }),
        }),
      );
    });

    it('should default isBankAccount to false when not provided', async () => {
      await service.create(createDto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isBankAccount: false }),
        }),
      );
    });

    it('should set isBankAccount when provided', async () => {
      const dtoWithBank: CreateAccountDto = { ...createDto, isBankAccount: true };

      await service.create(dtoWithBank);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isBankAccount: true }),
        }),
      );
    });

    it('should include tenantId in created account', async () => {
      await service.create(createDto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should include description when provided', async () => {
      const dtoWithDesc: CreateAccountDto = {
        ...createDto,
        description: 'Efectivo en caja',
      };

      await service.create(dtoWithDesc);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'Efectivo en caja' }),
        }),
      );
    });

    it('should require tenant context', async () => {
      await service.create(createDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateAccountDto = {
      name: 'Caja Actualizada',
      description: 'Descripcion actualizada',
    };

    beforeEach(() => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.account.update as jest.Mock).mockResolvedValue({
        ...mockAccount,
        name: 'Caja Actualizada',
        description: 'Descripcion actualizada',
      });
    });

    it('should update an account', async () => {
      const result = await service.update('account-123', updateDto);

      expect(result.name).toBe('Caja Actualizada');
      expect(result.description).toBe('Descripcion actualizada');
    });

    it('should throw NotFoundException when account not found', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'Cuenta contable con ID nonexistent no encontrada',
      );
    });

    it('should validate parent account when parentId provided', async () => {
      const dtoWithParent: UpdateAccountDto = {
        ...updateDto,
        parentId: 'parent-account-id',
      };
      // First call returns the account being updated, second returns the parent
      (prismaService.account.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockParentAccount);

      await service.update('account-123', dtoWithParent);

      expect(prismaService.account.findFirst).toHaveBeenCalledTimes(2);
      expect(prismaService.account.findFirst).toHaveBeenNthCalledWith(2, {
        where: { id: 'parent-account-id', tenantId: mockTenantId },
      });
    });

    it('should throw BadRequestException when parent not found', async () => {
      const dtoWithParent: UpdateAccountDto = {
        parentId: 'nonexistent-parent',
      };
      (prismaService.account.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(null);

      await expect(service.update('account-123', dtoWithParent)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for missing parent', async () => {
      const dtoWithParent: UpdateAccountDto = {
        parentId: 'nonexistent-parent',
      };
      (prismaService.account.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(null);

      await expect(service.update('account-123', dtoWithParent)).rejects.toThrow(
        'La cuenta padre no existe',
      );
    });

    it('should prevent circular reference when parentId equals own id', async () => {
      const circularDto: UpdateAccountDto = {
        parentId: 'account-123',
      };
      // First call returns the account; second call returns a valid parent (but circular check fires first)
      (prismaService.account.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);

      await expect(service.update('account-123', circularDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for circular reference', async () => {
      const circularDto: UpdateAccountDto = {
        parentId: 'account-123',
      };
      (prismaService.account.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);

      await expect(service.update('account-123', circularDto)).rejects.toThrow(
        'Una cuenta no puede ser su propia cuenta padre',
      );
    });

    it('should not validate parent when parentId is not provided', async () => {
      await service.update('account-123', { name: 'Updated Name' });

      // findFirst called only once for the account itself
      expect(prismaService.account.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should only update allowed fields (name, description, parentId, isBankAccount)', async () => {
      const fullUpdate: UpdateAccountDto = {
        name: 'New Name',
        description: 'New Description',
        parentId: 'parent-account-id',
        isBankAccount: true,
      };
      (prismaService.account.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockParentAccount);

      await service.update('account-123', fullUpdate);

      expect(prismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: {
          name: 'New Name',
          description: 'New Description',
          parentId: 'parent-account-id',
          isBankAccount: true,
        },
      });
    });

    it('should update only provided fields', async () => {
      const partialUpdate: UpdateAccountDto = { description: 'Solo descripcion' };
      (prismaService.account.update as jest.Mock).mockResolvedValue({
        ...mockAccount,
        description: 'Solo descripcion',
      });

      await service.update('account-123', partialUpdate);

      expect(prismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: {
          name: undefined,
          description: 'Solo descripcion',
          parentId: undefined,
          isBankAccount: undefined,
        },
      });
    });

    it('should scope account lookup to tenant', async () => {
      await service.update('account-123', updateDto);

      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'account-123', tenantId: mockTenantId },
      });
    });

    it('should require tenant context', async () => {
      await service.update('account-123', updateDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('mapToResponse', () => {
    it('should map all account fields correctly', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);

      const result = await service.findOne('account-123');

      expect(result.id).toBe('account-123');
      expect(result.code).toBe('1105');
      expect(result.name).toBe('Caja');
      expect(result.description).toBeNull();
      expect(result.type).toBe(AccountType.ASSET);
      expect(result.nature).toBe(AccountNature.DEBIT);
      expect(result.parentId).toBeNull();
      expect(result.level).toBe(3);
      expect(result.isActive).toBe(true);
      expect(result.isSystemAccount).toBe(true);
      expect(result.isBankAccount).toBe(false);
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.createdAt).toEqual(new Date('2024-01-01'));
      expect(result.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should not include unexpected properties', async () => {
      const accountWithExtra = { ...mockAccount, extraField: 'should not appear' };
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(accountWithExtra);

      const result = await service.findOne('account-123');

      expect(result).not.toHaveProperty('extraField');
    });
  });

  describe('logging', () => {
    it('should log when account is created', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.account.create as jest.Mock).mockResolvedValue({
        ...mockAccount,
        id: 'new-id',
        code: '110505',
        name: 'Caja General',
      });

      await service.create({
        code: '110505',
        name: 'Caja General',
        type: AccountType.ASSET,
        nature: AccountNature.DEBIT,
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Account created'),
      );
    });

    it('should log when account is updated', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.account.update as jest.Mock).mockResolvedValue(mockAccount);

      await service.update('account-123', { description: 'Updated' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Account updated'),
      );
    });
  });

  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll();

      expect(prismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);

      await service.findOne('account-123');

      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'account-123', tenantId: mockTenantId },
      });
    });

    it('should scope findByCode to tenant', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);

      await service.findByCode('1105');

      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: { tenantId_code: { tenantId: mockTenantId, code: '1105' } },
      });
    });

    it('should scope findTree to tenant', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([]);

      await service.findTree();

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { code: 'asc' },
      });
    });

    it('should scope create uniqueness check to tenant', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.account.create as jest.Mock).mockResolvedValue(mockAccount);

      await service.create({
        code: '1105',
        name: 'Caja',
        type: AccountType.ASSET,
        nature: AccountNature.DEBIT,
      });

      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_code: { tenantId: mockTenantId, code: '1105' },
        },
      });
    });

    it('should scope update account lookup to tenant', async () => {
      (prismaService.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.account.update as jest.Mock).mockResolvedValue(mockAccount);

      await service.update('account-123', { name: 'Test' });

      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'account-123', tenantId: mockTenantId },
      });
    });
  });
});
