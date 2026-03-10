import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard, Permission } from '../common';
import { PayrollEntriesService } from './payroll-entries.service';
import { PayrollDianService } from './services/payroll-dian.service';
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';

@ApiTags('payroll-entries')
@ApiBearerAuth('JWT-auth')
@Controller('payroll/entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollEntriesController {
  constructor(
    private readonly entriesService: PayrollEntriesService,
    private readonly payrollDianService: PayrollDianService,
  ) {}

  @Get(':id')
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Obtener detalle de entrada de nómina' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.entriesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions(Permission.PAYROLL_EDIT)
  @ApiOperation({ summary: 'Actualizar y recalcular entrada de nómina' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @Body() dto: UpdatePayrollEntryDto) {
    return this.entriesService.update(id, dto);
  }

  @Post(':id/submit-dian')
  @RequirePermissions(Permission.PAYROLL_APPROVE)
  @ApiOperation({ summary: 'Firmar y enviar entrada de nómina a DIAN' })
  @ApiParam({ name: 'id', type: String })
  async submitToDian(@Param('id') id: string) {
    return this.payrollDianService.signAndSubmitEntry(id);
  }
}
