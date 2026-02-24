// ===== Enums =====

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
export type ContractType = "TERMINO_FIJO" | "TERMINO_INDEFINIDO" | "OBRA_O_LABOR" | "PRESTACION_SERVICIOS";
export type SalaryType = "ORDINARIO" | "INTEGRAL";
export type DocumentType = "CC" | "CE" | "TI" | "NIT" | "PP" | "PEP";
export type ARLRiskLevel = "LEVEL_I" | "LEVEL_II" | "LEVEL_III" | "LEVEL_IV" | "LEVEL_V";
export type PayrollPeriodType = "MONTHLY" | "BIWEEKLY";
export type PayrollPeriodStatus = "OPEN" | "CALCULATING" | "CALCULATED" | "APPROVED" | "SENT_TO_DIAN" | "CLOSED";
export type PayrollEntryStatus = "DRAFT" | "CALCULATED" | "APPROVED" | "SENT" | "ACCEPTED" | "REJECTED";
export type OvertimeType = "HED" | "HEN" | "HDD" | "HDN" | "HEDDF" | "HENDF";

// ===== Labels =====

export const EmployeeStatusLabels: Record<EmployeeStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  ON_LEAVE: "En licencia",
  TERMINATED: "Retirado",
};

export const EmployeeStatusVariants: Record<
  EmployeeStatus,
  "success" | "secondary" | "warning" | "error"
> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  ON_LEAVE: "warning",
  TERMINATED: "error",
};

export const ContractTypeLabels: Record<ContractType, string> = {
  TERMINO_FIJO: "Término Fijo",
  TERMINO_INDEFINIDO: "Término Indefinido",
  OBRA_O_LABOR: "Obra o Labor",
  PRESTACION_SERVICIOS: "Prestación de Servicios",
};

export const SalaryTypeLabels: Record<SalaryType, string> = {
  ORDINARIO: "Ordinario",
  INTEGRAL: "Integral",
};

export const DocumentTypeLabels: Record<DocumentType, string> = {
  CC: "Cédula de Ciudadanía",
  CE: "Cédula de Extranjería",
  TI: "Tarjeta de Identidad",
  NIT: "NIT",
  PP: "Pasaporte",
  PEP: "PEP",
};

export const ARLRiskLevelLabels: Record<ARLRiskLevel, string> = {
  LEVEL_I: "Nivel I (0.522%)",
  LEVEL_II: "Nivel II (1.044%)",
  LEVEL_III: "Nivel III (2.436%)",
  LEVEL_IV: "Nivel IV (4.35%)",
  LEVEL_V: "Nivel V (6.96%)",
};

export const PayrollPeriodTypeLabels: Record<PayrollPeriodType, string> = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
};

export const PayrollPeriodStatusLabels: Record<PayrollPeriodStatus, string> = {
  OPEN: "Abierto",
  CALCULATING: "Calculando",
  CALCULATED: "Calculado",
  APPROVED: "Aprobado",
  SENT_TO_DIAN: "Enviado a DIAN",
  CLOSED: "Cerrado",
};

export const PayrollPeriodStatusVariants: Record<
  PayrollPeriodStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  OPEN: "secondary",
  CALCULATING: "warning",
  CALCULATED: "primary",
  APPROVED: "success",
  SENT_TO_DIAN: "success",
  CLOSED: "default",
};

export const PayrollEntryStatusLabels: Record<PayrollEntryStatus, string> = {
  DRAFT: "Borrador",
  CALCULATED: "Calculado",
  APPROVED: "Aprobado",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
};

export const PayrollEntryStatusVariants: Record<
  PayrollEntryStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  DRAFT: "secondary",
  CALCULATED: "primary",
  APPROVED: "success",
  SENT: "warning",
  ACCEPTED: "success",
  REJECTED: "error",
};

export const OvertimeTypeLabels: Record<OvertimeType, string> = {
  HED: "Hora Extra Diurna (1.25x)",
  HEN: "Hora Extra Nocturna (1.75x)",
  HDD: "Hora Dominical Diurna (2.0x)",
  HDN: "Hora Dominical Nocturna (2.5x)",
  HEDDF: "Hora Dom/Festivo Diurna (2.5x)",
  HENDF: "Hora Dom/Festivo Nocturna (2.75x)",
};

// ===== Interfaces =====

