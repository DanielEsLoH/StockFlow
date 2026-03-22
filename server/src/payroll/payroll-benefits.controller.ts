import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard, Permission } from '../common';
import { CurrentUser } from '../common/decorators';

interface JwtUser {
  userId: string;
  tenantId: string;
  role: string;
}
import { PayrollBenefitsService } from './services/payroll-benefits.service';
import {
  CalculateBenefitPaymentDto,
  CalculateLiquidationDto,
} from './dto/calculate-benefits.dto';

@ApiTags('payroll-benefits')
@ApiBearerAuth('JWT-auth')
@Controller('payroll/benefits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollBenefitsController {
  constructor(private readonly benefitsService: PayrollBenefitsService) {}

  @Get('preview/:employeeId')
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({
    summary: 'Vista previa de prestaciones sociales de un empleado',
    description:
      'Calcula todas las prestaciones adeudadas para un empleado, ' +
      'incluyendo prima, cesantias, intereses y vacaciones. ' +
      'Muestra provisiones acumuladas y neto a pagar.',
  })
  @ApiParam({ name: 'employeeId', type: String })
  async getBenefitsPreview(@Param('employeeId') employeeId: string) {
    return this.benefitsService.getLiquidationPreview(employeeId);
  }

  @Post('calculate/:employeeId')
  @RequirePermissions(Permission.PAYROLL_EDIT)
  @ApiOperation({
    summary: 'Calcular pago de una prestacion social especifica',
    description:
      'Calcula el monto a pagar de una prestacion social (prima, cesantias, ' +
      'intereses, vacaciones) para un empleado en una fecha dada.',
  })
  @ApiParam({ name: 'employeeId', type: String })
  async calculateBenefitPayment(
    @Param('employeeId') employeeId: string,
    @Body() dto: CalculateBenefitPaymentDto,
  ) {
    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();
    return this.benefitsService.calculateBenefitPayment(
      employeeId,
      dto.benefitType,
      paymentDate,
    );
  }

  @Post('liquidation/:employeeId')
  @RequirePermissions(Permission.PAYROLL_APPROVE)
  @ApiOperation({
    summary: 'Calcular liquidacion de prestaciones por terminacion',
    description:
      'Genera un resumen completo de liquidacion de prestaciones sociales ' +
      'para un empleado que sera desvinculado. Incluye prima proporcional, ' +
      'cesantias, intereses y vacaciones pendientes.',
  })
  @ApiParam({ name: 'employeeId', type: String })
  async calculateLiquidation(
    @Param('employeeId') employeeId: string,
    @Body() dto: CalculateLiquidationDto,
  ) {
    const terminationDate = dto.terminationDate
      ? new Date(dto.terminationDate)
      : undefined;
    return this.benefitsService.getLiquidationPreview(
      employeeId,
      terminationDate,
    );
  }

  @Post('liquidation/:employeeId/execute')
  @RequirePermissions(Permission.PAYROLL_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar liquidacion: calcular, registrar y terminar al empleado',
    description:
      'Ejecuta la liquidacion completa: calcula prestaciones, crea entrada de nomina, ' +
      'y cambia el estado del empleado a TERMINATED. Esta accion es irreversible.',
  })
  @ApiParam({ name: 'employeeId', type: String })
  async executeLiquidation(
    @Param('employeeId') employeeId: string,
    @Body() dto: CalculateLiquidationDto,
    @CurrentUser() user: JwtUser,
  ) {
    const terminationDate = dto.terminationDate
      ? new Date(dto.terminationDate)
      : undefined;
    return this.benefitsService.executeLiquidation(
      employeeId,
      user.userId,
      terminationDate,
    );
  }
}
