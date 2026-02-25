export interface CostCenter {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { journalEntryLines: number };
}

export interface CreateCostCenterData {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateCostCenterData extends Partial<CreateCostCenterData> {
  isActive?: boolean;
}

export interface CostCenterOption {
  id: string;
  code: string;
  name: string;
}
