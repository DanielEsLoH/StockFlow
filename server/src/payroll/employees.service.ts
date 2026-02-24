import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import { EmployeeStatus, SalaryType } from '@prisma/client';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

export interface EmployeeResponse {
  id: string;
  tenantId: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  cityCode: string | null;
  department: string | null;
  departmentCode: string | null;
  contractType: string;
  salaryType: string;
  baseSalary: number;
  auxilioTransporte: boolean;
  arlRiskLevel: string;
  epsName: string | null;
  epsCode: string | null;
  afpName: string | null;
  afpCode: string | null;
  cajaName: string | null;
  cajaCode: string | null;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  costCenter: string | null;
  startDate: Date;
  endDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedEmployeesResponse {
  data: EmployeeResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Default SMMLV 2026 for auxilio transporte calculation
const DEFAULT_SMMLV = 1_423_500;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    status?: EmployeeStatus,
    contractType?: string,
    search?: string,
  ): Promise<PaginatedEmployeesResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (contractType) {
      where.contractType = contractType;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees.map(this.mapToResponse),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<EmployeeResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return this.mapToResponse(employee);
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    // Check limit
    await this.tenantContext.enforceLimit('employees');

    // Check duplicate document number
    const existing = await this.prisma.employee.findFirst({
      where: { tenantId, documentNumber: dto.documentNumber },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un empleado con documento ${dto.documentNumber}`,
      );
    }

    // Auto-calculate auxilio transporte based on salary
    const auxilioTransporte = this.shouldHaveAuxilioTransporte(
      dto.baseSalary,
      dto.salaryType,
    );

    const employee = await this.prisma.employee.create({
      data: {
        tenantId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        cityCode: dto.cityCode,
        department: dto.department,
        departmentCode: dto.departmentCode,
        contractType: dto.contractType,
        salaryType: dto.salaryType ?? SalaryType.ORDINARIO,
        baseSalary: dto.baseSalary,
        auxilioTransporte,
        arlRiskLevel: dto.arlRiskLevel,
        epsName: dto.epsName,
        epsCode: dto.epsCode,
        afpName: dto.afpName,
        afpCode: dto.afpCode,
        cajaName: dto.cajaName,
        cajaCode: dto.cajaCode,
        bankName: dto.bankName,
        bankAccountType: dto.bankAccountType,
        bankAccountNumber: dto.bankAccountNumber,
        costCenter: dto.costCenter,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    this.logger.log(
      `Empleado creado: ${employee.firstName} ${employee.lastName} (${employee.documentNumber})`,
    );

    return this.mapToResponse(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // If document number changed, check for duplicates
    if (
      dto.documentNumber &&
      dto.documentNumber !== existing.documentNumber
    ) {
      const duplicate = await this.prisma.employee.findFirst({
        where: {
          tenantId,
          documentNumber: dto.documentNumber,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          `Ya existe un empleado con documento ${dto.documentNumber}`,
        );
      }
    }

    // Recalculate auxilio if salary or salary type changed
    const newSalary = dto.baseSalary ?? Number(existing.baseSalary);
    const newSalaryType = dto.salaryType ?? existing.salaryType;
    const auxilioTransporte = this.shouldHaveAuxilioTransporte(
      newSalary,
      newSalaryType,
    );

    const data: any = { auxilioTransporte };

    if (dto.documentType !== undefined) data.documentType = dto.documentType;
    if (dto.documentNumber !== undefined)
      data.documentNumber = dto.documentNumber;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.cityCode !== undefined) data.cityCode = dto.cityCode;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.departmentCode !== undefined)
      data.departmentCode = dto.departmentCode;
    if (dto.contractType !== undefined) data.contractType = dto.contractType;
    if (dto.salaryType !== undefined) data.salaryType = dto.salaryType;
    if (dto.baseSalary !== undefined) data.baseSalary = dto.baseSalary;
    if (dto.arlRiskLevel !== undefined) data.arlRiskLevel = dto.arlRiskLevel;
    if (dto.epsName !== undefined) data.epsName = dto.epsName;
    if (dto.epsCode !== undefined) data.epsCode = dto.epsCode;
    if (dto.afpName !== undefined) data.afpName = dto.afpName;
    if (dto.afpCode !== undefined) data.afpCode = dto.afpCode;
    if (dto.cajaName !== undefined) data.cajaName = dto.cajaName;
    if (dto.cajaCode !== undefined) data.cajaCode = dto.cajaCode;
    if (dto.bankName !== undefined) data.bankName = dto.bankName;
    if (dto.bankAccountType !== undefined)
      data.bankAccountType = dto.bankAccountType;
    if (dto.bankAccountNumber !== undefined)
      data.bankAccountNumber = dto.bankAccountNumber;
    if (dto.costCenter !== undefined) data.costCenter = dto.costCenter;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined)
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    const employee = await this.prisma.employee.update({
      where: { id },
      data,
    });

    return this.mapToResponse(employee);
  }

  async changeStatus(
    id: string,
    status: EmployeeStatus,
  ): Promise<EmployeeResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (existing.status === status) {
      throw new BadRequestException(
        `El empleado ya tiene estado ${status}`,
      );
    }

    // If terminating, check no open payroll entries
    if (status === EmployeeStatus.TERMINATED) {
      const openEntries = await this.prisma.payrollEntry.count({
        where: {
          employeeId: id,
          tenantId,
          status: { in: ['DRAFT', 'CALCULATED'] },
        },
      });

      if (openEntries > 0) {
        throw new BadRequestException(
          'No se puede terminar un empleado con entradas de nomina pendientes',
        );
      }
    }

    const data: any = { status };
    if (status === EmployeeStatus.TERMINATED && !existing.endDate) {
      data.endDate = new Date();
    }

    const employee = await this.prisma.employee.update({
      where: { id },
      data,
    });

    this.logger.log(
      `Estado de empleado ${employee.documentNumber} cambiado a ${status}`,
    );

    return this.mapToResponse(employee);
  }

  async getActiveCount(): Promise<number> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.employee.count({
      where: { tenantId, status: EmployeeStatus.ACTIVE },
    });
  }

  private shouldHaveAuxilioTransporte(
    baseSalary: number,
    salaryType?: SalaryType,
  ): boolean {
    if (salaryType === SalaryType.INTEGRAL) return false;
    return baseSalary <= 2 * DEFAULT_SMMLV;
  }

  private mapToResponse(employee: any): EmployeeResponse {
    return {
      id: employee.id,
      tenantId: employee.tenantId,
      documentType: employee.documentType,
      documentNumber: employee.documentNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      city: employee.city,
      cityCode: employee.cityCode,
      department: employee.department,
      departmentCode: employee.departmentCode,
      contractType: employee.contractType,
      salaryType: employee.salaryType,
      baseSalary: Number(employee.baseSalary),
      auxilioTransporte: employee.auxilioTransporte,
      arlRiskLevel: employee.arlRiskLevel,
      epsName: employee.epsName,
      epsCode: employee.epsCode,
      afpName: employee.afpName,
      afpCode: employee.afpCode,
      cajaName: employee.cajaName,
      cajaCode: employee.cajaCode,
      bankName: employee.bankName,
      bankAccountType: employee.bankAccountType,
      bankAccountNumber: employee.bankAccountNumber,
      costCenter: employee.costCenter,
      startDate: employee.startDate,
      endDate: employee.endDate,
      status: employee.status,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