export interface Employee {
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
  contractType: ContractType;
  salaryType: SalaryType;
  baseSalary: number;
  auxilioTransporte: boolean;
  arlRiskLevel: ARLRiskLevel;
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
  startDate: string;
  endDate: string | null;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeesResponse {
  data: Employee[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EmployeeFilters {
  page?: number;
  limit?: number;
  status?: EmployeeStatus;
  contractType?: ContractType;
  search?: string;
}

export interface CreateEmployeeData {
  documentType?: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  cityCode?: string;
  department?: string;
  departmentCode?: string;
  contractType: ContractType;
  salaryType?: SalaryType;
  baseSalary: number;
  arlRiskLevel?: ARLRiskLevel;
  epsName?: string;
  epsCode?: string;
  afpName?: string;
  afpCode?: string;
  cajaName?: string;
  cajaCode?: string;
  bankName?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
  costCenter?: string;
  startDate: string;
  endDate?: string;
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {}

// ===== Payroll Period =====

export interface PayrollPeriod {
  id: string;
  tenantId: string;
  name: string;
  periodType: PayrollPeriodType;
  startDate: string;
  endDate: string;
  paymentDate: string;
  status: PayrollPeriodStatus;
  totalDevengados: number;
  totalDeducciones: number;
  totalNeto: number;
  employeeCount: number;
  approvedAt: string | null;
  approvedById: string | null;
  notes: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollPeriodDetail extends PayrollPeriod {
  entries: PayrollEntrySummary[];
}

export interface PayrollEntrySummary {
  id: string;
  entryNumber: string;
  status: PayrollEntryStatus;
  employeeId: string;
  employeeName: string | null;
  employeeDocument: string | null;
  baseSalary: number;
  daysWorked: number;
  totalDevengados: number;
  totalDeducciones: number;
  totalNeto: number;
}

export interface PayrollPeriodsResponse {
  data: PayrollPeriod[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePayrollPeriodData {
  name: string;
  periodType: PayrollPeriodType;
  startDate: string;
  endDate: string;
  paymentDate: string;
  notes?: string;
}

// ===== Payroll Entry =====

export interface OvertimeDetail {
  type: OvertimeType;
  hours: number;
}

export interface PayrollEntryDetail {
  id: string;
  entryNumber: string;
  status: PayrollEntryStatus;
  periodId: string;
  periodName: string | null;
  employeeId: string;
  employee: {
    name: string;
    documentNumber: string;
    documentType: string;
    contractType: ContractType;
    salaryType: SalaryType;
    arlRiskLevel: ARLRiskLevel;
    epsName: string | null;
    afpName: string | null;
    cajaName: string | null;
  } | null;
  baseSalary: number;
  daysWorked: number;
  // Devengados
  sueldo: number;
  auxilioTransporte: number;
  horasExtras: number;
  bonificaciones: number;
  comisiones: number;
  viaticos: number;
  incapacidad: number;
  licencia: number;
  vacaciones: number;
  otrosDevengados: number;
  totalDevengados: number;
  // Deducciones
  saludEmpleado: number;
  pensionEmpleado: number;
  fondoSolidaridad: number;
  retencionFuente: number;
  sindicato: number;
  libranzas: number;
  otrasDeducciones: number;
  totalDeducciones: number;
  // Aportes empleador
  saludEmpleador: number;
  pensionEmpleador: number;
  arlEmpleador: number;
  cajaEmpleador: number;
  senaEmpleador: number;
  icbfEmpleador: number;
  // Provisiones
  provisionPrima: number;
  provisionCesantias: number;
  provisionIntereses: number;
  provisionVacaciones: number;
  // Neto
  totalNeto: number;
  overtimeDetails: OvertimeDetail[] | null;
  // DIAN
  cune: string | null;
  dianStatus: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePayrollEntryData {
  daysWorked?: number;
  overtimeDetails?: OvertimeDetail[];
  bonificaciones?: number;
  comisiones?: number;
  viaticos?: number;
  incapacidadDias?: number;
  licenciaDias?: number;
  vacacionesDias?: number;
  sindicato?: number;
  libranzas?: number;
  otrasDeducciones?: number;
  otrosDevengados?: number;
}

// ===== Payroll Config =====

export interface PayrollConfig {
  id: string;
  tenantId: string;
  smmlv: number;
  auxilioTransporteVal: number;
  uvtValue: number;
  defaultPeriodType: PayrollPeriodType;
  payrollPrefix: string | null;
  payrollCurrentNumber: number | null;
  adjustmentPrefix: string | null;
  adjustmentCurrentNumber: number | null;
  payrollSoftwareId: string | null;
  payrollSoftwarePin: string | null;
  payrollTestSetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollConfigData {
  smmlv: number;
  auxilioTransporteVal: number;
  uvtValue: number;
  defaultPeriodType?: PayrollPeriodType;
  payrollPrefix?: string;
  payrollCurrentNumber?: number;
  adjustmentPrefix?: string;
  adjustmentCurrentNumber?: number;
  payrollSoftwareId?: string;
  payrollSoftwarePin?: string;
  payrollTestSetId?: string;
}
