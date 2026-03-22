import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { FileParserService } from './file-parser.service';

describe('FileParserService', () => {
  let service: FileParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileParserService],
    }).compile();

    service = module.get<FileParserService>(FileParserService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Helper: creates a Multer-like file from an array of row objects.
   */
  function createXlsxFile(
    rows: Record<string, unknown>[],
    overrides?: Partial<Express.Multer.File>,
  ): Express.Multer.File {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = Buffer.from(
      XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
    );

    return {
      fieldname: 'file',
      originalname: 'test.xlsx',
      encoding: '7bit',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
      ...overrides,
    };
  }

  function createCsvFile(
    csvContent: string,
    overrides?: Partial<Express.Multer.File>,
  ): Express.Multer.File {
    const buffer = Buffer.from(csvContent, 'utf-8');
    return {
      fieldname: 'file',
      originalname: 'test.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: buffer.length,
      buffer,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
      ...overrides,
    };
  }

  describe('parseFile', () => {
    it('should parse a valid XLSX file with normalized headers', () => {
      const file = createXlsxFile([
        { Nombre: 'Producto A', 'Precio Costo': 100, 'Precio Venta': 200 },
        { Nombre: 'Producto B', 'Precio Costo': 150, 'Precio Venta': 300 },
      ]);

      const result = service.parseFile(file);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('nombre', 'Producto A');
      expect(result[0]).toHaveProperty('precio_costo', '100');
      expect(result[0]).toHaveProperty('precio_venta', '200');
      expect(result[1]).toHaveProperty('nombre', 'Producto B');
    });

    it('should normalize headers to lowercase with underscores', () => {
      const file = createXlsxFile([
        { '  My Header  ': 'val1', 'UPPER CASE': 'val2' },
      ]);

      const result = service.parseFile(file);

      expect(result).toHaveLength(1);
      expect(Object.keys(result[0])).toEqual(
        expect.arrayContaining(['my_header', 'upper_case']),
      );
    });

    it('should strip non-alphanumeric/underscore characters from headers', () => {
      const file = createXlsxFile([{ 'Precio (COP)': '1000' }]);

      const result = service.parseFile(file);

      expect(result[0]).toHaveProperty('precio_cop', '1000');
    });

    it('should convert all values to trimmed strings', () => {
      const file = createXlsxFile([
        { nombre: '  Spaced  ', precio: 12345, flag: true },
      ]);

      const result = service.parseFile(file);

      expect(result[0]['nombre']).toBe('Spaced');
      expect(result[0]['precio']).toBe('12345');
      expect(result[0]['flag']).toBe('true');
    });

    it('should parse a valid CSV file', () => {
      const csv = 'nombre,precio_costo,precio_venta\nProducto A,100,200\n';
      const file = createCsvFile(csv);

      const result = service.parseFile(file);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('nombre', 'Producto A');
      expect(result[0]).toHaveProperty('precio_costo', '100');
    });

    it('should throw BadRequestException when file is null/undefined', () => {
      expect(() => service.parseFile(null as any)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file buffer is missing', () => {
      const file = createXlsxFile([{ a: 1 }]);
      file.buffer = undefined as any;

      expect(() => service.parseFile(file)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds 10 MB', () => {
      const file = createXlsxFile([{ a: 1 }]);
      file.size = 11 * 1024 * 1024;

      expect(() => service.parseFile(file)).toThrow(BadRequestException);
      expect(() => service.parseFile(file)).toThrow(/tamano maximo/);
    });

    it('should throw BadRequestException for unsupported file type', () => {
      const file = createXlsxFile([{ a: 1 }]);
      file.mimetype = 'application/pdf';
      file.originalname = 'test.pdf';

      expect(() => service.parseFile(file)).toThrow(BadRequestException);
      expect(() => service.parseFile(file)).toThrow(/Formato de archivo/);
    });

    it('should allow application/octet-stream mimetype with valid extension', () => {
      const file = createXlsxFile([{ nombre: 'Test' }]);
      file.mimetype = 'application/octet-stream';
      file.originalname = 'data.xlsx';

      const result = service.parseFile(file);
      expect(result).toHaveLength(1);
    });

    it('should throw BadRequestException when file has no data rows', () => {
      // Create an XLSX with only headers, no data
      const ws = XLSX.utils.aoa_to_sheet([['nombre', 'precio']]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = Buffer.from(
        XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
      );

      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'empty.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
        buffer,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      expect(() => service.parseFile(file)).toThrow(BadRequestException);
      expect(() => service.parseFile(file)).toThrow(/no contiene datos/);
    });

    it('should throw BadRequestException when file has more than 5000 rows', () => {
      // Create data with 5001 rows
      const rows = Array.from({ length: 5001 }, (_, i) => ({
        nombre: `Product ${i}`,
      }));
      const file = createXlsxFile(rows);

      expect(() => service.parseFile(file)).toThrow(BadRequestException);
      expect(() => service.parseFile(file)).toThrow(/5001 filas/);
    });

    it('should throw BadRequestException for corrupted file data', () => {
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'corrupt.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 100,
        buffer: Buffer.from('this is not a valid xlsx file'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      expect(() => service.parseFile(file)).toThrow(BadRequestException);
    });

    it('should handle empty string values as empty strings', () => {
      const file = createXlsxFile([
        { nombre: 'Test', descripcion: '' },
      ]);

      const result = service.parseFile(file);
      expect(result[0]['descripcion']).toBe('');
    });

    it('should accept .xls extension with vnd.ms-excel mimetype', () => {
      const file = createXlsxFile([{ nombre: 'Test' }]);
      file.mimetype = 'application/vnd.ms-excel';
      file.originalname = 'data.xls';

      const result = service.parseFile(file);
      expect(result).toHaveLength(1);
    });

    it('should throw for unsupported extension and mimetype', () => {
      const file = createXlsxFile([{ nombre: 'Test' }]);
      file.mimetype = 'application/json';
      file.originalname = 'data.json';

      expect(() => service.parseFile(file)).toThrow(BadRequestException);
    });
  });
});
