import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard, Permission } from '../common';
import { CurrentUser } from '../common/decorators';
import { PayrollPeriodsService } from './payroll-periods.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';

@ApiTags('payroll-periods')
@ApiBearerAuth('JWT-auth')
@Controller('payroll/periods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollPeriodsController {
  constructor(private readonly periodsService: PayrollPeriodsService) {}

  @Get()
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Listar periodos de nómina' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.periodsService.findAll(page, limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Obtener periodo con entradas' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.periodsService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.PAYROLL_CREATE)
  @ApiOperation({ summary: 'Crear periodo de nómina' })
  async create(@Body() dto: CreatePayrollPeriodDto) {
    return this.periodsService.create(dto);
  }

  @Post(':id/calculate')
  @RequirePermissions(Permission.PAYROLL_EDIT)
  @ApiOperation({ summary: 'Calcular todas las entradas del periodo' })
  @ApiParam({ name: 'id', type: String })
  async calculate(@Param('id') id: string) {
    return this.periodsService.calculatePeriod(id);
  }

  @Post(':id/approve')
  @RequirePermissions(Permission.PAYROLL_APPROVE)
  @ApiOperation({ summary: 'Aprobar periodo de nómina' })
  @ApiParam({ name: 'id', type: String })
  async approve(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.periodsService.approvePeriod(id, userId);
  }

  @Post(':id/close')
  @RequirePermissions(Permission.PAYROLL_APPROVE)
  @ApiOperation({ summary: 'Cerrar periodo de nómina' })
  @ApiParam({ name: 'id', type: String })
  async close(@Param('id') id: string) {
    return this.periodsService.closePeriod(id);
  }
}
