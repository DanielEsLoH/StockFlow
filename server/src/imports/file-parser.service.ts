import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

/** Maximum file size in bytes (10 MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum number of data rows allowed */
const MAX_ROWS = 5000;

/** Allowed MIME types for import files */
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

/**
 * FileParserService handles parsing of CSV and XLSX files into
 * normalized row objects with consistent header formatting.
 */
@Injectable()
export class FileParserService {
  private readonly logger = new Logger(FileParserService.name);

  /**
   * Parses an uploaded file (CSV or XLSX) into an array of row objects.
   *
   * Headers are normalized: trimmed, lowercased, and spaces replaced with underscores.
   * All cell values are converted to trimmed strings.
   *
   * @param file - The uploaded Multer file
   * @returns Array of row objects with normalized headers as keys
   * @throws BadRequestException if the file is invalid, too large, or has too many rows
   */
  parseFile(file: Express.Multer.File): Record<string, string>[] {
    this.validateFile(file);

    this.logger.log(
      `Parsing file: ${file.originalname} (${file.size} bytes, ${file.mimetype})`,
    );

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new BadRequestException('El archivo no contiene hojas de datos');
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
      });

      if (rawRows.length === 0) {
        throw new BadRequestException(
          'El archivo no contiene datos. Asegurese de incluir al menos una fila de datos despues de los encabezados.',
        );
      }

      if (rawRows.length > MAX_ROWS) {
        throw new BadRequestException(
          `El archivo contiene ${rawRows.length} filas. El maximo permitido es ${MAX_ROWS}.`,
        );
      }

      // Normalize headers and values
      const rows = rawRows.map((rawRow) => {
        const normalizedRow: Record<string, string> = {};

        for (const [key, value] of Object.entries(rawRow)) {
          const normalizedKey = this.normalizeHeader(key);
          if (normalizedKey) {
            normalizedRow[normalizedKey] =
              value !== null && value !== undefined ? String(value).trim() : '';
          }
        }

        return normalizedRow;
      });

      this.logger.log(
        `Parsed ${rows.length} rows with headers: ${Object.keys(rows[0] ?? {}).join(', ')}`,
      );

      return rows;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new BadRequestException(
        'No se pudo leer el archivo. Asegurese de que sea un archivo CSV o Excel valido.',
      );
    }
  }

  /**
   * Validates the uploaded file before parsing.
   *
   * @param file - The uploaded Multer file
   * @throws BadRequestException if validation fails
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('No se proporciono ningun archivo');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `El archivo excede el tamano maximo de ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
      );
    }

    const extension = this.getFileExtension(file.originalname);
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (!isValidExtension && !isValidMime) {
      throw new BadRequestException(
        'Formato de archivo no soportado. Use archivos CSV (.csv) o Excel (.xlsx)',
      );
    }
  }

  /**
   * Normalizes a header string: trims, lowercases, and replaces spaces with underscores.
   *
   * @param header - The raw header string
   * @returns Normalized header string, or empty string if the header is blank
   */
  private normalizeHeader(header: string): string {
    return header
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Extracts the file extension from a filename.
   *
   * @param filename - The original filename
   * @returns Lowercase file extension including the dot (e.g., '.csv')
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot).toLowerCase();
  }
}
