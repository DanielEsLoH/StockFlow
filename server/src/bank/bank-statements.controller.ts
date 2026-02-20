import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as XLSX from 'xlsx';
import { BankStatementsService } from './bank-statements.service';
import type { BankStatementResponse } from './bank-statements.service';
import { ImportStatementDto } from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { CurrentUser } from '../common/decorators';
import { Permission } from '../common/permissions/permission.enum';

const xlsxMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Solo se permiten archivos .xlsx o .xls'), false);
    }
  },
};

@ApiTags('bank-statements')
@ApiBearerAuth('JWT-auth')
@Controller('bank-statements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BankStatementsController {
  private readonly logger = new Logger(BankStatementsController.name);

  constructor(private readonly statementsService: BankStatementsService) {}

  @Post('import')
  @RequirePermissions(Permission.BANK_IMPORT)
  @UseInterceptors(FileInterceptor('file', xlsxMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import bank statement from .xlsx file' })
  @ApiResponse({ status: 201, description: 'Statement imported' })
  @ApiResponse({ status: 400, description: 'Invalid file or data' })
  async importStatement(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportStatementDto,
    @CurrentUser('userId') userId: string,
  ): Promise<BankStatementResponse> {
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }

    // Parse xlsx
    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('El archivo no contiene hojas de calculo');
    }

    const sheet = workbook.Sheets[sheetName];
    const headerRow = dto.headerRow ?? 0;
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
      header: 'A',
      range: headerRow,
    });

    if (rows.length < 2) {
      throw new BadRequestException('El archivo no contiene suficientes filas');
    }

    // First row is headers
    const headerMap = rows[0];
    const dataRows = rows.slice(1);

    // Column mapping with defaults
    const dateCol = this.findColumnKey(headerMap, dto.dateColumn ?? 'Fecha');
    const descCol = this.findColumnKey(headerMap, dto.descriptionColumn ?? 'Descripcion');
    const debitCol = this.findColumnKey(headerMap, dto.debitColumn ?? 'Debito');
    const creditCol = this.findColumnKey(headerMap, dto.creditColumn ?? 'Credito');
    const refCol = dto.referenceColumn
      ? this.findColumnKey(headerMap, dto.referenceColumn)
      : null;
    const balanceCol = dto.balanceColumn
      ? this.findColumnKey(headerMap, dto.balanceColumn)
      : null;

    if (!dateCol || !descCol || !debitCol || !creditCol) {
      throw new BadRequestException(
        `No se encontraron las columnas requeridas. Columnas disponibles: ${Object.values(headerMap).join(', ')}`,
      );
    }

    // Parse lines
    const lines = dataRows
      .map((row, idx) => {
        try {
          const lineDate = this.parseExcelDate(row[dateCol]);
          if (!lineDate) return null;

          const description = String(row[descCol] ?? '').trim();
          if (!description) return null;

          const debit = this.parseNumber(row[debitCol]);
          const credit = this.parseNumber(row[creditCol]);
          if (debit === 0 && credit === 0) return null;

          return {
            lineDate,
            description,
            reference: refCol ? String(row[refCol] ?? '').trim() || undefined : undefined,
            debit,
            credit,
            balance: balanceCol ? this.parseNumber(row[balanceCol]) : undefined,
          };
        } catch {
          this.logger.warn(`Skipping row ${idx + headerRow + 2}: parse error`);
          return null;
        }
      })
      .filter(Boolean) as {
        lineDate: Date;
        description: string;
        reference?: string;
        debit: number;
        credit: number;
        balance?: number;
      }[];

    if (lines.length === 0) {
      throw new BadRequestException(
        'No se pudieron extraer lineas validas del archivo',
      );
    }

    this.logger.log(
      `Parsed ${lines.length} lines from ${file.originalname}`,
    );

    return this.statementsService.importLines(
      dto.bankAccountId,
      file.originalname,
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
      lines,
      userId,
    );
  }

  @Get('by-account/:bankAccountId')
  @RequirePermissions(Permission.BANK_VIEW)
  @ApiOperation({ summary: 'List statements for a bank account' })
  @ApiResponse({ status: 200, description: 'Statements listed' })
  async findByBankAccount(
    @Param('bankAccountId') bankAccountId: string,
  ): Promise<BankStatementResponse[]> {
    return this.statementsService.findByBankAccount(bankAccountId);
  }

  @Get(':id')
  @RequirePermissions(Permission.BANK_VIEW)
  @ApiOperation({ summary: 'Get statement with lines' })
  @ApiResponse({ status: 200, description: 'Statement found' })
  @ApiResponse({ status: 404, description: 'Statement not found' })
  async findOne(@Param('id') id: string): Promise<BankStatementResponse> {
    return this.statementsService.findOne(id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.BANK_IMPORT)
  @ApiOperation({ summary: 'Delete a statement', description: 'Cannot delete reconciled statements' })
  @ApiResponse({ status: 200, description: 'Statement deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete reconciled statement' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.statementsService.delete(id);
    return { message: 'Extracto eliminado exitosamente' };
  }

  /** Find column key (A, B, C...) whose header value matches the target */
  private findColumnKey(
    headerRow: Record<string, any>,
    target: string,
  ): string | null {
    const normalized = target.toLowerCase().trim();
    for (const [key, value] of Object.entries(headerRow)) {
      if (String(value).toLowerCase().trim() === normalized) return key;
    }
    // Partial match fallback
    for (const [key, value] of Object.entries(headerRow)) {
      if (String(value).toLowerCase().trim().includes(normalized)) return key;
    }
    return null;
  }

  /** Parse Excel date — handles both Date objects and numeric serials */
  private parseExcelDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      // Excel serial date
      return new Date((value - 25569) * 86400 * 1000);
    }
    const parsed = new Date(String(value));
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /** Parse numeric value from cell */
  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Math.abs(value);
    const cleaned = String(value)
      .replace(/[$.%\s]/g, '')
      .replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.abs(num);
  }
}
