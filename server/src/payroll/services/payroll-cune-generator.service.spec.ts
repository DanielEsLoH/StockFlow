import { Test, TestingModule } from '@nestjs/testing';
import { PayrollCuneGeneratorService } from './payroll-cune-generator.service';
import * as crypto from 'crypto';

describe('PayrollCuneGeneratorService', () => {
  let service: PayrollCuneGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayrollCuneGeneratorService],
    }).compile();

    service = module.get<PayrollCuneGeneratorService>(PayrollCuneGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCune', () => {
    it('should generate a valid SHA-384 hash (96 hex chars)', () => {
      const cune = service.generateCune({
        numNIE: 'NOM-000001',
        fecNIE: '2026-01-31',
        horNIE: '10:30:00-05:00',
        valDev: '1623500.00',
        valDed: '113880.00',
        valTol: '1509620.00',
        nitNIE: '900123456',
        docEmp: '1234567890',
        tipoAmb: '2',
        softwarePin: '12345',
        tipoXML: '102',
      });

      expect(cune).toHaveLength(96); // SHA-384 = 384 bits = 96 hex chars
      expect(cune).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce deterministic output', () => {
      const params = {
        numNIE: 'NOM-000001',
        fecNIE: '2026-01-31',
        horNIE: '10:30:00-05:00',
        valDev: '1623500.00',
        valDed: '113880.00',
        valTol: '1509620.00',
        nitNIE: '900123456',
        docEmp: '1234567890',
        tipoAmb: '2',
        softwarePin: '12345',
        tipoXML: '102',
      };

      const cune1 = service.generateCune(params);
      const cune2 = service.generateCune(params);

      expect(cune1).toBe(cune2);
    });

    it('should produce correct SHA-384 of concatenation', () => {
      const params = {
        numNIE: 'NOM-000001',
        fecNIE: '2026-01-31',
        horNIE: '10:30:00-05:00',
        valDev: '1623500.00',
        valDed: '113880.00',
        valTol: '1509620.00',
        nitNIE: '900123456',
        docEmp: '1234567890',
        tipoAmb: '2',
        softwarePin: '12345',
        tipoXML: '102',
      };

      const concatenation =
        'NOM-0000012026-01-3110:30:00-05:001623500.00113880.001509620.0090012345612345678902123451020';

      // Verify our concatenation logic matches
      const expected = crypto.createHash('sha384').update(
        params.numNIE + params.fecNIE + params.horNIE +
        params.valDev + params.valDed + params.valTol +
        params.nitNIE + params.docEmp + params.tipoAmb +
        params.softwarePin + params.tipoXML,
      ).digest('hex');

      const cune = service.generateCune(params);
      expect(cune).toBe(expected);
    });

    it('should change with different input', () => {
      const base = {
        numNIE: 'NOM-000001',
        fecNIE: '2026-01-31',
        horNIE: '10:30:00-05:00',
        valDev: '1623500.00',
        valDed: '113880.00',
        valTol: '1509620.00',
        nitNIE: '900123456',
        docEmp: '1234567890',
        tipoAmb: '2',
        softwarePin: '12345',
        tipoXML: '102',
      };

      const cune1 = service.generateCune(base);
      const cune2 = service.generateCune({ ...base, numNIE: 'NOM-000002' });

      expect(cune1).not.toBe(cune2);
    });
  });

  describe('formatMoney', () => {
    it('should format integer to 2 decimal places', () => {
      expect(service.formatMoney(1623500)).toBe('1623500.00');
    });

    it('should format decimal value correctly', () => {
      expect(service.formatMoney(1623500.5)).toBe('1623500.50');
    });

    it('should format zero', () => {
      expect(service.formatMoney(0)).toBe('0.00');
    });
  });

  describe('generateTimestamp', () => {
    it('should return date and time in correct format', () => {
      const { date, time } = service.generateTimestamp();

      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(time).toMatch(/^\d{2}:\d{2}:\d{2}-05:00$/);
    });
  });
});
