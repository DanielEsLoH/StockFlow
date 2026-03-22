import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PayrollEntriesController } from './payroll-entries.controller';
import { PayrollEntriesService } from './payroll-entries.service';
import { PayrollDianService } from './services/payroll-dian.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';
import { AdjustmentNoteType } from './dto/create-payroll-adjustment.dto';

describe('PayrollEntriesController', () => {
  let controller: PayrollEntriesController;
  let service: jest.Mocked<PayrollEntriesService>;
  let dianService: jest.Mocked<PayrollDianService>;

  const mockEntryResponse = {
    id: 'entry-1',
    entryNumber: 'NOM-001-001',
    status: 'DRAFT',
    baseSalary: 2000000,
    totalNeto: 2002000,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findOne: jest.fn(),
      update: jest.fn(),
      createAdjustment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollEntriesController],
      providers: [
        { provide: PayrollEntriesService, useValue: mockService },
        {
          provide: PayrollDianService,
          useValue: { signAndSubmitEntry: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollEntriesController>(PayrollEntriesController);
    service = module.get(PayrollEntriesService);
    dianService = module.get(PayrollDianService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should return entry details', async () => {
      service.findOne.mockResolvedValue(mockEntryResponse as any);

      const result = await controller.findOne('entry-1');

      expect(result).toEqual(mockEntryResponse);
      expect(service.findOne).toHaveBeenCalledWith('entry-1');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return entry', async () => {
      const dto = { daysWorked: 25 };
      service.update.mockResolvedValue(mockEntryResponse as any);

      const result = await controller.update('entry-1', dto);

      expect(result).toEqual(mockEntryResponse);
      expect(service.update).toHaveBeenCalledWith('entry-1', dto);
    });
  });

  describe('createAdjustment', () => {
    it('should create adjustment and return result', async () => {
      const dto = {
        tipoNota: AdjustmentNoteType.DELETE,
        reason: 'Error in payroll',
      };
      const adjustmentResponse = {
        ...mockEntryResponse,
        id: 'adj-1',
        entryNumber: 'NA-000001',
      };
      service.createAdjustment.mockResolvedValue(adjustmentResponse as any);

      const result = await controller.createAdjustment('entry-1', dto);

      expect(result).toEqual(adjustmentResponse);
      expect(service.createAdjustment).toHaveBeenCalledWith('entry-1', dto);
    });

    it('should propagate BadRequestException', async () => {
      const dto = { tipoNota: AdjustmentNoteType.DELETE };
      service.createAdjustment.mockRejectedValue(
        new BadRequestException('No CUNE'),
      );

      await expect(
        controller.createAdjustment('entry-1', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitToDian', () => {
    it('should submit entry to DIAN and return result', async () => {
      const dianResponse = {
        success: true,
        entryId: 'entry-1',
        entryNumber: 'NOM-001-001',
        cune: 'cune-hash',
        trackId: 'track-123',
        status: 'ACCEPTED',
        message: 'Nomina enviada y aceptada',
      };
      dianService.signAndSubmitEntry.mockResolvedValue(dianResponse as any);

      const result = await controller.submitToDian('entry-1');

      expect(result).toEqual(dianResponse);
      expect(dianService.signAndSubmitEntry).toHaveBeenCalledWith('entry-1');
    });

    it('should propagate NotFoundException', async () => {
      dianService.signAndSubmitEntry.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.submitToDian('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
