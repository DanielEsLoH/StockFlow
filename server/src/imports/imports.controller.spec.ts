import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { TemplateGeneratorService } from './templates/template-generator.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';
import {
  ImportModule,
  DuplicateStrategy,
  type ImportValidationResult,
  type ImportResult,
} from './dto/import-file.dto';

describe('ImportsController', () => {
  let controller: ImportsController;
  let importsService: any;
  let templateGeneratorService: any;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024,
    buffer: Buffer.from('fake'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  const mockUser = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    importsService = {
      validateImport: jest.fn(),
      executeImport: jest.fn(),
    };

    templateGeneratorService = {
      generateTemplate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportsController],
      providers: [
        { provide: ImportsService, useValue: importsService },
        {
          provide: TemplateGeneratorService,
          useValue: templateGeneratorService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ImportsController>(ImportsController);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // downloadTemplate
  // ---------------------------------------------------------------------------
  describe('downloadTemplate', () => {
    it('should return an XLSX buffer with correct headers', async () => {
      const fakeBuffer = Buffer.from('xlsx-content');
      templateGeneratorService.generateTemplate.mockReturnValue(fakeBuffer);

      const mockRes = {
        set: jest.fn(),
        send: jest.fn(),
      } as any;

      await controller.downloadTemplate(ImportModule.PRODUCTS, mockRes);

      expect(templateGeneratorService.generateTemplate).toHaveBeenCalledWith(
        ImportModule.PRODUCTS,
      );
      expect(mockRes.set).toHaveBeenCalledWith({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="plantilla_importacion_products.xlsx"',
        'Content-Length': fakeBuffer.length.toString(),
      });
      expect(mockRes.send).toHaveBeenCalledWith(fakeBuffer);
    });

    it('should generate template for customers module', async () => {
      const fakeBuffer = Buffer.from('customers-template');
      templateGeneratorService.generateTemplate.mockReturnValue(fakeBuffer);

      const mockRes = { set: jest.fn(), send: jest.fn() } as any;

      await controller.downloadTemplate(ImportModule.CUSTOMERS, mockRes);

      expect(templateGeneratorService.generateTemplate).toHaveBeenCalledWith(
        ImportModule.CUSTOMERS,
      );
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition':
            'attachment; filename="plantilla_importacion_customers.xlsx"',
        }),
      );
    });

    it('should generate template for suppliers module', async () => {
      const fakeBuffer = Buffer.from('suppliers-template');
      templateGeneratorService.generateTemplate.mockReturnValue(fakeBuffer);

      const mockRes = { set: jest.fn(), send: jest.fn() } as any;

      await controller.downloadTemplate(ImportModule.SUPPLIERS, mockRes);

      expect(templateGeneratorService.generateTemplate).toHaveBeenCalledWith(
        ImportModule.SUPPLIERS,
      );
    });

    it('should throw BadRequestException for invalid module', async () => {
      const mockRes = { set: jest.fn(), send: jest.fn() } as any;

      await expect(
        controller.downloadTemplate('invalid' as ImportModule, mockRes),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include module name in the error message for invalid module', async () => {
      const mockRes = { set: jest.fn(), send: jest.fn() } as any;

      await expect(
        controller.downloadTemplate('orders' as ImportModule, mockRes),
      ).rejects.toThrow(/orders/);
    });
  });

  // ---------------------------------------------------------------------------
  // validateImport
  // ---------------------------------------------------------------------------
  describe('validateImport', () => {
    it('should call importsService.validateImport and return result', async () => {
      const mockResult: ImportValidationResult = {
        totalRows: 2,
        validRows: 2,
        invalidRows: 0,
        duplicateRows: 0,
        rows: [
          { row: 2, data: { name: 'A' }, errors: [], isDuplicate: false },
          { row: 3, data: { name: 'B' }, errors: [], isDuplicate: false },
        ],
      };

      importsService.validateImport.mockResolvedValue(mockResult);

      const result = await controller.validateImport(mockFile, {
        module: ImportModule.PRODUCTS,
      });

      expect(importsService.validateImport).toHaveBeenCalledWith(
        mockFile,
        ImportModule.PRODUCTS,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        controller.validateImport(undefined as any, {
          module: ImportModule.PRODUCTS,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.validateImport(undefined as any, {
          module: ImportModule.PRODUCTS,
        }),
      ).rejects.toThrow(/No se proporciono/);
    });

    it('should pass through module from DTO', async () => {
      importsService.validateImport.mockResolvedValue({
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        rows: [],
      });

      await controller.validateImport(mockFile, {
        module: ImportModule.CUSTOMERS,
      });

      expect(importsService.validateImport).toHaveBeenCalledWith(
        mockFile,
        ImportModule.CUSTOMERS,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // executeImport
  // ---------------------------------------------------------------------------
  describe('executeImport', () => {
    it('should call importsService.executeImport and return result', async () => {
      const mockResult: ImportResult = {
        created: 5,
        updated: 0,
        skipped: 0,
        total: 5,
        errors: [],
      };

      importsService.executeImport.mockResolvedValue(mockResult);

      const result = await controller.executeImport(
        mockFile,
        { module: ImportModule.PRODUCTS, duplicateStrategy: DuplicateStrategy.SKIP },
        mockUser as any,
      );

      expect(importsService.executeImport).toHaveBeenCalledWith(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUser.userId,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        controller.executeImport(
          undefined as any,
          { module: ImportModule.PRODUCTS },
          mockUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default to SKIP strategy when duplicateStrategy is not provided', async () => {
      importsService.executeImport.mockResolvedValue({
        created: 1,
        updated: 0,
        skipped: 0,
        total: 1,
        errors: [],
      });

      await controller.executeImport(
        mockFile,
        { module: ImportModule.PRODUCTS } as any,
        mockUser as any,
      );

      expect(importsService.executeImport).toHaveBeenCalledWith(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.SKIP,
        mockUser.userId,
      );
    });

    it('should pass UPDATE strategy when specified', async () => {
      importsService.executeImport.mockResolvedValue({
        created: 0,
        updated: 3,
        skipped: 0,
        total: 3,
        errors: [],
      });

      await controller.executeImport(
        mockFile,
        {
          module: ImportModule.PRODUCTS,
          duplicateStrategy: DuplicateStrategy.UPDATE,
        },
        mockUser as any,
      );

      expect(importsService.executeImport).toHaveBeenCalledWith(
        mockFile,
        ImportModule.PRODUCTS,
        DuplicateStrategy.UPDATE,
        mockUser.userId,
      );
    });

    it('should pass the correct userId from the current user', async () => {
      importsService.executeImport.mockResolvedValue({
        created: 1,
        updated: 0,
        skipped: 0,
        total: 1,
        errors: [],
      });

      const customUser = { ...mockUser, userId: 'different-user-id' };

      await controller.executeImport(
        mockFile,
        { module: ImportModule.SUPPLIERS, duplicateStrategy: DuplicateStrategy.SKIP },
        customUser as any,
      );

      expect(importsService.executeImport).toHaveBeenCalledWith(
        mockFile,
        ImportModule.SUPPLIERS,
        DuplicateStrategy.SKIP,
        'different-user-id',
      );
    });
  });
});
