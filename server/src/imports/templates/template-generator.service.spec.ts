import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { TemplateGeneratorService } from './template-generator.service';
import { ImportModule } from '../dto/import-file.dto';

describe('TemplateGeneratorService', () => {
  let service: TemplateGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateGeneratorService],
    }).compile();

    service = module.get<TemplateGeneratorService>(TemplateGeneratorService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTemplate', () => {
    it.each([
      [ImportModule.PRODUCTS, 'products'],
      [ImportModule.CUSTOMERS, 'customers'],
      [ImportModule.SUPPLIERS, 'suppliers'],
    ])('should generate a valid XLSX buffer for module %s', (module) => {
      const buffer = service.generateTemplate(module as ImportModule);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify it is a valid XLSX
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      expect(workbook.SheetNames).toContain('Datos');
      expect(workbook.SheetNames).toContain('Instrucciones');
    });

    it('should include two sheets: Datos and Instrucciones', () => {
      const buffer = service.generateTemplate(ImportModule.PRODUCTS);
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      expect(workbook.SheetNames).toHaveLength(2);
      expect(workbook.SheetNames[0]).toBe('Datos');
      expect(workbook.SheetNames[1]).toBe('Instrucciones');
    });

    describe('products template', () => {
      it('should include product headers in the Datos sheet', () => {
        const buffer = service.generateTemplate(ImportModule.PRODUCTS);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets['Datos'];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        // Should have 2 example rows
        expect(rows).toHaveLength(2);

        // Check headers exist by reading first row keys
        const headers = Object.keys(rows[0]);
        expect(headers).toContain('nombre');
        expect(headers).toContain('precio_costo');
        expect(headers).toContain('precio_venta');
      });

      it('should include example data in the Datos sheet', () => {
        const buffer = service.generateTemplate(ImportModule.PRODUCTS);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets['Datos'];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        // Example rows should have non-empty values
        expect(rows[0]['nombre']).toBeTruthy();
        expect(rows[0]['precio_costo']).toBeTruthy();
        expect(rows[1]['nombre']).toBeTruthy();
      });

      it('should include column descriptions in the Instrucciones sheet', () => {
        const buffer = service.generateTemplate(ImportModule.PRODUCTS);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets['Instrucciones'];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        // First row is headers (Columna, Descripcion, Obligatorio, Valores validos)
        // Subsequent rows describe each column
        expect(rows.length).toBeGreaterThan(0);

        // Check that the header row from the instructions sheet has expected columns
        const firstRow = rows[0];
        expect(firstRow).toHaveProperty('Columna');
        expect(firstRow).toHaveProperty('Descripcion');
        expect(firstRow).toHaveProperty('Obligatorio');
      });
    });

    describe('customers template', () => {
      it('should include customer-specific headers', () => {
        const buffer = service.generateTemplate(ImportModule.CUSTOMERS);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets['Datos'];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const headers = Object.keys(rows[0]);
        expect(headers).toContain('nombre');
        expect(headers).toContain('tipo_documento');
        expect(headers).toContain('numero_documento');
      });

      it('should have 2 example rows', () => {
        const buffer = service.generateTemplate(ImportModule.CUSTOMERS);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets['Datos'];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        expect(rows).toHaveLength(2);
      });
    });

    describe('suppliers template', () => {
      it('should include supplier-specific headers', () => {
        const buffer = service.generateTemplate(ImportModule.SUPPLIERS);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets['Datos'];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const headers = Object.keys(rows[0]);
        expect(headers).toContain('nombre');
        expect(headers).toContain('tipo_documento');
        expect(headers).toContain('numero_documento');
        expect(headers).toContain('terminos_pago');
        expect(headers).toContain('nombre_contacto');
      });

      it('should include payment terms in instruction descriptions', () => {
        const buffer = service.generateTemplate(ImportModule.SUPPLIERS);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets['Instrucciones'];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        // Find the terminos_pago row
        const paymentTermsRow = rows.find(
          (r) => r['Columna'] === 'terminos_pago',
        );
        expect(paymentTermsRow).toBeDefined();
        expect(paymentTermsRow!['Valores validos']).toContain('NET_30');
      });
    });

    it('should produce a buffer of reasonable size for each module', () => {
      for (const mod of [
        ImportModule.PRODUCTS,
        ImportModule.CUSTOMERS,
        ImportModule.SUPPLIERS,
      ]) {
        const buffer = service.generateTemplate(mod);
        // XLSX files should be at least a few hundred bytes
        expect(buffer.length).toBeGreaterThan(200);
      }
    });
  });
});
