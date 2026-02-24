import { api } from "~/lib/api";
import type {
  Employee,
  EmployeesResponse,
  EmployeeFilters,
  CreateEmployeeData,
  UpdateEmployeeData,
  EmployeeStatus,
  PayrollPeriod,
  PayrollPeriodDetail,
  PayrollPeriodsResponse,
  CreatePayrollPeriodData,
  PayrollEntryDetail,
  UpdatePayrollEntryData,
  PayrollConfig,
  CreatePayrollConfigData,
} from "~/types/payroll";

export const payrollService = {
  // ===== Employees =====

  async getEmployees(filters: EmployeeFilters = {}): Promise<EmployeesResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<EmployeesResponse>(
      `/payroll/employees?${params.toString()}`,
    );
    return data;
  },

  async getEmployee(id: string): Promise<Employee> {
    const { data } = await api.get<Employee>(`/payroll/employees/${id}`);
    return data;
  },

  async createEmployee(employeeData: CreateEmployeeData): Promise<Employee> {
    const { data } = await api.post<Employee>(
      "/payroll/employees",
      employeeData,
    );
    return data;
  },

  async updateEmployee(
    id: string,
    employeeData: UpdateEmployeeData,
  ): Promise<Employee> {
    const { data } = await api.put<Employee>(
      `/payroll/employees/${id}`,
      employeeData,
    );
    return data;
  },

  async changeEmployeeStatus(
    id: string,
    status: EmployeeStatus,
  ): Promise<Employee> {
    const { data } = await api.patch<Employee>(
      `/payroll/employees/${id}/status`,
      { status },
    );
    return data;
  },

  // ===== Payroll Config =====

  async getConfig(): Promise<PayrollConfig> {
    const { data } = await api.get<PayrollConfig>("/payroll/config");
    return data;
  },

  async saveConfig(configData: CreatePayrollConfigData): Promise<PayrollConfig> {
    const { data } = await api.post<PayrollConfig>(
      "/payroll/config",
      configData,
    );
    return data;
  },

  // ===== Payroll Periods =====

  async getPeriods(
    filters: { page?: number; limit?: number } = {},
  ): Promise<PayrollPeriodsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<PayrollPeriodsResponse>(
      `/payroll/periods?${params.toString()}`,
    );
    return data;
  },

  async getPeriod(id: string): Promise<PayrollPeriodDetail> {
    const { data } = await api.get<PayrollPeriodDetail>(
      `/payroll/periods/${id}`,
    );
    return data;
  },

  async createPeriod(
    periodData: CreatePayrollPeriodData,
  ): Promise<PayrollPeriod> {
    const { data } = await api.post<PayrollPeriod>(
      "/payroll/periods",
      periodData,
    );
    return data;
  },

  async calculatePeriod(id: string): Promise<PayrollPeriodDetail> {
    const { data } = await api.post<PayrollPeriodDetail>(
      `/payroll/periods/${id}/calculate`,
    );
    return data;
  },

  async approvePeriod(id: string): Promise<PayrollPeriod> {
    const { data } = await api.post<PayrollPeriod>(
      `/payroll/periods/${id}/approve`,
    );
    return data;
  },

  async closePeriod(id: string): Promise<PayrollPeriod> {
    const { data } = await api.post<PayrollPeriod>(
      `/payroll/periods/${id}/close`,
    );
    return data;
  },

  // ===== Payroll Entries =====

  async getEntry(id: string): Promise<PayrollEntryDetail> {
    const { data } = await api.get<PayrollEntryDetail>(
      `/payroll/entries/${id}`,
    );
    return data;
  },

  async updateEntry(
    id: string,
    entryData: UpdatePayrollEntryData,
  ): Promise<PayrollEntryDetail> {
    const { data } = await api.put<PayrollEntryDetail>(
      `/payroll/entries/${id}`,
      entryData,
    );
    return data;
  },
};
