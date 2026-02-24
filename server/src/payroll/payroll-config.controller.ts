import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard, Permission } from '../common';
import { PayrollConfigService } from './payroll-config.service';
import { CreatePayrollConfigDto } from './dto/payroll-config.dto';

@ApiTags('payroll-config')
@ApiBearerAuth('JWT-auth')
@Controller('payroll/config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollConfigController {
  constructor(private readonly configService: PayrollConfigService) {}

  @Get()
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Obtener configuración de nómina' })
  async getConfig() {
    return this.configService.getConfig();
  }

  @Post()
  @RequirePermissions(Permission.PAYROLL_CONFIG)
  @ApiOperation({ summary: 'Crear o actualizar configuración de nómina' })
  async createOrUpdate(@Body() dto: CreatePayrollConfigDto) {
    return this.configService.createOrUpdate(dto);
  }
}
