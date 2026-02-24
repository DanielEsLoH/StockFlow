import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { payrollService } from "~/services/payroll.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  Employee,
  EmployeesResponse,
  EmployeeFilters,
  CreateEmployeeData,
  UpdateEmployeeData,
  EmployeeStatus,
  PayrollPeriodDetail,
  PayrollPeriodsResponse,
  CreatePayrollPeriodData,
  PayrollEntryDetail,
  UpdatePayrollEntryData,
  PayrollConfig,
  CreatePayrollConfigData,
} from "~/types/payroll";

// ============================================================================
// EMPLOYEE QUERIES
// ============================================================================

export function useEmployees(filters: EmployeeFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<EmployeesResponse>({
    queryKey: queryKeys.payrollEmployees.list(
      filters as Record<string, unknown>,
    ),
    queryFn: () => payrollService.getEmployees(filters),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useEmployee(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Employee>({
    queryKey: queryKeys.payrollEmployees.detail(id),
    queryFn: () => payrollService.getEmployee(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

// ============================================================================
// EMPLOYEE MUTATIONS
// ============================================================================

export function useCreateEmployee() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeData) =>
      payrollService.createEmployee(data),
    onSuccess: (employee) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollEmployees.all,
      });
      toast.success(
        `Empleado "${employee.firstName} ${employee.lastName}" creado exitosamente`,
      );
      navigate(`/payroll/employees/${employee.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el empleado");
    },
  });
}

export function useUpdateEmployee() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeData }) =>
      payrollService.updateEmployee(id, data),
    onSuccess: (employee) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollEmployees.all,
      });
      queryClient.setQueryData(
        queryKeys.payrollEmployees.detail(employee.id),
        employee,
      );
      toast.success(
        `Empleado "${employee.firstName} ${employee.lastName}" actualizado`,
      );
      navigate(`/payroll/employees/${employee.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar el empleado");
    },
  });
}

export function useChangeEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EmployeeStatus }) =>
      payrollService.changeEmployeeStatus(id, status),
    onSuccess: (employee) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollEmployees.all,
      });
      queryClient.setQueryData(
        queryKeys.payrollEmployees.detail(employee.id),
        employee,
      );

      const statusMessages: Record<EmployeeStatus, string> = {
        ACTIVE: "activado",
        INACTIVE: "desactivado",
        ON_LEAVE: "puesto en licencia",
        TERMINATED: "retirado",
      };
      toast.success(
        `Empleado "${employee.firstName} ${employee.lastName}" ${statusMessages[employee.status]}`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cambiar el estado del empleado");
    },
  });
}

// ============================================================================
// PAYROLL CONFIG QUERIES & MUTATIONS
// ============================================================================

export function usePayrollConfig() {
  const enabled = useIsQueryEnabled();
  return useQuery<PayrollConfig>({
    queryKey: queryKeys.payrollConfig.detail(),
    queryFn: () => payrollService.getConfig(),
    staleTime: 1000 * 60 * 10,
    enabled,
  });
}

export function useSavePayrollConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePayrollConfigData) =>
      payrollService.saveConfig(data),
    onSuccess: (config) => {
      queryClient.setQueryData(queryKeys.payrollConfig.detail(), config);
      toast.success("Configuración de nómina guardada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al guardar la configuración");
    },
  });
}

// ============================================================================
// PAYROLL PERIOD QUERIES
// ============================================================================

export function usePayrollPeriods(
  filters: { page?: number; limit?: number } = {},
) {
  const enabled = useIsQueryEnabled();
  return useQuery<PayrollPeriodsResponse>({
    queryKey: queryKeys.payrollPeriods.list(
      filters as Record<string, unknown>,
    ),
    queryFn: () => payrollService.getPeriods(filters),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function usePayrollPeriod(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<PayrollPeriodDetail>({
    queryKey: queryKeys.payrollPeriods.detail(id),
    queryFn: () => payrollService.getPeriod(id),
    staleTime: 1000 * 60 * 2,
    enabled: enabled && !!id,
  });
}

// ============================================================================
// PAYROLL PERIOD MUTATIONS
// ============================================================================

export function useCreatePayrollPeriod() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePayrollPeriodData) =>
      payrollService.createPeriod(data),
    onSuccess: (period) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollPeriods.all,
      });
      toast.success(`Periodo "${period.name}" creado exitosamente`);
      navigate(`/payroll/periods/${period.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el periodo");
    },
  });
}

export function useCalculatePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.calculatePeriod(id),
    onSuccess: (period) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollPeriods.all,
      });
      queryClient.setQueryData(
        queryKeys.payrollPeriods.detail(period.id),
        period,
      );
      toast.success(`Periodo "${period.name}" calculado exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al calcular el periodo");
    },
  });
}

export function useApprovePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.approvePeriod(id),
    onSuccess: (period) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollPeriods.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollPeriods.detail(period.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.all,
      });
      toast.success(`Periodo "${period.name}" aprobado exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al aprobar el periodo");
    },
  });
}

export function useClosePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.closePeriod(id),
    onSuccess: (period) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollPeriods.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollPeriods.detail(period.id),
      });
      toast.success(`Periodo "${period.name}" cerrado`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cerrar el periodo");
    },
  });
}

// ============================================================================
// PAYROLL ENTRY QUERIES & MUTATIONS
// ============================================================================

export function usePayrollEntry(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<PayrollEntryDetail>({
    queryKey: queryKeys.payrollEntries.detail(id),
    queryFn: () => payrollService.getEntry(id),
    staleTime: 1000 * 60 * 2,
    enabled: enabled && !!id,
  });
}

export function useUpdatePayrollEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePayrollEntryData;
    }) => payrollService.updateEntry(id, data),
    onSuccess: (entry) => {
      queryClient.setQueryData(
        queryKeys.payrollEntries.detail(entry.id),
        entry,
      );
      // Invalidate the parent period since totals may have changed
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollPeriods.detail(entry.periodId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payrollPeriods.all,
      });
      toast.success("Entrada de nómina actualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la entrada");
    },
  });
}
