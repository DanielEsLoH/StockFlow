import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Query,
  Param,
  Body,
  Logger,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { EmployeeStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard, Permission } from '../common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('payroll-employees')
@ApiBearerAuth('JWT-auth')
@Controller('payroll/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Listar empleados' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: EmployeeStatus })
  @ApiQuery({ name: 'contractType', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: EmployeeStatus,
    @Query('contractType') contractType?: string,
    @Query('search') search?: string,
  ) {
    return this.employeesService.findAll(
      page,
      limit,
      status,
      contractType,
      search,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Obtener empleado por ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.PAYROLL_CREATE)
  @ApiOperation({ summary: 'Crear empleado' })
  @ApiResponse({ status: 201, description: 'Empleado creado' })
  async create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.PAYROLL_EDIT)
  @ApiOperation({ summary: 'Actualizar empleado' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.PAYROLL_EDIT)
  @ApiOperation({ summary: 'Cambiar estado del empleado' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'status', enum: EmployeeStatus })
  async changeStatus(
    @Param('id') id: string,
    @Query('status') status: EmployeeStatus,
  ) {
    return this.employeesService.changeStatus(id, status);
  }
}
