export enum ImportModule {
  PRODUCTS = "products",
  CUSTOMERS = "customers",
  SUPPLIERS = "suppliers",
}

export enum DuplicateStrategy {
  SKIP = "skip",
  UPDATE = "update",
}

export interface ImportValidationRow {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
  isDuplicate: boolean;
  duplicateAction?: "skip" | "update";
}

export interface ImportValidationResult {
  module: ImportModule;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  rows: ImportValidationRow[];
}

export interface ImportResult {
  module: ImportModule;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ row: number; error: string }>;
}
