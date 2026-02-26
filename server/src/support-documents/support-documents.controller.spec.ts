import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupportDocumentStatus } from '@prisma/client';
import { SupportDocumentsController } from './support-documents.controller';
import { SupportDocumentsService } from './support-documents.service';
import type { RequestUser } from '../auth/types';

describe('SupportDocumentsController', () => {
  let controller: SupportDocumentsController;
  let service: jest.Mocked<SupportDocumentsService>;

  const mockUser: RequestUser = {
    userId: 'user-456',
    email: 'admin@test.com',
    role: 'ADMIN' as any,
    tenantId: 'tenant-123',
  };

  const mockDocumentResponse = {
    id: 'sd-1',
    tenantId: 'tenant-123',
    supplierId: 'supplier-1',
    userId: 'user-456',
    documentNumber: 'DS-00001',
    issueDate: new Date('2026-02-25'),
    supplierName: 'Juan Carlos Perez',
    supplierDocument: '1234567890',
    supplierDocType: 'CC',
    subtotal: 200000,
    tax: 0,
    withholdings: 0,
    total: 200000,
    status: SupportDocumentStatus.DRAFT,
    dianCude: null,
    dianXml: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-1',
        supportDocumentId: 'sd-1',
        description: 'Servicio de transporte',
        quantity: 2,
        unitPrice: 100000,
        taxRate: 0,
        subtotal: 200000,
        tax: 0,
        total: 200000,
      },
    ],
    supplier: {
      id: 'supplier-1',
      name: 'Juan Carlos Perez',
      documentNumber: '1234567890',
    },
    user: {
      id: 'user-456',
      name: 'Admin User',
      email: 'admin@test.com',
    },
  };

  const mockPaginatedResponse = {
    data: [mockDocumentResponse],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const mockStats = {
    totalDocuments: 5,
    totalValue: 750000,
    documentsByStatus: {
      [SupportDocumentStatus.DRAFT]: 2,
      [SupportDocumentStatus.GENERATED]: 1,
      [SupportDocumentStatus.SENT]: 1,
      [SupportDocumentStatus.ACCEPTED]: 1,
      [SupportDocumentStatus.REJECTED]: 0,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      generate: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportDocumentsController],
      providers: [
        { provide: SupportDocumentsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SupportDocumentsController>(
      SupportDocumentsController,
    );
    service = module.get(SupportDocumentsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      const filters = { page: 1, limit: 10 };
      const result = await controller.findAll(filters);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass filters to service', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const filters = {
        status: SupportDocumentStatus.DRAFT,
        supplierName: 'Juan',
      };
      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('getStats', () => {
    it('should return document statistics', async () => {
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      service.findOne.mockResolvedValue(mockDocumentResponse);

      const result = await controller.findOne('sd-1');

      expect(result).toEqual(mockDocumentResponse);
      expect(service.findOne).toHaveBeenCalledWith('sd-1');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a document and pass userId from CurrentUser', async () => {
      service.create.mockResolvedValue(mockDocumentResponse);

      const dto = {
        supplierName: 'Juan Carlos Perez',
        supplierDocument: '1234567890',
        items: [
          {
            description: 'Servicio de transporte',
            quantity: 2,
            unitPrice: 100000,
          },
        ],
      };

      const result = await controller.create(dto, mockUser);

      expect(result).toEqual(mockDocumentResponse);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser.userId);
    });

    it('should propagate NotFoundException for invalid supplier', async () => {
      service.create.mockRejectedValue(new NotFoundException());

      const dto = {
        supplierId: 'invalid',
        supplierName: 'Test',
        supplierDocument: '123',
        items: [
          { description: 'Item', quantity: 1, unitPrice: 1000 },
        ],
      };

      await expect(controller.create(dto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a document', async () => {
      const updated = { ...mockDocumentResponse, notes: 'Updated' };
      service.update.mockResolvedValue(updated);

      const dto = { notes: 'Updated' };
      const result = await controller.update('sd-1', dto);

      expect(result.notes).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith('sd-1', dto);
    });

    it('should propagate BadRequestException for non-DRAFT', async () => {
      service.update.mockRejectedValue(new BadRequestException());

      await expect(
        controller.update('sd-1', { notes: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a document', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('sd-1');

      expect(service.remove).toHaveBeenCalledWith('sd-1');
    });

    it('should propagate NotFoundException', async () => {
      service.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate BadRequestException for non-DRAFT', async () => {
      service.remove.mockRejectedValue(new BadRequestException());

      await expect(controller.remove('sd-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generate', () => {
    it('should generate a document', async () => {
      const generated = {
        ...mockDocumentResponse,
        status: SupportDocumentStatus.GENERATED,
      };
      service.generate.mockResolvedValue(generated);

      const result = await controller.generate('sd-1');

      expect(result.status).toBe(SupportDocumentStatus.GENERATED);
      expect(service.generate).toHaveBeenCalledWith('sd-1');
    });

    it('should propagate NotFoundException', async () => {
      service.generate.mockRejectedValue(new NotFoundException());

      await expect(controller.generate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate BadRequestException for non-DRAFT', async () => {
      service.generate.mockRejectedValue(new BadRequestException());

      await expect(controller.generate('sd-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
