import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

const mockAccount = {
  id: 'acc-123',
  code: '1105',
  name: 'Caja',
  type: AccountType.ASSET,
  level: 3,
  isActive: true,
};

const mockTree = {
  roots: [{ id: 'acc-1', code: '1', name: 'Activos', children: [] }],
};

describe('AccountsController', () => {
  let controller: AccountsController;
  let service: jest.Mocked<AccountsService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn().mockResolvedValue([mockAccount]),
      findTree: jest.fn().mockResolvedValue(mockTree),
      findOne: jest.fn().mockResolvedValue(mockAccount),
      create: jest.fn().mockResolvedValue(mockAccount),
      update: jest.fn().mockResolvedValue(mockAccount),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        { provide: AccountsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountsController>(AccountsController);
    service = module.get(AccountsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ─── FINDALL ───────────────────────────────────────────────────
  describe('findAll', () => {
    it('should call service with defaults', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockAccount]);
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, true);
    });

    it('should pass search and type filters', async () => {
      await controller.findAll('caja', AccountType.ASSET);

      expect(service.findAll).toHaveBeenCalledWith('caja', AccountType.ASSET, true);
    });

    it('should pass activeOnly false when query is "false"', async () => {
      await controller.findAll(undefined, undefined, 'false');

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, false);
    });

    it('should pass activeOnly true for any non-"false" string', async () => {
      await controller.findAll(undefined, undefined, 'true');

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, true);
    });
  });

  // ─── FINDTREE ──────────────────────────────────────────────────
  describe('findTree', () => {
    it('should delegate to service', async () => {
      const result = await controller.findTree();

      expect(result).toEqual(mockTree);
      expect(service.findTree).toHaveBeenCalled();
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should delegate to service', async () => {
      const result = await controller.findOne('acc-123');

      expect(result).toEqual(mockAccount);
      expect(service.findOne).toHaveBeenCalledWith('acc-123');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const dto = { code: '110510', name: 'Caja Menor', type: AccountType.ASSET } as any;

    it('should delegate to service', async () => {
      const result = await controller.create(dto);

      expect(result).toEqual(mockAccount);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should propagate ConflictException', async () => {
      service.create.mockRejectedValue(new ConflictException());

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────
  describe('update', () => {
    it('should delegate to service with id and dto', async () => {
      const dto = { name: 'Updated Name' } as any;
      const result = await controller.update('acc-123', dto);

      expect(result).toEqual(mockAccount);
      expect(service.update).toHaveBeenCalledWith('acc-123', dto);
    });

    it('should propagate NotFoundException', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('invalid', {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});
