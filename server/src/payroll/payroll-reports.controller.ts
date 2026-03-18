import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard, Permission } from '../common';
import { PayrollReportsService } from './services/payroll-reports.service';

@ApiTags('payroll-reports')
@ApiBearerAuth('JWT-auth')
@Controller('payroll/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollReportsController {
  constructor(
    private readonly reportsService: PayrollReportsService,
  ) {}

  @Get('certificate/:employeeId')
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Certificado de ingresos y retenciones de un empleado' })
  @ApiParam({ name: 'employeeId', description: 'ID del empleado' })
  @ApiQuery({ name: 'year', type: Number, description: 'Año fiscal' })
  async getIncomeCertificate(
    @Param('employeeId') employeeId: string,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.reportsService.getIncomeCertificate(employeeId, year);
  }

  @Get('period-summary/:periodId')
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Resumen de nómina por periodo con desglose de deducciones' })
  @ApiParam({ name: 'periodId', description: 'ID del periodo de nómina' })
  async getPeriodSummary(@Param('periodId') periodId: string) {
    return this.reportsService.getPeriodSummary(periodId);
  }

  @Get('ytd/:employeeId')
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Reporte año-a-la-fecha (YTD) de un empleado' })
  @ApiParam({ name: 'employeeId', description: 'ID del empleado' })
  @ApiQuery({ name: 'year', type: Number, description: 'Año fiscal' })
  async getEmployeeYtd(
    @Param('employeeId') employeeId: string,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.reportsService.getEmployeeYtdReport(employeeId, year);
  }

  @Get('dashboard')
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Dashboard de nómina con métricas agregadas' })
  @ApiQuery({ name: 'year', type: Number, required: false, description: 'Año (default: actual)' })
  async getDashboard(
    @Query('year') year?: number,
  ) {
    return this.reportsService.getDashboard(year || new Date().getFullYear());
  }
}
