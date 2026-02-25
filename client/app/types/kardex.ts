export interface KardexReport {
  product: { id: string; sku: string; name: string; currentStock: number; costPrice: number };
  warehouse?: { id: string; name: string } | null;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  movements: KardexMovement[];
  closingBalance: number;
}

export interface KardexMovement {
  id: string;
  date: string;
  type: string;
  description: string;
  entries: number;
  exits: number;
  balance: number;
  reference?: string;
  warehouseName?: string;
}
